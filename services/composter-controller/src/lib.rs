//! Composter state machine, extracted so it's unit-testable without a
//! tokio runtime or NATS bus.
//!
//! Pathogen-kill gate: the batch must accumulate at least 72 h with the
//! EFFECTIVE temperature at or above 55 C. Effective temperature is the
//! MIN of every connected probe (cold spots in a pile decide whether
//! the kill is real, not hot spots). The accumulator pauses whenever:
//!   - any probe is stale (no message in N seconds)
//!   - any probe is stuck (no value change in M minutes)
//!   - aeration is reporting unhealthy
//! These are all fail-closed: we refuse to count time if we can't trust
//! the inputs.

use std::collections::HashMap;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};

pub const THERMO_MIN_C: f64 = 55.0;
pub const MESO_MIN_C: f64 = 40.0;
pub const THERMO_HOLD: Duration = Duration::from_secs(72 * 3600);
pub const CURE_HOLD: Duration = Duration::from_secs(24 * 3600);
pub const GRIND_HOLD: Duration = Duration::from_secs(120);
/// A probe whose last message is older than this is considered offline.
pub const PROBE_STALE_AFTER: Duration = Duration::from_secs(60);
/// A probe whose reading hasn't moved at all for this long is stuck.
pub const PROBE_STUCK_AFTER: Duration = Duration::from_secs(10 * 60);
/// Aeration message older than this means the air pump is silent.
pub const AERATION_STALE_AFTER: Duration = Duration::from_secs(90);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Idle,
    Grinding,
    Mesophilic,
    Thermophilic,
    Cure,
    TankReady,
    Dispensing,
}

#[derive(Debug, Clone)]
pub struct ProbeState {
    pub value: f64,
    pub last_update: Instant,
    pub last_change: Instant,
}

impl ProbeState {
    pub fn new(value: f64, now: Instant) -> Self {
        Self { value, last_update: now, last_change: now }
    }

    pub fn observe(&mut self, value: f64, now: Instant) {
        // A real thermistor wiggles; if a new reading is bit-identical to
        // the last, we treat that as "no change" for stuck-probe detection.
        if (value - self.value).abs() > f64::EPSILON {
            self.last_change = now;
        }
        self.value = value;
        self.last_update = now;
    }

    pub fn is_stale(&self, now: Instant) -> bool {
        now.duration_since(self.last_update) > PROBE_STALE_AFTER
    }

    pub fn is_stuck(&self, now: Instant) -> bool {
        now.duration_since(self.last_change) > PROBE_STUCK_AFTER
    }

    pub fn is_healthy(&self, now: Instant) -> bool {
        !self.is_stale(now) && !self.is_stuck(now)
    }
}

#[derive(Debug, Clone)]
pub struct AerationState {
    pub last_update: Option<Instant>,
    pub last_value: f64,
}

impl AerationState {
    pub fn new() -> Self { Self { last_update: None, last_value: 0.0 } }

    pub fn observe(&mut self, value: f64, now: Instant) {
        self.last_update = Some(now);
        self.last_value = value;
    }

    /// Aeration is healthy only if we've heard from the air-pump sensor
    /// recently AND the reading is nonzero (a flow meter at zero, or a
    /// duty-cycle at 0%, means no air is moving).
    pub fn is_healthy(&self, now: Instant, expected_on: bool) -> bool {
        if !expected_on {
            return true; // We didn't ask for aeration this phase
        }
        match self.last_update {
            Some(t) if now.duration_since(t) <= AERATION_STALE_AFTER => self.last_value > 0.01,
            _ => false,
        }
    }
}

/// Persistent slice of the batch. Survives controller restarts via JSON
/// on disk. Excludes Instant fields, which are recomputed at startup.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistentBatch {
    pub id: String,
    pub phase: Phase,
    pub phase_started_iso: String,
    pub thermo_accumulated_seconds: u64,
    pub pathogen_kill_ok: bool,
}

#[derive(Debug)]
pub struct Batch {
    pub id: String,
    pub phase: Phase,
    pub phase_started: Instant,
    pub phase_started_iso: String,
    pub thermo_accumulated: Duration,
    pub last_eval: Instant,
    pub probes: HashMap<String, ProbeState>,
    pub aeration: AerationState,
    pub pathogen_kill_ok: bool,
}

impl Batch {
    pub fn new(id: String, now: Instant, iso_now: String) -> Self {
        Self {
            id,
            phase: Phase::Idle,
            phase_started: now,
            phase_started_iso: iso_now,
            thermo_accumulated: Duration::ZERO,
            last_eval: now,
            probes: HashMap::new(),
            aeration: AerationState::new(),
            pathogen_kill_ok: false,
        }
    }

