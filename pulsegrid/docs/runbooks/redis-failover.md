# Redis Failover Runbook

## Symptoms
- `connection refused` errors to Redis
- Cache miss rate spikes to 100%
- API latency increases on GET /incidents

## Diagnosis
1. Check Redis health: `redis-cli ping`
2. Check active incidents cache key: `redis-cli keys 'active_incidents:*'`
3. Review recent deployments to catalog-api (depends on redis-cache)

## Resolution
1. Fail over to Redis replica: `redis-cli -h replica.internal ping`
2. Update `PULSEGRID_REDIS_URL` in API deployment
3. Invalidate stale cache: `redis-cli flushdb` (staging only)
4. Verify API `/ready` returns redis: ok

## Prevention
- Enable Redis Sentinel for automatic failover
- Set cache TTL to 30s to limit stale data window
