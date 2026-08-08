from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

from pulsegrid.models.enums import IncidentStatus, Severity, UserRole


class Alert(BaseModel):
    """Incoming alert from a monitoring source."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    service_id: str
    title: str = Field(min_length=1, max_length=500)
    severity: Severity
    source: str = Field(min_length=1)
    received_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    labels: dict[str, str] = Field(default_factory=dict)

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title cannot be blank")
        return v.strip()

    @property
    def dedup_key(self) -> str:
        return f"{self.service_id}:{self.title}"


class Incident(BaseModel):
    """Actionable incident created from correlated alerts."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    service_id: str
    title: str
    severity: Severity
    status: IncidentStatus = IncidentStatus.TRIGGERED
    dedup_key: str
    alert_count: int = 1
    correlated_services: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None

    def transition_to(self, new_status: IncidentStatus) -> None:
        if not self.status.can_transition_to(new_status):
            raise ValueError(
                f"Cannot transition from {self.status.value} to {new_status.value}"
            )
        self.status = new_status
        now = datetime.now(UTC)
        if new_status == IncidentStatus.ACKNOWLEDGED:
            self.acknowledged_at = now
        elif new_status == IncidentStatus.RESOLVED:
            self.resolved_at = now

    def acknowledge(self) -> None:
        self.transition_to(IncidentStatus.ACKNOWLEDGED)

    def resolve(self) -> None:
        if self.status == IncidentStatus.TRIGGERED:
            self.acknowledge()
        self.transition_to(IncidentStatus.RESOLVED)


class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    team_id: str = "default"
    tier: str = "standard"
    description: str = ""


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    username: str
    email: str
    role: UserRole = UserRole.VIEWER
    hashed_password: str = ""


class TimelineEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    incident_id: str
    event_type: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
