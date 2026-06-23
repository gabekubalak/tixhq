//! Jetson-side safety mirror.
//!
//! The authoritative safety supervisor is the safety MCU. This service is a
//! parallel watcher that:
//!   - Subscribes to manifold + composter telemetry on the bus.
//!   - Independently checks the same bounds the MCU checks.
//!   - Vetoes slurry dose commands without a fresh pathogen-kill flag.
//!   - Publishes kratt.event.safety.trip so the UI / alerting / planner all
//!     see the trip immediately.
//!   - Pings systemd's hardware watchdog so the Jetson reboots if this
//!     service deadlocks.
//!
//! If the bus-side checks and the MCU disagree, the MCU's contactor wins,
//! this watcher cannot energize anything, only de-energize. All trip logic
//! lives in lib.rs and is unit-tested independently.

use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::Result;
use async_nats::Client;
use futures_util::StreamExt;
use safety_watcher::*;
use serde::Deserialize;
use tokio::sync::Mutex;
use tracing::{error, warn};

#[derive(Deserialize)]
struct Sample { kind: String, value: f64 }

#[derive(Deserialize)]
struct ComposterStateMsg {
    pathogen_kill_ok: bool,
}

#[derive(Deserialize)]
struct DoseCmd {
    pump_id: String,
}

fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap()
}

async fn publish_trip(client: &Client, cause: TripCause) -> Result<()> {
    let body = serde_json::json!({
        "ts": now_iso(),
        "cause": cause.as_str(),
        "actuator_rail": "OFF",
        "latched": true,
        "requires_ack": true,
    });
    client
        .publish("kratt.event.safety.trip", serde_json::to_vec(&body)?.into())
        .await?;
    error!(cause = cause.as_str(), "safety trip");
    Ok(())
}

/// Try to fire a trip if the cause is fresh (not already latched).
/// Returns true if we actually published.
async fn maybe_trip(client: &Client, watch: &Arc<Mutex<Watch>>, cause: TripCause) -> bool {
    let should_fire = {
        let mut w = watch.lock().await;
        if w.latched {
            false
        } else {
            w.latched = true;
            true
        }
    };
    if should_fire {
        let _ = publish_trip(client, cause).await;
    }
    should_fire
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "127.0.0.1:4222".into());
    let client = async_nats::connect(nats_url.as_str()).await?;
    let watch: Arc<Mutex<Watch>> = Arc::new(Mutex::new(Watch::new(Instant::now())));

    // Manifold task: trips on EC/pH bounds.
    let watch_m = watch.clone();
    let client_m = client.clone();
    let mut sub_manifold = client.subscribe("kratt.manifold.sensor.*").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub_manifold.next().await {
            let Ok(m) = serde_json::from_slice::<Sample>(&msg.payload) else { continue };
            {
                let mut w = watch_m.lock().await;
                w.last_manifold = Instant::now();
            }
            if let Some(cause) = manifold_trip(&m.kind, m.value) {
                maybe_trip(&client_m, &watch_m, cause).await;
            }
        }
    });

    // Composter sensor task: trips on over-temperature, tracks heartbeat.
    let watch_c = watch.clone();
    let client_c = client.clone();
    let mut sub_compost = client.subscribe("kratt.composter.sensor.*").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub_compost.next().await {
            let Ok(m) = serde_json::from_slice::<Sample>(&msg.payload) else { continue };
            {
                let mut w = watch_c.lock().await;
                w.last_compost_sensor = Instant::now();
            }
            if let Some(cause) = composter_trip(&m.kind, m.value) {
                maybe_trip(&client_c, &watch_c, cause).await;
            }
        }
    });

    // Composter STATE task: tracks pathogen_kill_ok for the dose veto.
    // Separate stream from the sensor probes so the kill-gate signal
    // doesn't get drowned out by temp samples.
    let watch_s = watch.clone();
    let mut sub_state = client.subscribe("kratt.composter.state").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub_state.next().await {
            let Ok(m) = serde_json::from_slice::<ComposterStateMsg>(&msg.payload) else { continue };
            let mut w = watch_s.lock().await;
            w.last_compost_state = Some(Instant::now());
            w.pathogen_kill_ok = m.pathogen_kill_ok;
        }
    });

    // Dose-veto task: refuses slurry without a fresh pathogen-kill flag.
    // A bad dose is a serious failure (something issued a slurry command
    // that the gate should have blocked), so the response is a full trip.
    let watch_d = watch.clone();
    let client_d = client.clone();
    let mut sub_dose = client.subscribe("kratt.command.dose").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub_dose.next().await {
            let Ok(d) = serde_json::from_slice::<DoseCmd>(&msg.payload) else { continue };
            let authorized = {
                let w = watch_d.lock().await;
                w.slurry_authorized(Instant::now())
            };
            if let Some(cause) = dose_trip(&d.pump_id, authorized) {
                warn!(pump = %d.pump_id, "slurry dose attempted without kill gate, tripping");
                maybe_trip(&client_d, &watch_d, cause).await;
            }
        }
    });

    // Heartbeat task: pings the systemd watchdog and trips on stalled subs.
    let watch_h = watch.clone();
    let mut tick = tokio::time::interval(Duration::from_millis(500));
    loop {
        tick.tick().await;
        let _ = sd_notify::notify(false, &[sd_notify::NotifyState::Watchdog]);
        let now = Instant::now();
        let cause = {
            let w = watch_h.lock().await;
            if w.latched { None } else { heartbeat_trip(&w, now) }
        };
        if let Some(c) = cause {
            warn!(cause = c.as_str(), "heartbeat lost, tripping safety");
            maybe_trip(&client, &watch_h, c).await;
        }
    }
}
