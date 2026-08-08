"""Tests for service dependency graph (Week 6)."""

from pulsegrid.services.service_graph import ServiceGraph, seed_ecommerce_graph


class TestServiceGraph:
    def test_upstream_root_cause(self):
        g = seed_ecommerce_graph()
        causes = g.find_upstream_root_causes("payment-api")
        assert "postgres-primary" in causes

    def test_blast_radius(self):
        g = seed_ecommerce_graph()
        affected = g.get_blast_radius("postgres-primary")
        assert "payment-api" in affected
        assert "billing-api" in affected

    def test_leaf_service_no_upstream(self):
        g = ServiceGraph()
        g.add_service("standalone")
        assert g.find_upstream_root_causes("standalone") == []

    def test_cycle_detection(self):
        g = ServiceGraph()
        g.add_dependency("a", "b")
        g.add_dependency("b", "c")
        g.add_dependency("c", "a")
        cycles = g.detect_cycles()
        assert len(cycles) >= 1

    def test_ecommerce_has_ten_services(self):
        g = seed_ecommerce_graph()
        assert len(g._upstream) >= 10
