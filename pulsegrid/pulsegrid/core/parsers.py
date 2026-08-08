"""Alert source parsers — Factory pattern (Week 4)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pulsegrid.models import Alert, Severity


class AlertParser(ABC):
    @abstractmethod
    def parse(self, payload: dict[str, Any]) -> Alert:
        ...


class CustomAlertParser(AlertParser):
    def parse(self, payload: dict[str, Any]) -> Alert:
        return Alert(
            service_id=payload["service_id"],
            title=payload["title"],
            severity=Severity(payload["severity"]),
            source=payload.get("source", "custom"),
            labels=payload.get("labels", {}),
        )


class PrometheusAlertParser(AlertParser):
    def parse(self, payload: dict[str, Any]) -> Alert:
        alerts = payload.get("alerts", [payload])
        first = alerts[0]
        labels = first.get("labels", {})
        annotations = first.get("annotations", {})
        severity_raw = labels.get("severity", "p3").lower()
        try:
            severity = Severity(severity_raw)
        except ValueError:
            severity = Severity.P3
        return Alert(
            service_id=labels.get("service", labels.get("job", "unknown")),
            title=annotations.get("summary", annotations.get("description", "Prometheus alert")),
            severity=severity,
            source="prometheus",
            labels=labels,
        )


class DatadogAlertParser(AlertParser):
    def parse(self, payload: dict[str, Any]) -> Alert:
        title = payload.get("title", payload.get("body", "Datadog alert"))
        service = payload.get("tags", ["service:unknown"])[0].replace("service:", "")
        priority = payload.get("priority", "normal")
        severity_map = {"normal": Severity.P3, "low": Severity.P4, "high": Severity.P2}
        return Alert(
            service_id=service,
            title=title,
            severity=severity_map.get(priority, Severity.P3),
            source="datadog",
            labels={"event_id": str(payload.get("id", ""))},
        )


class AlertParserFactory:
    _parsers: dict[str, AlertParser] = {
        "custom": CustomAlertParser(),
        "prometheus": PrometheusAlertParser(),
        "datadog": DatadogAlertParser(),
    }

    @classmethod
    def get_parser(cls, source: str) -> AlertParser:
        parser = cls._parsers.get(source)
        if parser is None:
            return cls._parsers["custom"]
        return parser

    @classmethod
    def parse(cls, source: str, payload: dict[str, Any]) -> Alert:
        return cls.get_parser(source).parse(payload)
