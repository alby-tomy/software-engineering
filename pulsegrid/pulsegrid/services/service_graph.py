"""Service dependency graph with BFS correlation (Week 6)."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field


@dataclass
class ServiceGraph:
    """Directed graph: service → dependencies (upstream services it relies on)."""

    _upstream: dict[str, set[str]] = field(default_factory=dict)
    _downstream: dict[str, set[str]] = field(default_factory=dict)

    def add_service(self, service_id: str) -> None:
        self._upstream.setdefault(service_id, set())
        self._downstream.setdefault(service_id, set())

    def add_dependency(self, service_id: str, depends_on: str) -> None:
        """service_id depends on depends_on (upstream)."""
        self.add_service(service_id)
        self.add_service(depends_on)
        self._upstream[service_id].add(depends_on)
        self._downstream[depends_on].add(service_id)

    def get_upstream(self, service_id: str) -> set[str]:
        return self._upstream.get(service_id, set()).copy()

    def get_downstream(self, service_id: str) -> set[str]:
        return self._downstream.get(service_id, set()).copy()

    def find_upstream_root_causes(self, service_id: str, max_depth: int = 5) -> list[str]:
        """BFS upstream to find potential root cause services."""
        if service_id not in self._upstream:
            return []
        visited: set[str] = set()
        queue: deque[tuple[str, int]] = deque()
        roots: list[str] = []

        for dep in self._upstream.get(service_id, set()):
            queue.append((dep, 1))

        while queue:
            current, depth = queue.popleft()
            if current in visited or depth > max_depth:
                continue
            visited.add(current)
            upstream = self._upstream.get(current, set())
            if not upstream:
                roots.append(current)
            else:
                for dep in upstream:
                    queue.append((dep, depth + 1))

        return roots

    def get_blast_radius(self, service_id: str) -> list[str]:
        """BFS downstream — all services impacted if this one fails."""
        if service_id not in self._downstream:
            return []
        visited: set[str] = set()
        queue: deque[str] = deque(self._downstream.get(service_id, set()))
        affected: list[str] = []

        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            affected.append(current)
            queue.extend(self._downstream.get(current, set()))

        return affected

    def detect_cycles(self) -> list[list[str]]:
        """Detect circular dependencies via DFS."""
        cycles: list[list[str]] = []
        visited: set[str] = set()
        stack: set[str] = set()
        path: list[str] = []

        def dfs(node: str) -> None:
            visited.add(node)
            stack.add(node)
            path.append(node)
            for neighbor in self._upstream.get(node, set()):
                if neighbor not in visited:
                    dfs(neighbor)
                elif neighbor in stack:
                    idx = path.index(neighbor)
                    cycles.append(path[idx:] + [neighbor])
            path.pop()
            stack.remove(node)

        for service in self._upstream:
            if service not in visited:
                dfs(service)
        return cycles


def seed_ecommerce_graph() -> ServiceGraph:
    """10-service e-commerce stack for learning and tests."""
    g = ServiceGraph()
    services = [
        "checkout-api",
        "payment-api",
        "billing-api",
        "notifications-api",
        "catalog-api",
        "search-api",
        "postgres-primary",
        "redis-cache",
        "kafka-broker",
        "cdn-edge",
    ]
    for s in services:
        g.add_service(s)

    deps = [
        ("checkout-api", "payment-api"),
        ("checkout-api", "catalog-api"),
        ("payment-api", "postgres-primary"),
        ("payment-api", "kafka-broker"),
        ("billing-api", "postgres-primary"),
        ("billing-api", "payment-api"),
        ("notifications-api", "kafka-broker"),
        ("catalog-api", "postgres-primary"),
        ("catalog-api", "redis-cache"),
        ("search-api", "postgres-primary"),
        ("search-api", "kafka-broker"),
        ("cdn-edge", "catalog-api"),
    ]
    for service, depends_on in deps:
        g.add_dependency(service, depends_on)
    return g
