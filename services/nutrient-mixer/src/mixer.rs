//! Mixer policy.
//!
//! Given a target EC, the slurry tank's current EC, and the current chamber
//! EC, pick a dose that closes the gap. Hard constraints:
//!   - Never dose more than `MAX_DOSE_ML` per call.
//!   - Never dose if the flow sensor reads zero.
//!   - Prefer slurry while it's strong enough; fall back to base nutrients.
//!
//! Justification for not using a real LP solver in v1: with two free variables
//! (slurry volume, base volume) and a single EC target, the LP collapses to a
//! threshold rule. Real linear programming becomes useful once we model pH
//! and individual N/P/K targets simultaneously.

pub const MAX_DOSE_ML: f64 = 25.0;
pub const SLURRY_MIN_EC: f64 = 1.5;
pub const ML_PER_EC_DELTA_SLURRY: f64 = 12.0;
pub const ML_PER_EC_DELTA_BASE: f64 = 4.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NutrientChoice {
    Slurry,
    BaseN,
    BasePK,
}

pub struct MixContext {
    pub target_ec: f64,
    pub chamber_ec: f64,
    pub slurry_ec: f64,
    pub flow_ok: bool,
    pub phase_is_leafy: bool,
}

#[derive(Debug)]
pub struct MixDecision {
    pub choice: NutrientChoice,
    pub volume_ml: f64,
}

pub fn decide(ctx: MixContext) -> Option<MixDecision> {
    if !ctx.flow_ok { return None; }
    let gap = ctx.target_ec - ctx.chamber_ec;
    if gap <= 0.0 { return None; }

    if ctx.slurry_ec >= SLURRY_MIN_EC {
        let vol = (gap * ML_PER_EC_DELTA_SLURRY).min(MAX_DOSE_ML);
        Some(MixDecision { choice: NutrientChoice::Slurry, volume_ml: vol })
    } else {
        let choice = if ctx.phase_is_leafy { NutrientChoice::BaseN } else { NutrientChoice::BasePK };
        let vol = (gap * ML_PER_EC_DELTA_BASE).min(MAX_DOSE_ML);
        Some(MixDecision { choice, volume_ml: vol })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_without_flow() {
        let d = decide(MixContext {
            target_ec: 1.4, chamber_ec: 0.8, slurry_ec: 2.0,
            flow_ok: false, phase_is_leafy: true,
        });
        assert!(d.is_none());
    }

    #[test]
    fn picks_slurry_when_strong() {
        let d = decide(MixContext {
            target_ec: 1.4, chamber_ec: 0.8, slurry_ec: 2.0,
            flow_ok: true, phase_is_leafy: true,
        }).unwrap();
        assert_eq!(d.choice, NutrientChoice::Slurry);
        assert!(d.volume_ml <= MAX_DOSE_ML);
    }

    #[test]
    fn falls_back_to_base() {
        let d = decide(MixContext {
            target_ec: 1.4, chamber_ec: 0.8, slurry_ec: 0.5,
            flow_ok: true, phase_is_leafy: true,
        }).unwrap();
        assert_eq!(d.choice, NutrientChoice::BaseN);
    }
}
