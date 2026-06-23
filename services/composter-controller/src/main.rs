//! Composter controller binary. Drives the FSM in `composter_controller::lib`
//! against live NATS sensor data, persists batch state to disk so a restart
//! doesn't lose progress, and writes an append-only audit log per batch.
//!
//! Subscribes:
//!   kratt.composter.sensor.*       per-probe temperatures + aeration_lpm
//!   kratt.composter.command        operator start / dispense
//!
//! Publishes every 10 s:
//!   kratt.composter.state          phase, temps, audit fields
//!
//! The pathogen-kill gate is hard: it only flips when at least two healthy
//! probes report effective temperature >=55 C for 72 cumulative hours with
//! aeration flowing. Probe stale, probe stuck, or aeration silent all
//! pause the accumulator. The slurry valve is gated separately by the
//! safety MCU on `pathogen_kill_ok`.

use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{Context, Result};
use composter_controller::*;
use futures_util::StreamExt;
use serde::Deserialize;
use serde::Serialize;
use tokio::sync::Mutex;

const STATE_PATH: &str = "/var/lib/kratt/composter-batch.json";
const AUDIT_DIR: &str = "/var/log/kratt";

#[derive(Deserialize)]
struct CompostSensor {
    kind: String,
    value: f64,
    probe_id: Option<String>,
}

#[derive(Deserialize)]
struct CompostCommand {
    action: String,
}

#[derive(Serialize)]
struct StateMsg<'a> {
    ts: String,
    batch_id: &'a str,
    phase: Phase,
    temp_c: Option<f64>,            // effective (min of healthy probes)
    aeration_duty_pct: f64,
    aeration_ok: bool,
    probes_healthy: usize,
    thermo_hold_seconds: u64,
    pathogen_kill_ok: bool,
}

fn now_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap()
}

fn state_path() -> PathBuf {
    PathBuf::from(std::env::var("KRATT_COMPOSTER_STATE").unwrap_or_else(|_| STATE_PATH.into()))
}

fn audit_dir() -> PathBuf {
    PathBuf::from(std::env::var("KRATT_AUDIT_DIR").unwrap_or_else(|_| AUDIT_DIR.into()))
}

/// Best-effort persistence: write the JSON if the directory exists or can be
/// created. If we can't write, log and continue; we'd rather operate without
/// persistence than refuse to run.
fn save_state(p: &PersistentBatch) {
    let path = state_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let body = match serde_json::to_vec_pretty(p) {
        Ok(b) => b,
        Err(e) => { tracing::warn!("composter state serialize failed: {}", e); return; }
    };
    if let Err(e) = fs::write(&path, body) {
        tracing::warn!("composter state write failed: {}", e);
    }
}

fn load_state() -> Option<PersistentBatch> {
    let path = state_path();
    let body = fs::read(&path).ok()?;
    serde_json::from_slice(&body).ok()
}

