//! Per-zone PI controllers.
//!
//! PI only — no derivative term, because EC/pH probes are too noisy for D to
//! help. Anti-windup is a simple integral clamp. Each loop has a deadband
//! around the setpoint and a per-tick max output rate so the planner can't
//! issue ramp-up bursts.

use std::time::Instant;

#[derive(Debug, Clone)]
pub struct PiConfig {
    pub kp: f64,
    pub ki: f64,
    pub deadband: f64,
    pub output_min: f64,
    pub output_max: f64,
    pub integral_min: f64,
    pub integral_max: f64,
    pub max_rate_per_s: f64,
}

#[derive(Debug)]
pub struct PiController {
    cfg: PiConfig,
    integral: f64,
    last_output: f64,
    last_t: Option<Instant>,
}

impl PiController {
    pub fn new(cfg: PiConfig) -> Self {
        Self { cfg, integral: 0.0, last_output: 0.0, last_t: None }
    }

    pub fn reset(&mut self) {
        self.integral = 0.0;
        self.last_output = 0.0;
        self.last_t = None;
    }

    /// Returns the new output (e.g. dose volume in ml or duty-cycle percent),
    /// or `None` if the sensor is too stale to act on.
    pub fn step(&mut self, setpoint: f64, measured: f64, sensor_ok: bool) -> Option<f64> {
        let now = Instant::now();
        let dt = self.last_t.map(|t| now.duration_since(t).as_secs_f64()).unwrap_or(0.0);
        self.last_t = Some(now);

        if !sensor_ok {
            return None;
        }

        let err = setpoint - measured;
        if err.abs() <= self.cfg.deadband {
            // Inside the deadband: hold output, but slowly bleed off the integral
            // so re-entry into the live region starts from a sane state.
            self.integral *= 0.95;
            return Some(self.last_output);
        }

        self.integral = (self.integral + err * dt)
            .clamp(self.cfg.integral_min, self.cfg.integral_max);

        let raw = self.cfg.kp * err + self.cfg.ki * self.integral;
        let bounded = raw.clamp(self.cfg.output_min, self.cfg.output_max);

        let max_step = self.cfg.max_rate_per_s * dt.max(0.1);
        let limited = if (bounded - self.last_output).abs() > max_step {
            self.last_output + max_step.copysign(bounded - self.last_output)
        } else {
            bounded
        };
        self.last_output = limited;
        Some(limited)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg() -> PiConfig {
        PiConfig {
            kp: 0.6, ki: 0.05,
            deadband: 0.1,
            output_min: 0.0, output_max: 10.0,
            integral_min: -20.0, integral_max: 20.0,
            max_rate_per_s: 5.0,
        }
    }

    #[test]
    fn deadband_holds() {
        let mut c = PiController::new(cfg());
        c.step(1.0, 0.0, true);
        let inside = c.step(1.0, 0.95, true).unwrap();
        let again = c.step(1.0, 0.92, true).unwrap();
        assert_eq!(inside, again);
    }

    #[test]
    fn stale_sensor_returns_none() {
        let mut c = PiController::new(cfg());
        assert!(c.step(1.0, 0.5, false).is_none());
    }

    #[test]
    fn output_is_clamped() {
        let mut c = PiController::new(cfg());
        let out = c.step(100.0, 0.0, true).unwrap();
        assert!(out <= 10.0);
    }
}
