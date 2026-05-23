"""Unit tests for the scheduler photoperiod logic."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../services/scheduler"))

from scheduler.__main__ import _next_transition, PHOTOPERIOD_SUNRISE_LOCAL_HOUR


def test_before_sunrise_is_off():
    sunrise_s = PHOTOPERIOD_SUNRISE_LOCAL_HOUR * 3600
    now_secs_into_day = sunrise_s - 600  # 10 minutes before sunrise
    on, wait = _next_transition(now_secs_into_day, hours_on=14)
    assert on is False
    assert abs(wait - 600) < 1.0


def test_during_day_is_on():
    sunrise_s = PHOTOPERIOD_SUNRISE_LOCAL_HOUR * 3600
    now_secs_into_day = sunrise_s + 3600  # 1 hour after sunrise
    hours_on = 14
    sunset_s = sunrise_s + hours_on * 3600
    on, wait = _next_transition(now_secs_into_day, hours_on)
    assert on is True
    expected_wait = sunset_s - now_secs_into_day
    assert abs(wait - expected_wait) < 1.0


def test_after_sunset_is_off():
    sunrise_s = PHOTOPERIOD_SUNRISE_LOCAL_HOUR * 3600
    hours_on = 14
    sunset_s = sunrise_s + hours_on * 3600
    now_secs_into_day = sunset_s + 1800  # 30 min after sunset
    on, wait = _next_transition(now_secs_into_day, hours_on)
    assert on is False
    # wait should be until next sunrise (wrap around midnight)
    expected = (86400 - now_secs_into_day) + sunrise_s
    assert abs(wait - expected) < 1.0


def test_short_photoperiod():
    on, wait = _next_transition(10 * 3600, hours_on=2)
    # sunrise=6:00, sunset=8:00, at 10:00 we're past sunset
    assert on is False


def test_zero_hours_always_off():
    on, wait = _next_transition(8 * 3600, hours_on=0)
    # sunrise=6:00, sunset=6:00 (0 hours), at 8:00 we're past sunset
    assert on is False
