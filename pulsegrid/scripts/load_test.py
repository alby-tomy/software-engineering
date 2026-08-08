#!/usr/bin/env python3
"""Load test script for PulseGrid (Week 17, 20)."""

from __future__ import annotations

import argparse
import asyncio
import time

import httpx


async def send_alert(client: httpx.AsyncClient, i: int) -> tuple[int, float]:
    start = time.perf_counter()
    resp = await client.post(
        "/webhooks/alerts/sync",
        json={
            "service_id": f"service-{i % 10}",
            "title": f"Load test alert {i}",
            "severity": "p3",
            "source": "custom",
        },
    )
    elapsed = (time.perf_counter() - start) * 1000
    return resp.status_code, elapsed


async def run(rate: int, duration: int) -> None:
    total_sent = 0
    errors = 0
    latencies: list[float] = []
    start = time.time()

    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=10) as client:
        while time.time() - start < duration:
            batch_start = time.time()
            tasks = [send_alert(client, total_sent + j) for j in range(rate)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, Exception):
                    errors += 1
                else:
                    status, latency = r
                    latencies.append(latency)
                    if status >= 400:
                        errors += 1
            total_sent += rate
            elapsed = time.time() - batch_start
            if elapsed < 1.0:
                await asyncio.sleep(1.0 - elapsed)

    p95 = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0
    print(f"Sent: {total_sent}, Errors: {errors}, Error rate: {errors/total_sent*100:.2f}%")
    print(f"p95 latency: {p95:.1f}ms")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rate", type=int, default=50, help="Requests per second")
    parser.add_argument("--duration", type=int, default=60, help="Duration in seconds")
    args = parser.parse_args()
    asyncio.run(run(args.rate, args.duration))
