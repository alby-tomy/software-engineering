"""Event bus abstraction — in-memory default, Kafka optional (Week 19)."""

from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from collections import defaultdict
from collections.abc import Awaitable, Callable

from pulsegrid.core.events import DomainEvent

logger = logging.getLogger(__name__)

EventHandler = Callable[[DomainEvent], Awaitable[None]]


class EventBus(ABC):
    @abstractmethod
    async def publish(self, topic: str, event: DomainEvent) -> None:
        ...

    @abstractmethod
    def subscribe(self, topic: str, handler: EventHandler) -> None:
        ...


class InMemoryEventBus(EventBus):
    """Local dev event bus — same interface as Kafka."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)

    def subscribe(self, topic: str, handler: EventHandler) -> None:
        self._handlers[topic].append(handler)

    async def publish(self, topic: str, event: DomainEvent) -> None:
        logger.info("Publishing %s to %s", event.event_type, topic)
        for handler in self._handlers.get(topic, []):
            await handler(event)


class KafkaEventBus(EventBus):
    """Kafka adapter — activated when PULSEGRID_USE_KAFKA=true."""

    def __init__(self, bootstrap: str) -> None:
        self.bootstrap = bootstrap
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)
        self._producer = None

    def subscribe(self, topic: str, handler: EventHandler) -> None:
        self._handlers[topic].append(handler)

    async def publish(self, topic: str, event: DomainEvent) -> None:
        # Fallback to in-process handlers when Kafka not configured
        for handler in self._handlers.get(topic, []):
            await handler(event)

    async def start_consumer(self, topic: str) -> None:
        try:
            from aiokafka import AIOKafkaConsumer

            consumer = AIOKafkaConsumer(
                topic,
                bootstrap_servers=self.bootstrap,
                group_id="pulsegrid",
            )
            await consumer.start()
            async for msg in consumer:
                import json

                data = json.loads(msg.value.decode())
                event = DomainEvent.model_validate(data)
                for handler in self._handlers.get(topic, []):
                    await handler(event)
        except Exception as exc:
            logger.warning("Kafka consumer unavailable: %s", exc)


def create_event_bus(use_kafka: bool, bootstrap: str) -> EventBus:
    if use_kafka:
        return KafkaEventBus(bootstrap)
    return InMemoryEventBus()
