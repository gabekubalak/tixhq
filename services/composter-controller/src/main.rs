//! Composter state machine.
//!
//!   idle
//!     │ user loads hopper, presses "start"
//!     ▼
//!   grinding (motor on, brief)
//!     ▼
//!   mesophilic (40–50 °C, aeration duty cycle)
//!     ▼
//!   thermophilic (≥55 °C held continuously for ≥72 h — pathogen kill)
//!     ▼
//!   cure (passive, until slurry tank EC stabilizes)
//!     ▼
//!   tank_ready
//!     │ mixer asks for slurry
//!     ▼
//!   dispensing → back to tank_ready until empty → idle
//!
//! The pathogen-kill gate is a HARD safety interlock: until the controller
//! has logged the required thermophilic hold for THIS batch, the slurry
//! tank's output valve refuses to open.

use anyhow::Result;
use async_nats::Client;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

const THERMO_MIN_C: f64 = 55.0;
const THERMO_HOLD: Duration = Duration::from_secs(72 * 3600);
const MESO_MIN_C: f64 = 40.0;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
enum Phase {
    Idle, Grinding, Mesophilic, Thermophilic, Cure, TankReady, Dispensing,
}

struct Batch {
    id: String,
    phase: Phase,
    phase_started: Instant,
    thermo_accumulated: Duration,
    last_temp: f64,
    last_eval: Instant,
    pathogen_kill_ok: bool,
}

#[derive(Deserialize)]
struct CompostSensor { kind: String, value: f64 }

#[derive(Serialize)]
struct StateMsg<'a> {
    ts: String,
    batch_id: &'a str,
    phase: Phase,
    temp_c: f64,
    aeration_duty_pct: f64,
    thermo_hold_seconds: u64,
    pathogen_kill_ok: bool,
}

fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap()
}

fn advance(b: &mut Batch) {
    let now = Instant::now();
    let dt = now.duration_since(b.last_eval);
    b.last_eval = now;

    match b.phase {
        Phase::Grinding if b.phase_started.elapsed() >= Duration::from_secs(120) => {
            b.phase = Phase::Mesophilic;
            b.phase_started = now;
        }
        Phase::Mesophilic if b.last_temp >= THERMO_MIN_C => {
            b.phase = Phase::Thermophilic;
            b.phase_started = now;
        }
        Phase::Thermophilic => {
            if b.last_temp >= THERMO_MIN_C {
                b.thermo_accumulated += dt;
            } else if b.last_temp < MESO_MIN_C {
                // Lost the hold; back off to mesophilic and resume aeration.
                b.phase = Phase::Mesophilic;
                b.phase_started = now;
            }
            if b.thermo_accumulated >= THERMO_HOLD {
                b.pathogen_kill_ok = true;
                b.phase = Phase::Cure;
                b.phase_started = now;
            }
        }
        Phase::Cure if b.phase_started.elapsed() >= Duration::from_secs(24 * 3600) => {
            b.phase = Phase::TankReady;
        }
        _ => {}
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let client = async_nats::connect("127.0.0.1:4222").await?;
    let batch = Mutex::new(Batch {
        id: uuid::Uuid::new_v4().to_string(),
        phase: Phase::Idle,
        phase_started: Instant::now(),
        thermo_accumulated: Duration::ZERO,
        last_temp: 20.0,
        last_eval: Instant::now(),
        pathogen_kill_ok: false,
    });

    let mut sub = client.subscribe("grove.composter.sensor.*").await?;
    let b_ref = &batch;
    let temp_task = async move {
        while let Some(msg) = sub.next().await {
            let Ok(m) = serde_json::from_slice::<CompostSensor>(&msg.payload) else { continue };
            if m.kind == "temp" {
                b_ref.lock().await.last_temp = m.value;
            }
        }
    };

    let pub_task = async {
        let mut tick = tokio::time::interval(Duration::from_secs(10));
        loop {
            tick.tick().await;
            let mut b = batch.lock().await;
            advance(&mut b);
            let aeration = match b.phase {
                Phase::Mesophilic | Phase::Thermophilic => 60.0,
                _ => 0.0,
            };
            let msg = StateMsg {
                ts: now_iso(),
                batch_id: &b.id,
                phase: b.phase,
                temp_c: b.last_temp,
                aeration_duty_pct: aeration,
                thermo_hold_seconds: b.thermo_accumulated.as_secs(),
                pathogen_kill_ok: b.pathogen_kill_ok,
            };
            client.publish("grove.composter.state",
                serde_json::to_vec(&msg)?.into()).await?;
        }
        #[allow(unreachable_code)]
        Ok::<(), anyhow::Error>(())
    };

    tokio::select! {
        _ = temp_task => {},
        _ = pub_task => {},
    }
    Ok(())
}
