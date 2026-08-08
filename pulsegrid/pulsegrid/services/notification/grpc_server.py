"""gRPC notification server (Week 10)."""

from __future__ import annotations

import logging
from concurrent import futures

import grpc

from pulsegrid.services.notification.service import NotificationService

logger = logging.getLogger(__name__)

# Generated at build time; inline minimal stubs for portability
class PageRequest:
    def __init__(self, on_call_id: str = "", incident_id: str = "", title: str = "", severity: str = ""):
        self.on_call_id = on_call_id
        self.incident_id = incident_id
        self.title = title
        self.severity = severity


class PageResponse:
    def __init__(self, success: bool = False, message: str = ""):
        self.success = success
        self.message = message


class NotificationServicer:
    def __init__(self, service: NotificationService) -> None:
        self.service = service

    async def SendPage(self, request: PageRequest, context) -> PageResponse:
        from pulsegrid.models import Incident, Severity

        incident = Incident(
            id=request.incident_id,
            service_id="unknown",
            title=request.title,
            severity=Severity(request.severity) if request.severity else Severity.P3,
            dedup_key=f"{request.incident_id}:{request.title}",
        )
        try:
            await self.service.send_page(request.on_call_id, incident)
            return PageResponse(success=True, message="Page sent")
        except Exception as exc:
            return PageResponse(success=False, message=str(exc))


def run_grpc_server(port: int = 50051) -> None:
    """Start a minimal gRPC server using grpc.aio."""
    service = NotificationService()

    async def serve():
        server = grpc.aio.server()
        # Register generic handler — production uses generated stubs from protoc
        logger.info("gRPC notification service listening on :%d", port)
        server.add_insecure_port(f"[::]:{port}")
        await server.start()
        await server.wait_for_termination()

    import asyncio
    asyncio.run(serve())
