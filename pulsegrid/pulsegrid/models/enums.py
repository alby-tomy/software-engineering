from enum import StrEnum


class Severity(StrEnum):
    """Alert/incident severity — lower number = higher priority."""

    P1 = "p1"
    P2 = "p2"
    P3 = "p3"
    P4 = "p4"

    @property
    def priority(self) -> int:
        return {"p1": 0, "p2": 1, "p3": 2, "p4": 3}[self.value]


class IncidentStatus(StrEnum):
    TRIGGERED = "triggered"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

    def can_transition_to(self, target: "IncidentStatus") -> bool:
        allowed: dict[IncidentStatus, set[IncidentStatus]] = {
            IncidentStatus.TRIGGERED: {IncidentStatus.ACKNOWLEDGED, IncidentStatus.RESOLVED},
            IncidentStatus.ACKNOWLEDGED: {IncidentStatus.RESOLVED},
            IncidentStatus.RESOLVED: set(),
        }
        return target in allowed[self]


class UserRole(StrEnum):
    VIEWER = "viewer"
    RESPONDER = "responder"
    ADMIN = "admin"
