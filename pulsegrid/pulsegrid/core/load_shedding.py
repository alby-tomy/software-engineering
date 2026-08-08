"""Load shedding for alert floods (Week 17)."""

from __future__ import annotations

from pulsegrid.models import Alert, Severity


def should_shed_alert(alert: Alert, queue_depth: int, threshold: int) -> bool:
    """Drop P4 alerts when queue is near capacity; never shed P1-P3."""
    if alert.severity in (Severity.P1, Severity.P2, Severity.P3):
        return False
    return queue_depth >= threshold
