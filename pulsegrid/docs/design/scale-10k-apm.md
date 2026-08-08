# Scale PulseGrid to 10K Alerts/Minute

## Requirements

- 10,000 alerts/min = **167 alerts/sec** sustained
- P1–P3 must not be dropped (< 1% drop rate)
- p95 ingestion latency < 200ms

## Capacity Estimates

| Component | Calculation | Size |
|-----------|-------------|------|
| API pods | 167 req/s ÷ 50 req/s per pod | 4 pods |
| Worker pods | 167 alerts/s ÷ 25 per pod | 8 pods |
| Redis memory | 10k dedup keys × 100B | ~1 MB (negligible) |
| PostgreSQL | 167 writes/s + reads | db.r6g.large + PgBouncer |
| Kafka | 167 msg/s × 1KB | 3 brokers, 6 partitions |

## Architecture

```
[ALB] → 4× API pods → Kafka (alerts.raw)
                          ↓
                    8× Worker pods (consumer group)
                          ↓
              PostgreSQL + Redis + Elasticsearch
```

## Load Shedding

- When queue depth > 800: drop P4 alerts only
- When queue depth > 950: return 503 with Retry-After

## Circuit Breaker

- Notification service: open after 5 failures, 30s recovery
- Fail gracefully — incident still created

## Load Test

```bash
python scripts/load_test.py --rate 167 --duration 600
```

Target: 10 min sustained, < 1% P1–P3 drops, p95 < 200ms.