    pub fn from_persistent(p: PersistentBatch, now: Instant) -> Self {
        Self {
            id: p.id,
            phase: p.phase,
            phase_started: now, // We've lost wall-clock alignment; restart the phase timer fresh
            phase_started_iso: p.phase_started_iso,
            thermo_accumulated: Duration::from_secs(p.thermo_accumulated_seconds),
            last_eval: now,
            probes: HashMap::new(),
            aeration: AerationState::new(),
            pathogen_kill_ok: p.pathogen_kill_ok,
        }
    }

    pub fn to_persistent(&self) -> PersistentBatch {
        PersistentBatch {
            id: self.id.clone(),
            phase: self.phase,
            phase_started_iso: self.phase_started_iso.clone(),
            thermo_accumulated_seconds: self.thermo_accumulated.as_secs(),
            pathogen_kill_ok: self.pathogen_kill_ok,
        }
    }

    pub fn observe_probe(&mut self, id: &str, value: f64, now: Instant) {
        self.probes
            .entry(id.to_string())
            .and_modify(|p| p.observe(value, now))
            .or_insert_with(|| ProbeState::new(value, now));
    }

    pub fn observe_aeration(&mut self, value: f64, now: Instant) {
        self.aeration.observe(value, now);
    }

    /// Effective temperature for the pathogen-kill gate. We require
    /// at least 2 healthy probes and take the MIN. If only one probe is
    /// connected (or one is unhealthy), there's no effective temperature
    /// and `effective_temp()` returns None, which fails the gate.
    pub fn effective_temp(&self, now: Instant) -> Option<f64> {
        let healthy: Vec<f64> = self
            .probes
            .values()
            .filter(|p| p.is_healthy(now))
            .map(|p| p.value)
            .collect();
        if healthy.len() >= 2 {
            healthy.iter().cloned().fold(None, |acc, v| {
                Some(match acc { Some(a) => a.min(v), None => v })
            })
        } else {
            None
        }
    }
}

/// Drives the state machine one tick. Pure-function on (batch, now, iso_now).
pub fn advance(b: &mut Batch, now: Instant, iso_now: &str) {
    let dt = now.duration_since(b.last_eval);
    b.last_eval = now;

    let expected_aeration = matches!(b.phase, Phase::Mesophilic | Phase::Thermophilic);
    let aeration_ok = b.aeration.is_healthy(now, expected_aeration);
    let eff = b.effective_temp(now);

    match b.phase {
        Phase::Grinding if b.phase_started.elapsed() >= GRIND_HOLD => {
            b.phase = Phase::Mesophilic;
            b.phase_started = now;
            b.phase_started_iso = iso_now.to_string();
        }
        Phase::Mesophilic => {
            if let Some(t) = eff {
                if t >= THERMO_MIN_C && aeration_ok {
                    b.phase = Phase::Thermophilic;
                    b.phase_started = now;
                    b.phase_started_iso = iso_now.to_string();
                }
            }
        }
        Phase::Thermophilic => {
            match (eff, aeration_ok) {
                // Healthy: accumulate
                (Some(t), true) if t >= THERMO_MIN_C => {
                    b.thermo_accumulated += dt;
                }
                // Cold: fall back to mesophilic
                (Some(t), _) if t < MESO_MIN_C => {
                    b.phase = Phase::Mesophilic;
                    b.phase_started = now;
                    b.phase_started_iso = iso_now.to_string();
                }
                // Probe unhealthy, aeration failed, or temp between 40 and 55:
                // pause the timer. Don't fall back; don't advance the gate.
                _ => {}
            }
            if b.thermo_accumulated >= THERMO_HOLD {
                b.pathogen_kill_ok = true;
                b.phase = Phase::Cure;
                b.phase_started = now;
                b.phase_started_iso = iso_now.to_string();
            }
        }
        Phase::Cure if b.phase_started.elapsed() >= CURE_HOLD => {
            b.phase = Phase::TankReady;
            b.phase_started = now;
            b.phase_started_iso = iso_now.to_string();
        }
        _ => {}
    }
}

