//! Safety policy, extracted so it's unit-testable without async-nats.
//!
//! The watcher runs the same bounds checks as the safety MCU, plus a
//! software-side veto on the slurry pump that the MCU can't currently
//! enforce on its own:
//!
//!   - If a `kratt.command.dose` targets the slurry pump while the
//!     composter's `pathogen_kill_ok` flag is false (or stale), the
//!     watcher trips the whole system. This is the software half of the
//!     hardware interlock; the MCU half is wired through a dedicated
//!     "slurry_authorized" GPIO line that this service raises only when
//!     the gate is satisfied. Either side failing trips the rail.
//!
//! Every trip is latching: only an explicit ack from the UI (with
//! physical-presence confirmation) clears it.

use std::time::{Duration, Instant};

pub const EC_RUNAWAY: f64 = 4.0;
pub const PH_LOW: f64 = 4.5;
pub const PH_HIGH: f64 = 8.0;
pub const COMPOSTER_OVER_TEMP_C: f64 = 65.0;
pub const HEARTBEAT_TIMEOUT: Duration = Duration::from_secs(2);

/// Composter state must arrive at least this often for `pathogen_kill_ok`
/// to be trusted. If the composter service has gone silent for longer,
/// treat the flag as unsafe regardless of its last value.
pub const COMPOSTER_STATE_STALE_AFTER: Duration = Duration::from_secs(60);

/// Trip causes published on `kratt.event.safety.trip`. Stable enum so
/// the UI can render an icon per cause and downstream alerting can
/// correlate.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TripCause {
    EcRunaway,
    PhLow,
    PhHigh,
    OverTemp,
    ManifoldHeartbeatLost,
    ComposterHeartbeatLost,
    SlurryWithoutKillGate,
}

impl TripCause {
    pub fn as_str(self) -> &'static str {
        match self {
            TripCause::EcRunaway              => "ec_runaway",
            TripCause::PhLow                  => "ph_low",
            TripCause::PhHigh                 => "ph_high",
            TripCause::OverTemp               => "over_temp",
            TripCause::ManifoldHeartbeatLost  => "manifold_heartbeat_lost",
            TripCause::ComposterHeartbeatLost => "composter_heartbeat_lost",
            TripCause::SlurryWithoutKillGate  => "slurry_without_kill_gate",
        }
    }
}

#[derive(Debug)]
pub struct Watch {
    pub last_manifold:      Instant,
    pub last_compost_state: Option<Instant>,
    pub last_compost_sensor: Instant,
    pub pathogen_kill_ok:   bool,
    pub latched:            bool,
}

impl Watch {
    pub fn new(now: Instant) -> Self {
        Self {
            last_manifold: now,
            last_compost_state: None,
            last_compost_sensor: now,
            pathogen_kill_ok: false,
            latched: false,
        }
    }

    /// True when we've heard from the composter recently AND its last
    /// reported state had `pathogen_kill_ok = true`. Without a fresh
    /// "yes," slurry dosing is unsafe.
    pub fn slurry_authorized(&self, now: Instant) -> bool {
        match self.last_compost_state {
            Some(t) if now.duration_since(t) <= COMPOSTER_STATE_STALE_AFTER => self.pathogen_kill_ok,
            _ => false,
        }
    }
}

/// Evaluate a manifold sensor reading and return a trip cause if it
/// crosses a safety bound. Pure-function on the value.
pub fn manifold_trip(kind: &str, value: f64) -> Option<TripCause> {
    match kind {
        "ec" if value > EC_RUNAWAY => Some(TripCause::EcRunaway),
        "ph" if value < PH_LOW     => Some(TripCause::PhLow),
        "ph" if value > PH_HIGH    => Some(TripCause::PhHigh),
        _ => None,
    }
}

/// Evaluate a composter probe reading and return a trip cause if the
/// pile has gone runaway-hot (smouldering risk).
pub fn composter_trip(kind: &str, value: f64) -> Option<TripCause> {
    if kind == "temp" && value > COMPOSTER_OVER_TEMP_C {
        Some(TripCause::OverTemp)
    } else {
        None
    }
}

