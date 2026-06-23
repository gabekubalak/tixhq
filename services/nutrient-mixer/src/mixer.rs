//! Mixer policy.
//!
//! Given current reservoir EC/pH, the slurry tank's state, and the recipe's
//! target, decide what (if anything) to dose. Pure-function on a MixContext
//! so it's trivially unit-testable.
//!
//! Hard constraints (every dose path obeys):
//!   - Never dose more than `MAX_DOSE_ML` per single decision.
//!   - Never dose if the flow sensor reads zero (probe likely dry).
//!   - Never dose if any required sensor reading is stale.
//!   - Never dose from slurry without a healthy pathogen-kill flag.
//!   - Honor a settling window so back-to-back doses can't overshoot
//!     before the reservoir has mixed.
//!   - Honor a per-pump daily volume cap so a stuck sensor can't pump
//!     three liters of concentrate into the chamber.
//!
//! pH dosing is a basic rule-based fallback so Lite/Pragmatic deployments
//! (no AI planner) still get pH control. The Python planner, when running,
//! can override with more sophisticated dosing.

use std::collections::HashMap;
use std::time::Duration;

pub const MAX_DOSE_ML: f64 = 25.0;
pub const SLURRY_MIN_EC: f64 = 1.5;
pub const ML_PER_EC_DELTA_SLURRY: f64 = 12.0;
pub const ML_PER_EC_DELTA_BASE: f64 = 4.0;
pub const ML_PER_PH_DELTA: f64 = 8.0;

/// Per-pump cap on daily dose. Sized so a stuck-low EC sensor can't dump
/// the whole nutrient bottle into the chamber. With MAX_DOSE_ML = 25 and
/// SETTLING = 5 min, the natural ceiling is ~7,200 ml/day; this cap is a
/// safety backstop, not a normal-operation limit.
pub const MAX_DAILY_ML_PER_PUMP: f64 = 200.0;

/// After issuing a dose, wait this long before considering another dose
/// of any kind. Nutrient takes minutes to mix into a recirculating
/// reservoir; without this guard the mixer fires repeatedly seeing the
/// same low EC and massively overshoots, burning roots.
pub const SETTLING_WINDOW: Duration = Duration::from_secs(5 * 60);

/// Sensor readings older than this are treated as missing. The mixer
/// refuses to act on stale data; a dead probe should never silently
/// keep its last value forever.
pub const SENSOR_STALE_AFTER: Duration = Duration::from_secs(60);

/// pH deadband. Inside this band we don't dose; outside, we do.
/// Tight enough to keep the crop healthy, loose enough that we don't
/// hunt around the setpoint.
pub const PH_DEADBAND: f64 = 0.15;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum NutrientChoice {
    Slurry,
    BaseN,
    BasePK,
    PhUp,
    PhDown,
}

impl NutrientChoice {
    /// String pump_id matching schemas/kratt.command.dose.schema.json.
    pub fn pump_id(self) -> &'static str {
        match self {
            NutrientChoice::Slurry => "slurry",
            NutrientChoice::BaseN  => "n",
            NutrientChoice::BasePK => "p",   // PK uses the P-channel pump; K is on a separate pump in the future
            NutrientChoice::PhUp   => "ph_up",
            NutrientChoice::PhDown => "ph_down",
        }
    }
}

