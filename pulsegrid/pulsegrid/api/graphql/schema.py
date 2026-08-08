"""GraphQL API for dashboard queries (Week 10)."""

from __future__ import annotations

from typing import Annotated

import strawberry
from fastapi import Depends, Request
from strawberry.fastapi import GraphQLRouter

from pulsegrid.api.auth import get_current_user
from pulsegrid.api.dependencies import get_app_state
from pulsegrid.core.events import DomainEvent
from pulsegrid.models import Incident, User


@strawberry.type
class TimelineEventGQL:
    event_type: str
    message: str
    created_at: str


@strawberry.type
class IncidentGQL:
    id: str
    service_id: str
    title: str
    severity: str
    status: str
    alert_count: int
    correlated_services: list[str]

    @strawberry.field
    def timeline(self, info: strawberry.Info) -> list[TimelineEventGQL]:
        state = info.context["state"]
        events = state.timeline.get_timeline(self.id)
        return [
            TimelineEventGQL(
                event_type=e.event_type.value,
                message=str(e.payload),
                created_at=e.created_at.isoformat(),
            )
            for e in events
        ]


def _to_gql(incident: Incident) -> IncidentGQL:
    return IncidentGQL(
        id=incident.id,
        service_id=incident.service_id,
        title=incident.title,
        severity=incident.severity.value,
        status=incident.status.value,
        alert_count=incident.alert_count,
        correlated_services=incident.correlated_services,
    )


@strawberry.type
class Query:
    @strawberry.field
    def incidents(
        self,
        info: strawberry.Info,
        status: str | None = None,
        severity: str | None = None,
    ) -> list[IncidentGQL]:
        processor = info.context["processor"]
        return [_to_gql(i) for i in processor.list_incidents(status=status, severity=severity)]

    @strawberry.field
    def incident(self, info: strawberry.Info, id: str) -> IncidentGQL | None:
        processor = info.context["processor"]
        inc = processor.get_incident(id)
        return _to_gql(inc) if inc else None


async def get_context(request: Request) -> dict:
    state = get_app_state(request)
    if state.processor is None:
        state.init_processor()
    return {"request": request, "state": state, "processor": state.processor}


def create_graphql_router() -> GraphQLRouter:
    schema = strawberry.Schema(query=Query)
    return GraphQLRouter(schema, context_getter=get_context)
