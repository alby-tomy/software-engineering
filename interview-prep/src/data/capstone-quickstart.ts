/** Embedded quick-start guide — full commands on the website, not just repo references. */

export const capstoneQuickStartGuide = `
## Quick Start — Run PulseGrid Locally

### Prerequisites

- Python 3.12+
- Docker & Docker Compose
- Node.js 20+ (for dashboards, weeks 11–12)

### 1. Clone and install

\`\`\`bash
git clone https://github.com/alby-tomy/software-engineering.git
cd software-engineering/pulsegrid
pip install -e ".[dev]"
\`\`\`

### 2. Start the full stack (PostgreSQL + Redis + API + Worker)

\`\`\`bash
docker compose up --build
\`\`\`

Verify the API is healthy:

\`\`\`bash
curl http://localhost:8000/health
# {"status":"ok"}

curl http://localhost:8000/ready
# {"status":"ready","checks":{"redis":"ok"}}
\`\`\`

### 3. Run the test suite (51 tests)

\`\`\`bash
pytest -v
# All tests should pass — verifies weeks 1–24 implementation

python scripts/eval_rag.py
# recall@3 >= 0.85 — AI quality gate
\`\`\`

### 4. Ingest your first alert

\`\`\`bash
curl -X POST http://localhost:8000/webhooks/alerts/sync \\
  -H "Content-Type: application/json" \\
  -d '{
    "service_id": "payment-api",
    "title": "High error rate on checkout",
    "severity": "p1",
    "source": "custom"
  }'
\`\`\`

### 5. Authenticate and list incidents

\`\`\`bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/incidents | python3 -m json.tool
\`\`\`

### 6. Open interactive API docs

Visit [http://localhost:8000/docs](http://localhost:8000/docs) — Swagger UI for every endpoint.

### 7. React dashboard (Week 11+)

\`\`\`bash
cd dashboard
npm install && npm run dev
# http://localhost:5173
\`\`\`

### 8. Next.js dashboard (Week 12+)

\`\`\`bash
cd dashboard-next
npm install && npm run dev
# http://localhost:3000/incidents
\`\`\`

### Development without Docker

Run API and worker separately against local PostgreSQL/Redis:

\`\`\`bash
export PULSEGRID_DATABASE_URL=postgresql+asyncpg://pulsegrid:pulsegrid@localhost:5432/pulsegrid
export PULSEGRID_REDIS_URL=redis://localhost:6379/0

alembic upgrade head
uvicorn pulsegrid.api.main:app --reload
# separate terminal:
python -m pulsegrid.worker.runner
\`\`\`
`;