/// Append-only audit log per batch. One JSON object per line.
fn audit_append(b: &Batch, now: Instant, ts: &str) -> Result<()> {
    let dir = audit_dir();
    fs::create_dir_all(&dir).ok();
    let path = dir.join(format!("composter-{}.log", b.id));
    let eff = b.effective_temp(now);
    let aeration_expected = matches!(b.phase, Phase::Mesophilic | Phase::Thermophilic);
    let row = AuditRow {
        ts,
        batch_id: &b.id,
        phase: b.phase,
        effective_c: eff,
        probes: b.probes.iter()
            .map(|(id, p)| (id.clone(), p.value, p.is_healthy(now)))
            .collect(),
        aeration_ok: b.aeration.is_healthy(now, aeration_expected),
        thermo_hold_seconds: b.thermo_accumulated.as_secs(),
        pathogen_kill_ok: b.pathogen_kill_ok,
    };
    let mut line = serde_json::to_vec(&row).context("audit serialize")?;
    line.push(b'\n');
    use std::io::Write;
    let mut f = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .with_context(|| format!("open audit log {:?}", path))?;
    f.write_all(&line)?;
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt().init();
    let nats_url = std::env::var("NATS_URL").unwrap_or_else(|_| "127.0.0.1:4222".into());
    let client = async_nats::connect(nats_url.as_str()).await?;

    let now = Instant::now();
    let iso = now_iso();
    let batch = match load_state() {
        Some(p) => {
            tracing::info!("resumed batch {} at phase {:?}, {}s accumulated",
                p.id, p.phase, p.thermo_accumulated_seconds);
            Batch::from_persistent(p, now)
        }
        None => Batch::new(uuid::Uuid::new_v4().to_string(), now, iso),
    };
    let batch: Arc<Mutex<Batch>> = Arc::new(Mutex::new(batch));

    // Subscriber: per-probe temperatures + aeration flow.
    let batch_s = batch.clone();
    let mut sub = client.subscribe("kratt.composter.sensor.*").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub.next().await {
            let Ok(m) = serde_json::from_slice::<CompostSensor>(&msg.payload) else { continue };
            let now = Instant::now();
            let mut b = batch_s.lock().await;
            match m.kind.as_str() {
                "temp" => {
                    let id = m.probe_id.unwrap_or_else(|| "a".into());
                    b.observe_probe(&id, m.value, now);
                }
                "aeration_lpm" | "aeration_duty" => {
                    b.observe_aeration(m.value, now);
                }
                _ => {}
            }
        }
    });

    // Subscriber: operator commands.
    let batch_c = batch.clone();
    let mut sub_cmd = client.subscribe("kratt.composter.command").await?;
    tokio::spawn(async move {
        while let Some(msg) = sub_cmd.next().await {
            let Ok(c) = serde_json::from_slice::<CompostCommand>(&msg.payload) else { continue };
            let mut b = batch_c.lock().await;
            let now = Instant::now();
            let iso = now_iso();
            match (c.action.as_str(), b.phase) {
                ("start", Phase::Idle) => {
                    *b = Batch::new(uuid::Uuid::new_v4().to_string(), now, iso);
                    b.phase = Phase::Grinding;
                    b.phase_started = now;
                }
                ("dispense", Phase::TankReady) => {
                    b.phase = Phase::Dispensing;
                    b.phase_started = now;
                }
                ("dispense_done", Phase::Dispensing) => {
                    b.phase = Phase::TankReady;
                }
                _ => {}
            }
        }
    });

    // Publisher / advancer: every 10 s, tick the FSM, persist, audit, emit.
    let mut tick = tokio::time::interval(Duration::from_secs(10));
    loop {
        tick.tick().await;
        let now = Instant::now();
        let iso = now_iso();
        let snapshot = {
            let mut b = batch.lock().await;
            advance(&mut b, now, &iso);
            let aeration = if matches!(b.phase, Phase::Mesophilic | Phase::Thermophilic) { 60.0 } else { 0.0 };
            let aeration_expected = aeration > 0.0;
            let healthy_count = b.probes.values().filter(|p| p.is_healthy(now)).count();
            let eff = b.effective_temp(now);
            let msg = StateMsg {
                ts: iso.clone(),
                batch_id: &b.id,
                phase: b.phase,
                temp_c: eff,
                aeration_duty_pct: aeration,
                aeration_ok: b.aeration.is_healthy(now, aeration_expected),
                probes_healthy: healthy_count,
                thermo_hold_seconds: b.thermo_accumulated.as_secs(),
                pathogen_kill_ok: b.pathogen_kill_ok,
            };
            let bytes = serde_json::to_vec(&msg)?;
            save_state(&b.to_persistent());
            if let Err(e) = audit_append(&b, now, &iso) {
                tracing::warn!("audit log write failed: {}", e);
            }
            bytes
        };
        client.publish("kratt.composter.state", snapshot.into()).await?;
    }
}
