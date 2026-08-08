"""Tests for priority queue (Week 5)."""

import asyncio

import pytest

from pulsegrid.core.priority_queue import PriorityAlertQueue
from pulsegrid.models import Alert, Severity


def _alert(severity: Severity, title: str = "alert") -> Alert:
    return Alert(service_id="api", title=title, severity=severity, source="custom")


@pytest.mark.asyncio
async def test_p1_processed_before_p4():
    queue = PriorityAlertQueue(maxsize=100)
    p4 = _alert(Severity.P4, "low")
    p1 = _alert(Severity.P1, "critical")

    await queue.enqueue(p4)
    await queue.enqueue(p1)

    first = await asyncio.wait_for(queue.dequeue(), timeout=1.0)
    assert first.severity == Severity.P1


@pytest.mark.asyncio
async def test_queue_full_returns_false():
    queue = PriorityAlertQueue(maxsize=2)
    assert await queue.enqueue(_alert(Severity.P2, "a")) is True
    assert await queue.enqueue(_alert(Severity.P2, "b")) is True
    assert await queue.enqueue(_alert(Severity.P2, "c")) is False


@pytest.mark.asyncio
async def test_near_capacity():
    queue = PriorityAlertQueue(maxsize=10)
    for i in range(9):
        await queue.enqueue(_alert(Severity.P3, f"a{i}"))
    assert queue.is_near_capacity is True
