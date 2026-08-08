"""Tests for alert parsers (Week 4)."""

from pulsegrid.core.parsers import AlertParserFactory
from pulsegrid.models import Severity


class TestAlertParserFactory:
    def test_custom_parser(self):
        alert = AlertParserFactory.parse(
            "custom",
            {"service_id": "api", "title": "Error", "severity": "p2"},
        )
        assert alert.service_id == "api"
        assert alert.severity == Severity.P2

    def test_prometheus_parser(self):
        payload = {
            "alerts": [
                {
                    "labels": {"service": "payment-api", "severity": "p1"},
                    "annotations": {"summary": "High latency"},
                }
            ]
        }
        alert = AlertParserFactory.parse("prometheus", payload)
        assert alert.service_id == "payment-api"
        assert alert.severity == Severity.P1
        assert alert.source == "prometheus"

    def test_datadog_parser(self):
        alert = AlertParserFactory.parse(
            "datadog",
            {"title": "CPU spike", "tags": ["service:billing-api"], "priority": "high"},
        )
        assert alert.service_id == "billing-api"
        assert alert.severity == Severity.P2

    def test_unknown_source_falls_back_to_custom(self):
        alert = AlertParserFactory.parse(
            "unknown",
            {"service_id": "x", "title": "y", "severity": "p3"},
        )
        assert alert.service_id == "x"
