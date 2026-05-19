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

use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::Result;
use async_nats::Client;
use futures_util::StreamExt;
use serde::Deserialize;
use tokio::sync::Mutex;
use tracing::{error, warn};

const EC_RUNAWAY: f64 = 4.0;
const PH_LOW: f64 = 4.5;
const PH_HIGH: f64 = 8.0;
const COMPOSTER_OVER_TEMP_C: f64 = 65.0;
const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Deserialize)]
struct Sample {
    kind: String,
    value: f64,
}

struct Watch {
    last_manifold: Instant,
    last_compost: Instant,
    latched: bool,
}

impl Watch {
    fn new() -> Self {
        let now = Instant::now();
        Self { last_manifold: now, last_compost: now, latched: false }
    }
}

fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap()
}

async fn publish_trip(client: &Client, cause: &str) -> Result<()> {
    let body = serde_json::json!({
        "ts": now_iso(),
        "cause": cause,
        "actuator_rail": "OFF",
        "latched": true,
        "requires_ack": true,
    });
    client
        .publish("grove.event.safety.trip", serde_json::to_vec(&body)?.into())
        .await?;
    error!(cause, "safety trip");
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let client = async_nats::connect("127.0.0.1:4222").await?;
    let watch: Arc<Mutex<Watch>> = Arc::new(Mutex::new(Watch::new()));

    // Manifold task: trips on EC/pH bounds.
    let watch_m = watch.clone();
    let client_m = client.clone();
    let mut sub_manifold = client.subscribe("grove.manifold.sensor.*").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub_manifold.next().await {
            let Ok(m) = serde_json::from_slice::<Sample>(&msg.payload) else { continue };
            let cause = {
                let mut w = watch_m.lock().await;
                w.last_manifold = Instant::now();
                if w.latched {
                    None
                } else {
                    let c = match m.kind.as_str() {
                        "ec" if m.value > EC_RUNAWAY => Some("ec_runaway"),
                        "ph" if m.value < PH_LOW => Some("ph_low"),
                        "ph" if m.value > PH_HIGH => Some("ph_high"),
                        _ => None,
                    };
                    if c.is_some() {
                        w.latched = true;
                    }
                    c
                }
            };
            if let Some(c) = cause {
                let _ = publish_trip(&client_m, c).await;
            }
        }
    });

    // Composter task: trips on over-temperature.
    let watch_c = watch.clone();
    let client_c = client.clone();
    let mut sub_compost = client.subscribe("grove.composter.sensor.*").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub_compost.next().await {
            let Ok(m) = serde_json::from_slice::<Sample>(&msg.payload) else { continue };
            let cause = {
                let mut w = watch_c.lock().await;
                w.last_compost = Instant::now();
                if w.latched {
                    None
                } else if m.kind == "temp" && m.value > COMPOSTER_OVER_TEMP_C {
                    w.latched = true;
                    Some("over_temp")
                } else {
                    None
                }
            };
            if let Some(c) = cause {
                let _ = publish_trip(&client_c, c).await;
            }
        }
    });

    // Heartbeat task: pings the systemd watchdog and warns on stalled subs.
    let mut tick = tokio::time::interval(Duration::from_millis(500));
    loop {
        tick.tick().await;
        let _ = sd_notify::notify(false, &[sd_notify::NotifyState::Watchdog]);
        let w = watch.lock().await;
        if w.latched {
            continue;
        }
        if w.last_manifold.elapsed() > HEARTBEAT_TIMEOUT {
            warn!("manifold heartbeat lost");
        }
        if w.last_compost.elapsed() > HEARTBEAT_TIMEOUT {
            warn!("composter heartbeat lost");
        }
    }
}
