"""LLM incident summarization with mock fallback (Week 21)."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from pulsegrid.config import settings
from pulsegrid.core.events import DomainEvent, EventType, TimelineStore
from pulsegrid.models import Incident

logger = logging.getLogger(__name__)


class AIService:
    def __init__(self, timeline: TimelineStore) -> None:
        self.timeline = timeline
        self._cache: dict[str, str] = {}

    def _build_prompt(self, incident: Incident) -> str:
        events = self.timeline.get_timeline(incident.id)
        timeline_text = "\n".join(
            f"- {e.event_type.value}: {e.payload}" for e in events
        ) or "No timeline events yet."
        return (
            f"Incident: {incident.title}\n"
            f"Service: {incident.service_id}\n"
            f"Severity: {incident.severity.value}\n"
            f"Status: {incident.status.value}\n"
            f"Correlated services: {', '.join(incident.correlated_services)}\n"
            f"Timeline:\n{timeline_text}\n"
            "Summarize: what happened, affected services, and suggested next steps."
        )

    async def _call_llm(self, prompt: str) -> str:
        if settings.openai_api_key:
            try:
                import httpx

                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                        json={
                            "model": settings.llm_model,
                            "messages": [{"role": "user", "content": prompt}],
                            "max_tokens": 500,
                        },
                    )
                    resp.raise_for_status()
                    return resp.json()["choices"][0]["message"]["content"]
            except Exception as exc:
                logger.warning("LLM call failed, using fallback: %s", exc)

        return (
            f"[AI Summary — mock mode]\n"
            f"This incident '{prompt.splitlines()[0].replace('Incident: ', '')}' "
            f"affects the listed services. Review correlated dependencies, check recent "
            f"deployments, and follow the suggested runbook. Escalate if MTTR exceeds SLO."
        )

    async def summarize(self, incident: Incident) -> str:
        if incident.id in self._cache:
            return self._cache[incident.id]
        summary = await self._call_llm(self._build_prompt(incident))
        self._cache[incident.id] = summary
        self.timeline.append(
            DomainEvent(
                event_type=EventType.SUMMARY_GENERATED,
                incident_id=incident.id,
                payload={"length": len(summary)},
            )
        )
        return summary

    async def summarize_stream(self, incident: Incident) -> AsyncIterator[str]:
        summary = await self.summarize(incident)
        words = summary.split()
        chunk = ""
        for i, word in enumerate(words):
            chunk += word + " "
            if (i + 1) % 5 == 0 or i == len(words) - 1:
                yield chunk.strip()
                chunk = ""
