mod mixer;

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::Result;
use futures_util::StreamExt;
use mixer::{decide, MixContext, NutrientChoice, MAX_DOSE_ML, SENSOR_STALE_AFTER};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::{info, warn};

/// In-process state. Each sensor reading carries the wall-clock instant it
/// arrived so we can refuse to act on stale data. The dose ledger holds a
/// 24h sliding window of issued volumes per pump so the safety cap in
/// mixer.rs has real numbers to clamp against.
#[derive(Default)]
struct State {
    target_ec: f64,
    target_ph: f64,
    phase: String,
    chamber_ec: Option<(f64, Instant)>,
    chamber_ph: Option<(f64, Instant)>,
    chamber_flow: Option<(f64, Instant)>,
    slurry_ec: Option<(f64, Instant)>,
    slurry_pathogen_kill_ok: bool,
    last_dose_at: Option<Instant>,
    /// Rolling per-pump volume ledger (last 24h).
    dose_ledger: Vec<(Instant, NutrientChoice, f64)>,
}

impl State {
    fn sensors_fresh(&self, now: Instant) -> bool {
        fresh(&self.chamber_ec, now)
            && fresh(&self.chamber_ph, now)
            && fresh(&self.chamber_flow, now)
            && fresh(&self.slurry_ec, now)
    }
    fn daily_volumes(&self, now: Instant) -> HashMap<NutrientChoice, f64> {
        let mut out: HashMap<NutrientChoice, f64> = HashMap::new();
        let cutoff = now.checked_sub(Duration::from_secs(24 * 3600)).unwrap_or(now);
        for (t, c, ml) in &self.dose_ledger {
            if *t >= cutoff {
                *out.entry(*c).or_default() += ml;
            }
        }
        out
    }
    fn prune_ledger(&mut self, now: Instant) {
        let cutoff = now.checked_sub(Duration::from_secs(24 * 3600)).unwrap_or(now);
        self.dose_ledger.retain(|(t, _, _)| *t >= cutoff);
    }
}

fn fresh<T>(s: &Option<(T, Instant)>, now: Instant) -> bool {
    matches!(s, Some((_, t)) if now.duration_since(*t) <= SENSOR_STALE_AFTER)
}

#[derive(Deserialize)]
struct ManifoldMsg { kind: String, value: f64 }

#[derive(Deserialize)]
struct SetpointMsg { ec_ms_cm: f64, ph: f64, phase: Option<String> }

#[derive(Deserialize)]
struct ComposterStateMsg {
    pathogen_kill_ok: bool,
    /// The composter publishes a coarse slurry-EC estimate based on phase,
    /// since the BOM doesn't include a slurry-tank probe yet. Optional so
    /// older payloads still parse.
    #[serde(default)]
    slurry_ec_est: Option<f64>,
}

#[derive(Serialize)]
struct DoseCmd<'a> {
    ts: String,
    issuer: &'static str,
    pump_id: &'a str,
    volume_ml: f64,
    max_rate_ml_s: f64,
    reason: &'a str,
    correlation_id: String,
}

fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap()
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "127.0.0.1:4222".into());
    let client = async_nats::connect(nats_url.as_str()).await?;
    let state: Arc<Mutex<State>> = Arc::new(Mutex::new(State::default()));

    // Reservoir sensor stream (EC, pH, flow). Each kind carries its own
    // timestamp so the freshness gate fires correctly per-reading.
    let mut manifold = client.subscribe("kratt.manifold.sensor.*").await?;
    let s1 = state.clone();
    tokio::spawn(async move {
        while let Some(msg) = manifold.next().await {
            let Ok(m) = serde_json::from_slice::<ManifoldMsg>(&msg.payload) else { continue };
            let now = Instant::now();
            let mut g = s1.lock().await;
            match m.kind.as_str() {
                "ec"   => g.chamber_ec   = Some((m.value, now)),
                "ph"   => g.chamber_ph   = Some((m.value, now)),
                "flow" => g.chamber_flow = Some((m.value, now)),
                _ => {}
            }
        }
    });

    // Composter state: the authoritative source for slurry EC AND the
    // pathogen-kill gate. Subscribing to kratt.composter.sensor.* would
    // confuse the composting-drum probes with the holding-tank readings.
    let mut compost_state = client.subscribe("kratt.composter.state").await?;
    let s2 = state.clone();
    tokio::spawn(async move {
        while let Some(msg) = compost_state.next().await {
            let Ok(m) = serde_json::from_slice::<ComposterStateMsg>(&msg.payload) else { continue };
            let now = Instant::now();
            let mut g = s2.lock().await;
            g.slurry_pathogen_kill_ok = m.pathogen_kill_ok;
            if let Some(ec) = m.slurry_ec_est {
                g.slurry_ec = Some((ec, now));
            }
        }
    });

    let mut setpoints = client.subscribe("kratt.planner.setpoint.*").await?;
    let s3 = state.clone();
    tokio::spawn(async move {
        while let Some(msg) = setpoints.next().await {
            let Ok(m) = serde_json::from_slice::<SetpointMsg>(&msg.payload) else { continue };
            let mut g = s3.lock().await;
            // NOTE: with multiple zones on the shared manifold this is
            // last-write-wins. v2 would average target_ec across zones or
            // pick the strictest pH band. v1 single-zone deployments are
            // unaffected.
            g.target_ec = m.ec_ms_cm;
            g.target_ph = m.ph;
            if let Some(p) = m.phase { g.phase = p; }
        }
    });

    let mut tick = tokio::time::interval(Duration::from_secs(30));
    loop {
        tick.tick().await;
        let now = Instant::now();
        let cmd = {
            let mut g = state.lock().await;
            g.prune_ledger(now);

            let leafy = matches!(g.phase.as_str(), "germination" | "seedling" | "vegetative");
            let ctx = MixContext {
                target_ec: g.target_ec,
                target_ph: g.target_ph,
                chamber_ec: g.chamber_ec.map(|(v, _)| v).unwrap_or(0.0),
                chamber_ph: g.chamber_ph.map(|(v, _)| v).unwrap_or(7.0),
                slurry_ec:  g.slurry_ec.map(|(v, _)| v).unwrap_or(0.0),
                flow_ok:    g.chamber_flow.map(|(v, _)| v > 0.0).unwrap_or(false),
                phase_is_leafy: leafy,
                sensors_fresh: g.sensors_fresh(now),
                slurry_pathogen_kill_ok: g.slurry_pathogen_kill_ok,
                last_dose_ago: g.last_dose_at.map(|t| now.duration_since(t)),
                daily_volumes_ml: g.daily_volumes(now),
            };

            let Some(d) = decide(&ctx) else {
                if !ctx.sensors_fresh {
                    warn!("skipping tick: one or more sensor readings are stale");
                }
                continue
            };

            // Sanity: volume should already be bounded by the policy, but
            // double-check before issuing a pump command. The pump driver
            // will respect MAX_DOSE_ML too.
            let volume_ml = d.volume_ml.min(MAX_DOSE_ML);
            g.last_dose_at = Some(now);
            g.dose_ledger.push((now, d.choice, volume_ml));
            DoseCmd {
                ts: now_iso(),
                issuer: "mixer",
                pump_id: d.choice.pump_id(),
                volume_ml,
                max_rate_ml_s: 2.0,
                reason: d.reason,
                correlation_id: uuid::Uuid::new_v4().to_string(),
            }
        };

        info!(pump = cmd.pump_id, ml = cmd.volume_ml, reason = cmd.reason, "dose issued");
        client.publish("kratt.command.dose",
            serde_json::to_vec(&cmd)?.into()).await?;
    }
}
