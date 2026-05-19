mod mixer;

use anyhow::Result;
use futures_util::StreamExt;
use mixer::{decide, MixContext, NutrientChoice};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;

#[derive(Default, Debug, Clone)]
struct State {
    target_ec: f64,
    chamber_ec: f64,
    slurry_ec: f64,
    flow_ok: bool,
    phase: String,
}

#[derive(Deserialize)]
struct ManifoldMsg { kind: String, value: f64 }

#[derive(Deserialize)]
struct CompostMsg { kind: String, value: f64 }

#[derive(Deserialize)]
struct SetpointMsg { ec_ms_cm: f64, phase: Option<String> }

#[derive(Serialize)]
struct DoseCmd {
    ts: String,
    issuer: &'static str,
    pump_id: &'static str,
    volume_ml: f64,
    max_rate_ml_s: f64,
    reason: &'static str,
    correlation_id: String,
}

fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap()
}

fn pump_name(c: NutrientChoice) -> &'static str {
    match c {
        NutrientChoice::Slurry => "slurry",
        NutrientChoice::BaseN  => "n",
        NutrientChoice::BasePK => "k",
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let client = async_nats::connect("127.0.0.1:4222").await?;
    let state = Arc::new(Mutex::new(State::default()));

    let mut manifold = client.subscribe("grove.manifold.sensor.*").await?;
    let s1 = state.clone();
    tokio::spawn(async move {
        while let Some(msg) = manifold.next().await {
            let Ok(m) = serde_json::from_slice::<ManifoldMsg>(&msg.payload) else { continue };
            let mut g = s1.lock().await;
            match m.kind.as_str() {
                "ec"   => g.chamber_ec = m.value,
                "flow" => g.flow_ok    = m.value > 0.0,
                _ => {}
            }
        }
    });

    let mut compost = client.subscribe("grove.composter.sensor.*").await?;
    let s2 = state.clone();
    tokio::spawn(async move {
        while let Some(msg) = compost.next().await {
            let Ok(m) = serde_json::from_slice::<CompostMsg>(&msg.payload) else { continue };
            if m.kind == "ec" { s2.lock().await.slurry_ec = m.value; }
        }
    });

    let mut setpoints = client.subscribe("grove.planner.setpoint.*").await?;
    let s3 = state.clone();
    tokio::spawn(async move {
        while let Some(msg) = setpoints.next().await {
            let Ok(m) = serde_json::from_slice::<SetpointMsg>(&msg.payload) else { continue };
            let mut g = s3.lock().await;
            g.target_ec = m.ec_ms_cm;
            if let Some(p) = m.phase { g.phase = p; }
        }
    });

    let mut tick = tokio::time::interval(std::time::Duration::from_secs(30));
    loop {
        tick.tick().await;
        let snap = { state.lock().await.clone() };
        let leafy = matches!(snap.phase.as_str(), "germination" | "seedling" | "vegetative");
        let Some(d) = decide(MixContext {
            target_ec: snap.target_ec,
            chamber_ec: snap.chamber_ec,
            slurry_ec: snap.slurry_ec,
            flow_ok: snap.flow_ok,
            phase_is_leafy: leafy,
        }) else { continue };

        let cmd = DoseCmd {
            ts: now_iso(),
            issuer: "mixer",
            pump_id: pump_name(d.choice),
            volume_ml: d.volume_ml,
            max_rate_ml_s: 2.0,
            reason: "ec_below_setpoint",
            correlation_id: uuid::Uuid::new_v4().to_string(),
        };
        client.publish("grove.command.dose",
            serde_json::to_vec(&cmd)?.into()).await?;
        info!(pump = cmd.pump_id, ml = cmd.volume_ml, "dose issued");
    }
}