pub struct MixContext {
    pub target_ec: f64,
    pub target_ph: f64,
    pub chamber_ec: f64,
    pub chamber_ph: f64,
    pub slurry_ec: f64,
    pub flow_ok: bool,
    pub phase_is_leafy: bool,
    /// True only when every sensor reading we depend on is fresh.
    pub sensors_fresh: bool,
    /// True only when the active slurry batch has cleared 72h at >=55C.
    pub slurry_pathogen_kill_ok: bool,
    /// Time since the last dose was issued. `None` if no dose has ever
    /// been issued in this session.
    pub last_dose_ago: Option<Duration>,
    /// How much we've already dosed each pump in the last 24h.
    pub daily_volumes_ml: HashMap<NutrientChoice, f64>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MixDecision {
    pub choice: NutrientChoice,
    pub volume_ml: f64,
    pub reason: &'static str,
}

/// Decide what to dose right now. Returns at most one decision per call;
/// pH and EC are handled in separate ticks so the reservoir has time to
/// mix between actions.
pub fn decide(ctx: &MixContext) -> Option<MixDecision> {
    // Hard refuse: any of these is a missing precondition.
    if !ctx.flow_ok       { return None; }
    if !ctx.sensors_fresh { return None; }
    if let Some(t) = ctx.last_dose_ago {
        if t < SETTLING_WINDOW { return None; }
    }

    // pH first, EC second. Wrong pH inhibits nutrient uptake, so there's
    // no point dosing EC into a chamber that's at pH 4.2.
    if let Some(d) = decide_ph(ctx)  { return cap_daily(ctx, d); }
    if let Some(d) = decide_ec(ctx)  { return cap_daily(ctx, d); }
    None
}

fn decide_ph(ctx: &MixContext) -> Option<MixDecision> {
    let err = ctx.chamber_ph - ctx.target_ph;
    if err.abs() < PH_DEADBAND { return None; }
    let vol = (err.abs() * ML_PER_PH_DELTA).min(MAX_DOSE_ML);
    let choice = if err > 0.0 { NutrientChoice::PhDown } else { NutrientChoice::PhUp };
    let reason = if err > 0.0 { "ph_above_setpoint" } else { "ph_below_setpoint" };
    Some(MixDecision { choice, volume_ml: vol, reason })
}

fn decide_ec(ctx: &MixContext) -> Option<MixDecision> {
    let gap = ctx.target_ec - ctx.chamber_ec;
    if gap <= 0.0 { return None; }

    // Prefer slurry when it's strong enough, the pathogen-kill gate is
    // satisfied, AND the daily cap hasn't already been blown on slurry.
    // If any of those is false, fall through to base nutrients so EC
    // doesn't keep crashing just because slurry is rationed.
    let slurry_remaining = MAX_DAILY_ML_PER_PUMP
        - ctx.daily_volumes_ml.get(&NutrientChoice::Slurry).copied().unwrap_or(0.0);
    let slurry_ok = ctx.slurry_ec >= SLURRY_MIN_EC
        && ctx.slurry_pathogen_kill_ok
        && slurry_remaining > 0.5;
    if slurry_ok {
        let vol = (gap * ML_PER_EC_DELTA_SLURRY).min(MAX_DOSE_ML);
        return Some(MixDecision {
            choice: NutrientChoice::Slurry,
            volume_ml: vol,
            reason: "ec_below_setpoint",
        });
    }
    let choice = if ctx.phase_is_leafy { NutrientChoice::BaseN } else { NutrientChoice::BasePK };
    let vol = (gap * ML_PER_EC_DELTA_BASE).min(MAX_DOSE_ML);
    Some(MixDecision { choice, volume_ml: vol, reason: "ec_below_setpoint" })
}

/// Clamp the decision's volume to the remaining daily allowance for that
/// pump. If we've already maxed out, return None.
fn cap_daily(ctx: &MixContext, d: MixDecision) -> Option<MixDecision> {
    let used = ctx.daily_volumes_ml.get(&d.choice).copied().unwrap_or(0.0);
    let remaining = MAX_DAILY_ML_PER_PUMP - used;
    if remaining <= 0.5 { return None; }
    let capped = d.volume_ml.min(remaining);
    Some(MixDecision { volume_ml: capped, ..d })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_ctx() -> MixContext {
        MixContext {
            target_ec: 1.4,
            target_ph: 6.0,
            chamber_ec: 0.8,
            chamber_ph: 6.0,
            slurry_ec: 2.0,
            flow_ok: true,
            phase_is_leafy: true,
            sensors_fresh: true,
            slurry_pathogen_kill_ok: true,
            last_dose_ago: None,
            daily_volumes_ml: HashMap::new(),
        }
    }

    #[test]
    fn refuses_without_flow() {
        let mut c = base_ctx(); c.flow_ok = false;
        assert!(decide(&c).is_none());
    }

    #[test]
    fn refuses_on_stale_sensors() {
        let mut c = base_ctx(); c.sensors_fresh = false;
        assert!(decide(&c).is_none());
    }

    #[test]
    fn refuses_inside_settling_window() {
        let mut c = base_ctx();
        c.last_dose_ago = Some(Duration::from_secs(60));
        assert!(decide(&c).is_none());
    }

    #[test]
    fn allows_after_settling_window() {
        let mut c = base_ctx();
        c.last_dose_ago = Some(Duration::from_secs(6 * 60));
        assert!(decide(&c).is_some());
    }

    #[test]
    fn picks_slurry_when_strong_and_kill_ok() {
        let d = decide(&base_ctx()).unwrap();
        assert_eq!(d.choice, NutrientChoice::Slurry);
        assert!(d.volume_ml <= MAX_DOSE_ML);
    }

    #[test]
    fn refuses_slurry_without_pathogen_kill_ok() {
        let mut c = base_ctx();
        c.slurry_pathogen_kill_ok = false;
        let d = decide(&c).unwrap();
        // Should fall through to base nutrients, not silently dose slurry
        assert_ne!(d.choice, NutrientChoice::Slurry);
        assert_eq!(d.choice, NutrientChoice::BaseN);
    }

    #[test]
    fn falls_back_to_base() {
        let mut c = base_ctx();
        c.slurry_ec = 0.5; // too weak for slurry
        let d = decide(&c).unwrap();
        assert_eq!(d.choice, NutrientChoice::BaseN);
    }

    #[test]
    fn flowering_phase_uses_pk_base() {
        let mut c = base_ctx();
        c.slurry_ec = 0.5;
        c.phase_is_leafy = false;
        let d = decide(&c).unwrap();
        assert_eq!(d.choice, NutrientChoice::BasePK);
    }

    #[test]
    fn ph_low_doses_up() {
        let mut c = base_ctx();
        c.chamber_ph = 5.4;  // 0.6 below setpoint
        c.target_ph  = 6.0;
        let d = decide(&c).unwrap();
        assert_eq!(d.choice, NutrientChoice::PhUp);
        assert!(d.volume_ml > 0.0);
    }

    #[test]
    fn ph_high_doses_down() {
        let mut c = base_ctx();
        c.chamber_ph = 7.0;
        c.target_ph  = 6.0;
        let d = decide(&c).unwrap();
        assert_eq!(d.choice, NutrientChoice::PhDown);
    }

    #[test]
    fn ph_inside_deadband_no_dose() {
        let mut c = base_ctx();
        c.chamber_ph = 6.05;
        c.target_ph  = 6.0;
        c.chamber_ec = c.target_ec; // also no EC gap so we'd only dose if pH triggered
        assert!(decide(&c).is_none());
    }

    #[test]
    fn ph_takes_priority_over_ec_when_both_off() {
        let mut c = base_ctx();
        c.chamber_ph = 5.4;       // pH way off
        c.chamber_ec = 0.5;       // also low EC
        let d = decide(&c).unwrap();
        assert_eq!(d.choice, NutrientChoice::PhUp);
    }

    #[test]
    fn daily_cap_clamps_volume() {
        let mut c = base_ctx();
        c.chamber_ec = 0.0; // huge gap so the natural dose would be MAX_DOSE_ML
        let mut used = HashMap::new();
        used.insert(NutrientChoice::Slurry, MAX_DAILY_ML_PER_PUMP - 5.0);
        c.daily_volumes_ml = used;
        let d = decide(&c).unwrap();
        // Remaining is 5 ml; should be clamped down from MAX_DOSE_ML to 5.0
        assert!(d.volume_ml <= 5.0, "got {} ml", d.volume_ml);
    }

    #[test]
    fn daily_cap_refuses_when_exhausted() {
        let mut c = base_ctx();
        c.chamber_ec = 0.0;
        let mut used = HashMap::new();
        used.insert(NutrientChoice::Slurry, MAX_DAILY_ML_PER_PUMP);
        c.daily_volumes_ml = used;
        // Should fall through to base nutrients (which has its own untouched cap)
        let d = decide(&c).unwrap();
        assert_ne!(d.choice, NutrientChoice::Slurry);
    }

    #[test]
    fn pump_ids_match_schema_enum() {
        // schemas/kratt.command.dose.schema.json declares this exact list.
        for (c, expected) in [
            (NutrientChoice::Slurry, "slurry"),
            (NutrientChoice::BaseN,  "n"),
            (NutrientChoice::BasePK, "p"),
            (NutrientChoice::PhUp,   "ph_up"),
            (NutrientChoice::PhDown, "ph_down"),
        ] {
            assert_eq!(c.pump_id(), expected);
        }
    }
}
