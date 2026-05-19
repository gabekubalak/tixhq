//! Jetson-side safety mirror.
//!
//! The authoritative safety supervisor is the safety MCU. This service is a
//! parallel watcher that:
//!   - Subscribes to manifold + composter telemetry on the bus.
//!   - Independently checks the same bounds the MCU checks.
//!   - Publishes grove.event.safety.trip so the UI / alerting / planner all
//!     see the trip immediately.
//!   - Pings systemd's hardware watchdog so the Jetson reboots if this
//!     service deadlocks.
//!
//! If the bus-side checks and the MCU disagree, the MCU's contactor wins —
//! this watcher cannot energize anything, only de-energize.

use anyhow::Result;
use async_nats::Client;
use futures_util::StreamExt;
use serde::Deserialize;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tracing::{error, warn};

const EC_RUNAWAY: f64 = 4.0;        // mS/cm
const PH_LOW: f64 = 4.5;
const PH_HIGH: f64 = 8.0;
const COMPOSTER_OVER_TEMP_C: f64 = 65.0;
const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Deserialize)]
struct ManifoldMsg { kind: String, value: f64 }

#[derive(Deserialize)]
struct CompostMsg { kind: String, value: f64 }

struct Watch {
    last_manifold: Instant,
    last_compost: Instant,
    latched: bool,
}

fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap()
}

async fn trip(client: &Client, cause: &str) -> Result<()> {
    let body = serde_json::json!({
        "ts": now_iso(),
        "cause": cause,
        "actuator_rail": "OFF",
        "latched": true,
        "requires_ack": true,
    });
    client.publish("grove.event.safety.trip",
        serde_json::to_vec(&body)?.into()).await?;
    error!(cause, "safety trip");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let client = async_nats::connect("127.0.0.1:4222").await?;
    let watch = Mutex::new(Watch {
        last_manifold: Instant::now(),
        last_compost: Instant::now(),
        latched: false,
    });

    let mut manifold = client.subscribe("grove.manifold.sensor.*").await?;
    let client_m = client.clone();
    let watch_m  = &watch;
    let manifold_task = async move {
        while let Some(msg) = manifold.next().await {
            let Ok(m) = serde_json::from_slice::<ManifoldMsg>(&msg.payload) else { continue };
            let mut w = watch_m.lock().await;
            w.last_manifold = Instant::now();
            if w.latched { continue; }
            let trip_cause = match m.kind.as_str() {
                "ec" if m.value > EC_RUNAWAY  => Some("ec_runaway"),
                "ph" if m.value < PH_LOW      => Some("ph_low"),
                "ph" if m.value > PH_HIGH     => Some("ph_high"),
                _ => None,
            };
            if let Some(cause) = trip_cause {
                w.latched = true;
                drop(w);
                let _ = trip(&client_m, cause).await;
            }
        }
    };

    let mut compost = client.subscribe("grove.composter.sensor.*").await?;
    let client_c = client.clone();
    let compost_task = async move {
        while let Some(msg) = compost.next().await {
            let Ok(m) = serde_json::from_slice::<CompostMsg>(&msg.payload) else { continue };
            let mut w = watch.lock().await;
            w.last_compost = Instant::now();
            if w.latched { continue; }
            if m.kind == "temp" && m.value > COMPOSTER_OVER_TEMP_C {
                w.latched = true;
                drop(w);
                let _ = trip(&client_c, "over_temp").await;
            }
        }
    };

    let heartbeat_task = async {
        let mut tick = tokio::time::interval(Duration::from_millis(500));
        loop {
            tick.tick().await;
            sd_notify::notify(false, &[sd_notify::NotifyState::Watchdog]).ok();
            let w = watch.lock().await;
            if w.latched { continue; }
            if w.last_manifold.elapsed() > HEARTBEAT_TIMEOUT {
                warn!("manifold heartbeat lost");
            }
            if w.last_compost.elapsed() > HEARTBEAT_TIMEOUT {
                warn!("composter heartbeat lost");
            }
        }
    };

    tokio::join!(manifold_task, compost_task, heartbeat_task);
    Ok(())
}
