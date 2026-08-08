# PulseGrid schema (Week 7)

## ER Diagram

```
services ──< incidents ──< incident_timeline
              │
              └──< alerts

users ──< on_call_schedules >── services
```

## Key indexes

- `incidents(service_id, status)` — active incidents per service
- `incidents(severity, created_at DESC)` — priority-sorted lists
- `incidents(dedup_key)` UNIQUE — O(1) dedup lookup
- `incident_timeline(incident_id)` — audit trail per incident

## Sample queries

### MTTR per service (window function)

```sql
SELECT service_id,
       AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) AS avg_mttr_seconds
FROM incidents
WHERE resolved_at IS NOT NULL
GROUP BY service_id;
```

### On-call engineer at timestamp

```sql
SELECT u.username
FROM on_call_schedules o
JOIN users u ON u.id = o.user_id
WHERE o.service_id = $1
  AND $2 BETWEEN o.starts_at AND o.ends_at;
```
