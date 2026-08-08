#!/usr/bin/env python3
"""RAG eval script — recall@3 gate for CI (Week 22, 24)."""

from pathlib import Path

from pulsegrid.services.ai.rag import RunbookIndex

EVAL_QUERIES = [
    ("redis connection refused cache", "redis-failover"),
    ("postgres too many connections pool", "postgres-connection-pool"),
    ("payment api high error rate", "payment-api-errors"),
]

def main() -> None:
    index = RunbookIndex()
    runbooks_path = Path(__file__).resolve().parents[1] / "docs" / "runbooks"
    count = index.ingest_directory(runbooks_path)
    print(f"Ingested {count} runbooks")

    hits = 0
    for query, expected_file in EVAL_QUERIES:
        results = index.search(query, top_k=3)
        found = any(expected_file in r.source_file for r in results)
        print(f"  query='{query}' → {'HIT' if found else 'MISS'}")
        if found:
            hits += 1

    recall = hits / len(EVAL_QUERIES)
    print(f"Recall@3: {recall:.2f}")
    assert recall >= 0.85, f"RAG recall@3 {recall:.2f} below threshold 0.85"
    print("RAG eval gate: PASSED")


if __name__ == "__main__":
    main()
