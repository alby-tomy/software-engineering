# PostgreSQL Connection Pool Exhaustion

## Symptoms
- API returns 503 on `/ready` with database error
- `too many connections` in PostgreSQL logs
- Worker pods crash-looping

## Diagnosis
1. Check connection count: `SELECT count(*) FROM pg_stat_activity;`
2. Review pool settings in `PULSEGRID_DATABASE_URL`
3. Check for connection leaks in long-running workers

## Resolution
1. Deploy PgBouncer in transaction pooling mode
2. Reduce per-pod pool size from 20 to 5
3. Restart worker pods to release leaked connections
4. Scale API horizontally only after pool is right-sized

## Prevention
- Use PgBouncer from day one in production
- Set `pool_size` = `(max_connections - 10) / num_pods`