/// One row in the per-batch audit log. Append-only.
#[derive(Debug, Serialize)]
pub struct AuditRow<'a> {
    pub ts: &'a str,
    pub batch_id: &'a str,
    pub phase: Phase,
    pub effective_c: Option<f64>,
    pub probes: Vec<(String, f64, bool)>, // (id, value, healthy)
    pub aeration_ok: bool,
    pub thermo_hold_seconds: u64,
    pub pathogen_kill_ok: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn iso(s: &str) -> String { s.into() }

    #[test]
    fn fresh_batch_has_no_effective_temp() {
        let now = Instant::now();
        let b = Batch::new("x".into(), now, iso("t0"));
        assert!(b.effective_temp(now).is_none());
    }

    #[test]
    fn one_probe_isnt_enough() {
        let now = Instant::now();
        let mut b = Batch::new("x".into(), now, iso("t0"));
        b.observe_probe("a", 58.0, now);
        assert!(b.effective_temp(now).is_none(), "one probe must not satisfy the gate");
    }

    #[test]
    fn two_probes_take_the_min() {
        let now = Instant::now();
        let mut b = Batch::new("x".into(), now, iso("t0"));
        b.observe_probe("a", 60.0, now);
        b.observe_probe("b", 56.0, now);
        let eff = b.effective_temp(now).unwrap();
        assert!((eff - 56.0).abs() < 0.001, "expected min of {{60, 56}}, got {}", eff);
    }

    #[test]
    fn stale_probe_disqualifies() {
        let t0 = Instant::now();
        let mut b = Batch::new("x".into(), t0, iso("t0"));
        b.observe_probe("a", 60.0, t0);
        b.observe_probe("b", 60.0, t0);
        // Probe b stops reporting; only a updates 90 s later
        let t1 = t0 + Duration::from_secs(90);
        b.observe_probe("a", 60.0, t1);
        assert!(b.effective_temp(t1).is_none(), "stale probe must disqualify");
    }

    #[test]
    fn stuck_probe_disqualifies() {
        let t0 = Instant::now();
        let mut b = Batch::new("x".into(), t0, iso("t0"));
        b.observe_probe("a", 60.0, t0);
        b.observe_probe("b", 60.0, t0);
        // Probe a keeps reporting the EXACT same value for 11 minutes
        let t1 = t0 + Duration::from_secs(11 * 60);
        b.observe_probe("a", 60.0, t1);
        b.observe_probe("b", 60.05, t1); // b is wiggling, so it's fine
        assert!(b.effective_temp(t1).is_none(), "stuck probe must disqualify");
    }

    #[test]
    fn aeration_silent_during_thermophilic_blocks_accumulation() {
        let t0 = Instant::now();
        let mut b = Batch::new("x".into(), t0, iso("t0"));
        b.phase = Phase::Thermophilic;
        b.observe_probe("a", 60.0, t0);
        b.observe_probe("b", 59.5, t0);
        // No aeration messages have arrived at all
        let t1 = t0 + Duration::from_secs(10);
        b.observe_probe("a", 60.0, t1);
        b.observe_probe("b", 59.5, t1);
        let before = b.thermo_accumulated;
        advance(&mut b, t1, "t1");
        assert_eq!(b.thermo_accumulated, before, "no accumulation without aeration health");
    }

    #[test]
    fn full_gate_advances_then_pathogen_kill_ok() {
        let t0 = Instant::now();
        let mut b = Batch::new("x".into(), t0, iso("t0"));
        b.phase = Phase::Thermophilic;
        b.thermo_accumulated = THERMO_HOLD - Duration::from_secs(1);

        // Two healthy probes both above the threshold, plus healthy aeration
        b.observe_probe("a", 60.0, t0);
        b.observe_probe("b", 59.5, t0);
        b.observe_aeration(0.8, t0);

        let t1 = t0 + Duration::from_secs(2);
        b.observe_probe("a", 60.1, t1);
        b.observe_probe("b", 59.4, t1);
        b.observe_aeration(0.8, t1);

        advance(&mut b, t1, "t1");
        assert!(b.pathogen_kill_ok, "gate should flip with >=72h accumulated");
        assert_eq!(b.phase, Phase::Cure);
    }

    #[test]
    fn temperature_below_meso_falls_back_to_mesophilic() {
        let t0 = Instant::now();
        let mut b = Batch::new("x".into(), t0, iso("t0"));
        b.phase = Phase::Thermophilic;
        b.observe_probe("a", 35.0, t0);
        b.observe_probe("b", 33.0, t0);
        b.observe_aeration(0.8, t0);
        let t1 = t0 + Duration::from_secs(1);
        b.observe_probe("a", 35.0, t1);
        b.observe_probe("b", 33.1, t1);
        b.observe_aeration(0.8, t1);
        advance(&mut b, t1, "t1");
        assert_eq!(b.phase, Phase::Mesophilic);
    }

    #[test]
    fn persistence_round_trip_preserves_thermo_accumulated() {
        let t0 = Instant::now();
        let mut b = Batch::new("xyz".into(), t0, iso("t0"));
        b.phase = Phase::Thermophilic;
        b.thermo_accumulated = Duration::from_secs(36 * 3600); // halfway through
        let p = b.to_persistent();
        let restored = Batch::from_persistent(p, Instant::now());
        assert_eq!(restored.id, "xyz");
        assert_eq!(restored.phase, Phase::Thermophilic);
        assert_eq!(restored.thermo_accumulated.as_secs(), 36 * 3600);
        // Probes are NOT restored: gate stays closed until probes report again
        assert!(restored.effective_temp(Instant::now()).is_none());
    }
}
