# PulseGrid Domain Model

## Entities

### Service

A monitored production service (e.g. `payment-api`, `postgres-primary`).

- `id`, `name`, `team_id`, `tier` (critical/standard)
- Participates in dependency graph (upstream/downstream)

### Alert

Raw signal from monitoring (Prometheus, Datadog, custom webhook).

- `service_id`, `title`, `severity` (P1–P4), `source`, `received_at`
- Ephemeral until deduplicated into an incident

### Incident

Grouped, actionable outage record created from one or more alerts.

- Lifecycle: `triggered` → `acknowledged` → `resolved`
- `dedup_key` = `service_id:title` for O(1) lookup
- `correlated_services` from dependency graph BFS

### User

On-call engineer or admin.

- Roles: `viewer`, `responder`, `admin`

### OnCallSchedule

Who is paged for a service at a given time.

### Runbook

Procedural steps for incident resolution (RAG corpus in Month 6).

## Relationships

```
Service 1──* Alert
Service 1──* Incident
Service *──* Service  (dependency graph)
User 1──* OnCallSchedule
Incident 1──* TimelineEvent
```

## Alert → Incident Lifecycle

1. Webhook receives alert → validate → enqueue (202)
2. Worker dequeues by priority (P1 first)
3. Dedup check: same `service_id:title` within 5 min → update existing incident
4. New alert → create incident, correlate via service graph BFS
5. Status transitions recorded in `incident_timeline`
6. Cache invalidated on status change

## Severity

| Level | Meaning | Page? |
|-------|---------|-------|
| P1 | Critical outage | Immediately |
| P2 | Major degradation | Yes |
| P3 | Minor issue | Business hours |
| P4 | Informational | Ticket only |
