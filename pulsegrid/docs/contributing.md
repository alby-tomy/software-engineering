# PulseGrid Git Workflow

## Branching Strategy

- `main` — always deployable; protected branch
- `feature/*` — short-lived feature branches (1–3 days)
- `hotfix/*` — emergency fixes branched from latest release tag

## Conventional Commits

```
feat(api): add cursor pagination to /v1/incidents
fix(worker): dedup window not evicting expired keys
docs(runbook): add redis failover procedure
ci: add Trivy security scan
```

## PR Workflow

1. Create feature branch from `main`
2. Implement + tests
3. Open PR using template (test plan + rollback plan)
4. CI must pass (lint, mypy, pytest)
5. 1 approval required
6. Squash merge to `main`

## Hotfix Workflow

1. `git checkout -b hotfix/critical-dedup-bug v0.1.0`
2. Fix, test, PR with `hotfix:` prefix
3. Merge to `main` and tag `v0.1.1`
4. Deploy immediately to production
