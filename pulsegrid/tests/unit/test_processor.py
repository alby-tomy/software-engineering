"""Integration tests for alert processor."""

import pytest

from pulsegrid.core.priority_queue import PriorityAlertQueue
from pulsegrid.core.processor import AlertProcessor
from pulsegrid.models import Alert, Severity
from pulsegrid.services.service_graph import seed_ecommerce_graph


@pytest.mark.asyncio
async def test_duplicate_alerts_single_incident():
    queue = PriorityAlertQueue()
    processor = AlertProcessor(queue=queue, service_graph=seed_ecommerce_graph())
    alert = Alert(service_id="payment-api", title="CPU high", severity=Severity.P1, source="custom")

    inc1 = await processor.process_alert(alert)
    inc2 = await processor.process_alert(alert)

    assert inc1.id == inc2.id
    assert inc2.alert_count == 2
    assert len(processor.incidents) == 1


@pytest.mark.asyncio
async def test_correlation_on_create():
    queue = PriorityAlertQueue()
    processor = AlertProcessor(queue=queue, service_graph=seed_ecommerce_graph())
    alert = Alert(
        service_id="checkout-api", title="Checkout failing", severity=Severity.P1, source="custom"
    )
    incident = await processor.process_alert(alert)
    assert "payment-api" in incident.correlated_services or len(incident.correlated_services) > 0


@pytest.mark.asyncio
async def test_list_incidents_filter():
    queue = PriorityAlertQueue()
    processor = AlertProcessor(queue=queue, service_graph=seed_ecommerce_graph())
    await processor.process_alert(
        Alert(service_id="a", title="t1", severity=Severity.P1, source="custom")
    )
    await processor.process_alert(
        Alert(service_id="b", title="t2", severity=Severity.P4, source="custom")
    )
    p1_only = processor.list_incidents(severity="p1")
    assert len(p1_only) == 1