/// Evaluate a heartbeat tick: trips if either sensor stream has gone
/// silent past HEARTBEAT_TIMEOUT.
pub fn heartbeat_trip(w: &Watch, now: Instant) -> Option<TripCause> {
    if now.duration_since(w.last_manifold) > HEARTBEAT_TIMEOUT {
        return Some(TripCause::ManifoldHeartbeatLost);
    }
    if now.duration_since(w.last_compost_sensor) > HEARTBEAT_TIMEOUT {
        return Some(TripCause::ComposterHeartbeatLost);
    }
    None
}

/// Inspect an outgoing dose command. If it targets the slurry pump and
/// the kill gate isn't satisfied, return a trip cause. Doses targeting
/// other pumps (n, p, ph_up, ph_down) are unaffected by this check.
pub fn dose_trip(pump_id: &str, slurry_authorized: bool) -> Option<TripCause> {
    if pump_id == "slurry" && !slurry_authorized {
        Some(TripCause::SlurryWithoutKillGate)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn manifold_ec_over_4_trips() {
        assert_eq!(manifold_trip("ec", 4.1), Some(TripCause::EcRunaway));
        assert_eq!(manifold_trip("ec", 3.9), None);
    }

    #[test]
    fn manifold_ph_bounds_trip_both_sides() {
        assert_eq!(manifold_trip("ph", 4.4), Some(TripCause::PhLow));
        assert_eq!(manifold_trip("ph", 8.1), Some(TripCause::PhHigh));
        assert_eq!(manifold_trip("ph", 6.2), None);
    }

    #[test]
    fn composter_over_temp_trips() {
        assert_eq!(composter_trip("temp", 65.1), Some(TripCause::OverTemp));
        assert_eq!(composter_trip("temp", 60.0), None);
    }

    #[test]
    fn unknown_sensor_kinds_never_trip() {
        assert!(manifold_trip("humidity", 999.0).is_none());
        assert!(composter_trip("aeration_lpm", 0.0).is_none());
    }

    #[test]
    fn slurry_authorized_requires_fresh_yes() {
        let t0 = Instant::now();
        let mut w = Watch::new(t0);

        // Default: no composter state ever received -> NOT authorized
        assert!(!w.slurry_authorized(t0));

        // Fresh yes -> authorized
        w.last_compost_state = Some(t0);
        w.pathogen_kill_ok = true;
        assert!(w.slurry_authorized(t0));

        // Fresh no -> not authorized
        w.pathogen_kill_ok = false;
        assert!(!w.slurry_authorized(t0));

        // Stale yes -> not authorized
        w.pathogen_kill_ok = true;
        let later = t0 + COMPOSTER_STATE_STALE_AFTER + Duration::from_secs(5);
        assert!(!w.slurry_authorized(later));
    }

    #[test]
    fn dose_slurry_without_kill_gate_trips() {
        assert_eq!(dose_trip("slurry", false), Some(TripCause::SlurryWithoutKillGate));
        assert_eq!(dose_trip("slurry", true),  None);
    }

    #[test]
    fn dose_other_pumps_unaffected_by_kill_gate() {
        // Base nutrients, pH dosing: never gated by the composter
        for pump in ["n", "p", "k", "ph_up", "ph_down", "clean_water"] {
            assert_eq!(dose_trip(pump, false), None, "pump {} should not trip", pump);
            assert_eq!(dose_trip(pump, true),  None);
        }
    }

    #[test]
    fn heartbeat_trips_after_timeout() {
        let t0 = Instant::now();
        let w = Watch::new(t0);
        // Just-now: no trip
        assert!(heartbeat_trip(&w, t0).is_none());
        // After timeout, both sensors stale: trip on the first one checked (manifold)
        let later = t0 + HEARTBEAT_TIMEOUT + Duration::from_secs(1);
        assert_eq!(heartbeat_trip(&w, later), Some(TripCause::ManifoldHeartbeatLost));
    }

    #[test]
    fn trip_cause_strings_are_stable_for_the_event_schema() {
        assert_eq!(TripCause::SlurryWithoutKillGate.as_str(), "slurry_without_kill_gate");
        assert_eq!(TripCause::EcRunaway.as_str(),             "ec_runaway");
    }
}
