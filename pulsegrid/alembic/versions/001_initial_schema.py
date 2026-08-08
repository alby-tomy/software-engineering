"""Initial PulseGrid schema (Week 7).

Revision ID: 001
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "services",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("team_id", sa.String(64), server_default="default"),
        sa.Column("tier", sa.String(32), server_default="standard"),
        sa.Column("description", sa.Text(), server_default=""),
    )
    op.create_table(
        "incidents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("service_id", sa.String(64), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(4), nullable=False),
        sa.Column("status", sa.String(20), server_default="triggered", nullable=False),
        sa.Column("dedup_key", sa.String(512), unique=True),
        sa.Column("alert_count", sa.Integer(), server_default="1"),
        sa.Column("correlated_services", sa.Text(), server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True)),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
    )
    op.create_index("idx_incidents_service_status", "incidents", ["service_id", "status"])
    op.create_index("idx_incidents_severity_created", "incidents", ["severity", "created_at"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("service_id", sa.String(64), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(4), nullable=False),
        sa.Column("source", sa.String(64), nullable=False),
        sa.Column("incident_id", sa.String(36), sa.ForeignKey("incidents.id")),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("username", sa.String(64), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("role", sa.String(20), server_default="viewer"),
        sa.Column("hashed_password", sa.String(255), nullable=False),
    )

    op.create_table(
        "on_call_schedules",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("service_id", sa.String(64), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("on_call_schedules")
    op.drop_table("users")
    op.drop_table("alerts")
    op.drop_index("idx_incidents_severity_created", "incidents")
    op.drop_index("idx_incidents_service_status", "incidents")
    op.drop_table("incidents")
    op.drop_table("services")
