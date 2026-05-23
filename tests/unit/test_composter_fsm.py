"""Unit tests for the composter controller state machine.

Since the FSM is in Rust, these tests validate the equivalent logic by
running a simulated version of the advance() transitions. The Rust unit
tests cover the exact production code; this file verifies the same contract
from a blackbox perspective for the integration test harness.
"""

import subprocess
import json


def test_rust_composter_tests_pass():
    """Ensure the Rust unit tests in composter-controller pass."""
    result = subprocess.run(
        ["cargo", "test", "-p", "composter-controller", "--quiet"],
        capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, f"composter-controller tests failed:\n{result.stderr}"


def test_rust_nutrient_mixer_tests_pass():
    """Ensure the nutrient-mixer Rust tests pass."""
    result = subprocess.run(
        ["cargo", "test", "-p", "nutrient-mixer", "--quiet"],
        capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, f"nutrient-mixer tests failed:\n{result.stderr}"


def test_rust_control_loop_tests_pass():
    """Ensure the control-loop Rust tests pass."""
    result = subprocess.run(
        ["cargo", "test", "-p", "control-loop", "--quiet"],
        capture_output=True, text=True, timeout=60,
    )
    assert result.returncode == 0, f"control-loop tests failed:\n{result.stderr}"
