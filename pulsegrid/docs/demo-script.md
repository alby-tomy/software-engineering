# PulseGrid Demo Script (5 minutes)

## Setup
1. `docker compose up -d && uvicorn pulsegrid.api.main:app --reload`
2. Open dashboard at http://localhost:5173

## Demo Flow

### 1. Ingest alert (30s)
```bash
curl -X POST http://localhost:8000/webhooks/alerts/sync \
  -H "Content-Type: application/json" \
  -d '{"service_id":"payment-api","title":"High error rate","severity":"p1","source":"custom"}'
```

### 2. Show incident in dashboard (30s)
- Point out severity badge, correlated services, real-time WebSocket update

### 3. AI summary (60s)
```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" \
  -X POST http://localhost:8000/ai/incidents/{id}/summarize
```

### 4. RAG runbook suggestion (45s)
- Show suggested runbooks card for payment-api incident

### 5. Agent assist (60s)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What should I do about payment-api P1?"}' \
  http://localhost:8000/ai/agent
```

### 6. Acknowledge & resolve (30s)
- Click acknowledge → resolve in dashboard
- Show timeline and auto-generated postmortem

### 7. Status page (30s)
- Open http://localhost:3000/status/default

## Interview Talking Points
- Why monolith-first? Why event-driven later?
- How dedup prevents alert fatigue
- AI safety: human-in-the-loop, eval gates, fallbacks
