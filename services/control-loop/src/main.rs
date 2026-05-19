//! Per-zone control loop runner.
//!
//! For each shelf, maintains a PI controller whose input is the latest
//! moisture reading and whose output is "milliseconds to open the supply
//! valve for this shelf." Setpoints arrive from the recipe engine.
//!
//! The controller fires on a fixed cadence (TICK), NOT on every incoming
//! moisture sample, so we never issue overlapping valve commands.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use control_loop::{PiConfig, PiController};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::{info, warn};

const TICK: Duration = Duration::from_secs(30);
const VALVE_MIN_MS: u32 = 250;
const VALVE_MAX_MS: u32 = 30_000;
const SENSOR_STALE_AFTER: Duration = Duration::from_secs(60);

#[derive(Deserialize, Debug, Clone)]
struct Setpoint {
    shelf_id: i64,
    moisture_pct: f64,
}

#[derive(Deserialize, Debug)]
struct MoistureMsg {
    shelf_id: i64,
    value_pct: f64,
    #[serde(default)]
    quality: Option<String>,
}

#[derive(Serialize)]
struct ValveCmd {
    ts: String,
    valve_id: String,
    state: &'static str,
    duration_ms: u32,
}

fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap()
}

fn moisture_cfg() -> PiConfig {
    PiConfig {
        kp: 500.0,
        ki: 2.0,
        deadband: 2.0,
        output_min: 0.0,
        output_max: VALVE_MAX_MS as f64,
        integral_min: -30.0,
        integral_max: 30.0,
        max_rate_per_s: 10_000.0,
    }
}

struct Zone {
    setpoint_moisture: Option<f64>,
    latest_moisture: Option<f64>,
    latest_at: Option<tokio::time::Instant>,
    controller: PiController,
}

impl Zone {
    fn new() -> Self {
        Self {
            setpoint_moisture: None,
            latest_moisture: None,
            latest_at: None,
            controller: PiController::new(moisture_cfg()),
        }
    }
}

type ZoneMap = Arc<Mutex<HashMap<i64, Zone>>>;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let client = async_nats::connect("127.0.0.1:4222").await?;
    let zones: ZoneMap = Arc::new(Mutex::new(HashMap::new()));

    // Setpoint subscriber.
    let zones_sp = zones.clone();
    let mut sp_sub = client.subscribe("grove.planner.setpoint.*").await?;
    tokio::spawn(async move {
        while let Some(msg) = sp_sub.next().await {
            let Ok(sp) = serde_json::from_slice::<Setpoint>(&msg.payload) else { continue };
            let mut g = zones_sp.lock().await;
            g.entry(sp.shelf_id).or_insert_with(Zone::new).setpoint_moisture =
                Some(sp.moisture_pct);
        }
    });

    // Moisture subscriber.
    let zones_m = zones.clone();
    let mut moist_sub = client.subscribe("grove.zone.*.sensor.moisture").await?;
    tokio::spawn(async move {
        while let Some(msg) = moist_sub.next().await {
            let Ok(m) = serde_json::from_slice::<MoistureMsg>(&msg.payload) else { continue };
            if matches!(m.quality.as_deref(), Some("stale") | Some("fault")) {
                continue;
            }
            let mut g = zones_m.lock().await;
            let z = g.entry(m.shelf_id).or_insert_with(Zone::new);
            z.latest_moisture = Some(m.value_pct);
            z.latest_at = Some(tokio::time::Instant::now());
        }
    });

    // Control tick.
    let mut tick = tokio::time::interval(TICK);
    loop {
        tick.tick().await;
        let mut commands: Vec<ValveCmd> = Vec::new();
        {
            let mut g = zones.lock().await;
            for (&shelf_id, z) in g.iter_mut() {
                let Some(sp) = z.setpoint_moisture else { continue };
                let Some(meas) = z.latest_moisture else { continue };
                let fresh = matches!(z.latest_at, Some(t) if t.elapsed() < SENSOR_STALE_AFTER);
                if !fresh {
                    warn!(shelf_id, "moisture stale, holding output");
                    continue;
                }
                let Some(out) = z.controller.step(sp, meas, true) else { continue };
                let ms = out.round() as i64;
                if ms < VALVE_MIN_MS as i64 {
                    continue;
                }
                let ms = (ms as u32).min(VALVE_MAX_MS);
                commands.push(ValveCmd {
                    ts: now_iso(),
                    valve_id: format!("shelf_{}", shelf_id),
                    state: "open",
                    duration_ms: ms,
                });
            }
        }
        for cmd in commands {
            let bytes = serde_json::to_vec(&cmd)?;
            client
                .publish("grove.command.valve", bytes.into())
                .await?;
            info!(valve = cmd.valve_id, ms = cmd.duration_ms, "moisture top-up");
        }
    }
}
