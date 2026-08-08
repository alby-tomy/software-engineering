"""ReAct incident response agent (Week 23)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from pulsegrid.core.processor import AlertProcessor
from pulsegrid.models import Incident
from pulsegrid.services.ai.rag import RunbookIndex
from pulsegrid.services.service_graph import ServiceGraph

logger = logging.getLogger(__name__)


@dataclass
class AgentStep:
    thought: str
    action: str
    action_input: dict[str, Any]
    observation: str


@dataclass
class AgentTrace:
    query: str
    steps: list[AgentStep] = field(default_factory=list)
    final_answer: str = ""


class IncidentAgent:
    MAX_STEPS = 10

    def __init__(
        self,
        processor: AlertProcessor,
        service_graph: ServiceGraph,
        runbooks: RunbookIndex,
    ) -> None:
        self.processor = processor
        self.service_graph = service_graph
        self.runbooks = runbooks
        self.traces: list[AgentTrace] = []

    def _tool_search_incidents(self, query: str) -> str:
        results = [
            i for i in self.processor.list_incidents()
            if query.lower() in i.title.lower() or query.lower() in i.service_id.lower()
        ]
        return str([{"id": i.id, "title": i.title, "severity": i.severity.value} for i in results[:5]])

    def _tool_get_service_health(self, service_id: str) -> str:
        active = [
            i for i in self.processor.list_incidents(service_id=service_id)
            if i.status.value != "resolved"
        ]
        status = "degraded" if active else "healthy"
        blast = self.service_graph.get_blast_radius(service_id)
        return f"service={service_id} status={status} active_incidents={len(active)} blast_radius={blast}"

    def _tool_search_runbooks(self, query: str) -> str:
        chunks = self.runbooks.search(query, top_k=3)
        return str([{"title": c.title, "excerpt": c.content[:200]} for c in chunks])

    def _tool_get_on_call(self, service_id: str) -> str:
        return f"on_call=engineer-{service_id}@pulsegrid.local"

    def _tool_add_timeline_comment(self, incident_id: str, comment: str) -> str:
        return f"comment_added to {incident_id}: {comment[:100]}"

    TOOLS = {
        "search_incidents": "_tool_search_incidents",
        "get_service_health": "_tool_get_service_health",
        "search_runbooks": "_tool_search_runbooks",
        "get_on_call": "_tool_get_on_call",
        "add_timeline_comment": "_tool_add_timeline_comment",
    }

    async def run(self, query: str) -> AgentTrace:
        trace = AgentTrace(query=query)
        context = query

        for step_num in range(self.MAX_STEPS):
            # Simplified ReAct: deterministic tool selection based on query keywords
            if "runbook" in query.lower() or "how" in query.lower():
                action, action_input = "search_runbooks", {"query": query}
            elif "health" in query.lower() or "status" in query.lower():
                service = self._extract_service(query)
                action, action_input = "get_service_health", {"service_id": service}
            elif "similar" in query.lower() or "past" in query.lower():
                action, action_input = "search_incidents", {"query": query}
            elif step_num == 0:
                service = self._extract_service(query)
                action, action_input = "get_service_health", {"service_id": service}
            else:
                break

            method = getattr(self, self.TOOLS[action])
            observation = method(**action_input) if action != "search_incidents" else method(action_input["query"])
            trace.steps.append(
                AgentStep(
                    thought=f"Step {step_num + 1}: need {action}",
                    action=action,
                    action_input=action_input,
                    observation=observation,
                )
            )
            context += f"\n{observation}"

        trace.final_answer = self._synthesize(query, trace.steps)
        self.traces.append(trace)
        return trace

    def _extract_service(self, query: str) -> str:
        for word in query.replace("?", "").split():
            if "-api" in word or "postgres" in word or "redis" in word:
                return word.strip(".,!")
        return "payment-api"

    def _synthesize(self, query: str, steps: list[AgentStep]) -> str:
        if not steps:
            return "I could not find relevant information. Try asking about a specific service."
        observations = " ".join(s.observation for s in steps)
        return (
            f"Based on my investigation for '{query}':\n"
            f"{observations}\n\n"
            "Recommended: check correlated services, review suggested runbooks, "
            "and acknowledge the incident once you've started triage. "
            "I cannot resolve incidents or page on-call without your approval."
        )
