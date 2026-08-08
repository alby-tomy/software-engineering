"""Tests for deduplication (Weeks 4–5)."""

import time

from pulsegrid.core.dedup import (
    DedupIndex,
    FlappingDetector,
    WindowDeduplicationStrategy,
)
from pulsegrid.models import Alert, Severity


def _alert(service: str = "api", title: str = "CPU high") -> Alert:
    return Alert(service_id=service, title=title, severity=Severity.P1, source="custom")


class TestWindowDeduplication:
    def test_not_duplicate_initially(self):
        strategy = WindowDeduplicationStrategy(window_seconds=300)
        store: dict[str, float] = {}
        alert = _alert()
        assert strategy.is_duplicate(alert, store) is False

    def test_duplicate_within_window(self):
        strategy = WindowDeduplicationStrategy(window_seconds=300)
        store: dict[str, float] = {}
        alert = _alert()
        strategy.record(alert, store)
        assert strategy.is_duplicate(alert, store) is True

    def test_not_duplicate_after_window(self):
        strategy = WindowDeduplicationStrategy(window_seconds=0.01)
        store: dict[str, float] = {}
        alert = _alert()
        strategy.record(alert, store)
        time.sleep(0.02)
        assert strategy.is_duplicate(alert, store) is False


class TestDedupIndex:
    def test_o1_lookup(self):
        index = DedupIndex()
        alert = _alert()
        index.bind(alert, "inc-1")
        assert index.get_incident_id(alert) == "inc-1"

    def test_missing_key_returns_none(self):
        index = DedupIndex()
        assert index.get_incident_id(_alert()) is None


class TestFlappingDetector:
    def test_flapping_threshold(self):
        detector = FlappingDetector(threshold=3, window_seconds=60)
        for _ in range(3):
            assert detector.record("payment-api") is False
        assert detector.record("payment-api") is True
