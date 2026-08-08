"""Unit tests for domain models (Week 2)."""

import pytest
from pydantic import ValidationError

from pulsegrid.models import Alert, Incident, IncidentStatus, Severity


class TestAlert:
    def test_valid_alert(self):
        alert = Alert(service_id="api", title="CPU high", severity=Severity.P1, source="custom")
        assert alert.severity == Severity.P1
        assert alert.dedup_key == "api:CPU high"

    def test_missing_service_id_rejected(self):
        with pytest.raises(ValidationError):
            Alert(title="x", severity=Severity.P1, source="custom")  # type: ignore[call-arg]

    def test_missing_severity_rejected(self):
        with pytest.raises(ValidationError):
            Alert(service_id="api", title="x", source="custom")  # type: ignore[call-arg]

    def test_blank_title_rejected(self):
        with pytest.raises(ValidationError):
            Alert(service_id="api", title="   ", severity=Severity.P1, source="custom")

    def test_json_roundtrip(self):
        alert = Alert(service_id="api", title="Disk full", severity=Severity.P2, source="prometheus")
        restored = Alert.model_validate_json(alert.model_dump_json())
        assert restored.title == alert.title
        assert restored.severity == alert.severity


class TestIncident:
    def test_default_status_triggered(self):
        inc = Incident(
            service_id="api", title="Outage", severity=Severity.P1, dedup_key="api:Outage"
        )
        assert inc.status == IncidentStatus.TRIGGERED

    def test_acknowledge_transition(self):
        inc = Incident(
            service_id="api", title="Outage", severity=Severity.P1, dedup_key="api:Outage"
        )
        inc.acknowledge()
        assert inc.status == IncidentStatus.ACKNOWLEDGED
        assert inc.acknowledged_at is not None

    def test_resolve_from_triggered(self):
        inc = Incident(
            service_id="api", title="Outage", severity=Severity.P1, dedup_key="api:Outage"
        )
        inc.resolve()
        assert inc.status == IncidentStatus.RESOLVED
        assert inc.resolved_at is not None

    def test_cannot_resolve_twice(self):
        inc = Incident(
            service_id="api", title="Outage", severity=Severity.P1, dedup_key="api:Outage"
        )
        inc.resolve()
        with pytest.raises(ValueError):
            inc.acknowledge()

    def test_cannot_skip_acknowledge_on_direct_resolve_path(self):
        inc = Incident(
            service_id="api", title="Outage", severity=Severity.P1, dedup_key="api:Outage"
        )
        inc.acknowledge()
        with pytest.raises(ValueError):
            inc.transition_to(IncidentStatus.TRIGGERED)

    def test_severity_priority_order(self):
        assert Severity.P1.priority < Severity.P4.priority


class TestSeverity:
    def test_all_values(self):
        assert set(Severity) == {Severity.P1, Severity.P2, Severity.P3, Severity.P4}

    def test_invalid_severity(self):
        with pytest.raises(ValueError):
            Severity("p5")
