import { buildLesson } from '../content-format';

export const devopsLessons: Record<string, string> = {
  'git:fundamentals': buildLesson({
    intro:
      'Git is the foundation of every software team. Before branching strategies and rebasing, you need a clear mental model of what commits, trees, and the staging area actually are.',
    dialogues: [
      {
        q: 'How does Git store files — does it save diffs like older version control?',
        a: `No. Git stores **snapshots**, not diffs. Each commit points to a **tree** object that lists every file (as blob objects) at that moment in time. If a file didn't change between commits, Git reuses the same blob — efficient storage without diff math.

The commit graph is a **DAG** (directed acyclic graph): each commit has one or more parents. Branches are just movable pointers (refs) to commits. \`main\` points to the latest commit on the main line; \`feature/auth\` points to your feature work.

**Three areas to understand:**
1. **Working directory** — files you edit
2. **Staging area (index)** — what \`git add\` puts in the next commit
3. **Repository** — committed history in \`.git/\`

Interview tip: "Git is a content-addressable filesystem with a VCS user interface on top."`,
      },
      {
        q: 'What is the staging area and why not commit directly from the working directory?',
        a: `The **staging area** lets you craft exactly what goes into a commit. You might fix a bug and refactor nearby code in the same file — but you want two separate commits with clear messages.

\`\`\`bash
git add -p file.py    # stage hunks interactively
git commit -m "fix: handle null user in login"
git add file.py       # stage the refactor
git commit -m "refactor: extract validate_user helper"
\`\`\`

Without staging, every commit would include all unstaged changes — messy history. Staging is how you build **atomic commits**: one logical change per commit, easy to review, revert, and bisect.`,
      },
      {
        q: 'What should never be committed to git?',
        a: `**Secrets** — \`.env\`, API keys, database passwords, private keys, JWT secrets. Use \`.gitignore\` and environment variables. Scan repos with trufflehog or git-secrets in CI.

**Generated artifacts** — \`node_modules/\`, \`__pycache__/\`, \`dist/\`, \`.next/\`, compiled binaries. Rebuild from source.

**Large binaries** — use Git LFS for images/models, or store in object storage.

**IDE-specific with secrets** — some IDE configs embed tokens.

If you accidentally commit a secret: rotate it immediately, then use \`git filter-repo\` or BFG to purge from history — don't just delete in a new commit (history still has it).`,
      },
    ],
    takeaways: [
      'Git stores snapshots (trees + blobs), not diffs',
      'Staging area enables atomic, reviewable commits',
      'Never commit secrets — use .gitignore and scan in CI',
    ],
  }),

  'git:collaboration': buildLesson({
    intro:
      'Professional development is collaborative. Remotes, pull requests, and code review are how teams ship safely — Git is the plumbing underneath.',
    dialogues: [
      {
        q: 'What is the difference between git fetch, git pull, and git push?',
        a: `\`git fetch\` downloads new commits from remote but **does not merge** — safe to run anytime. Updates remote-tracking branches like \`origin/main\`.

\`git pull\` = \`git fetch\` + merge (or rebase if configured). Updates your current branch with remote changes. Can cause merge conflicts if you have local commits.

\`git push\` uploads your local commits to remote. Fails if remote has commits you don't have — pull first, resolve conflicts, then push.

**Best practice:** \`git fetch\` frequently to see what teammates merged. Rebase your feature branch on \`origin/main\` before opening PR.`,
      },
      {
        q: 'What makes a good pull request?',
        a: `**Size:** Small PRs (< 400 lines changed) get faster, better reviews. Split large features into stacked PRs.

**Description:** What problem does this solve? How to test? Screenshots for UI. Link to ticket/issue.

**Commits:** Clean history — squash WIP commits before merge if your team uses squash-merge.

**Tests:** CI must pass. Add tests for new behavior.

**Self-review:** Read your own diff before requesting review — catch debug logs, TODOs, formatting.

**Review etiquette:** Be kind, ask questions ("Could we extract this?"), distinguish blocking vs nitpick comments.`,
      },
    ],
    takeaways: [
      'fetch downloads; pull fetches + merges; push uploads',
      'Small PRs with clear descriptions get better reviews',
      'Self-review your diff before requesting teammates',
    ],
  }),

  'git:workflows': buildLesson({
    intro:
      'Branching strategy shapes how fast your team ships and how painful merges become. Trunk-based development is the modern default; Gitflow still appears in interviews.',
    dialogues: [
      {
        q: 'Explain trunk-based development vs Gitflow.',
        a: `**Trunk-based (recommended):**
- Everyone commits to short-lived branches (< 2 days)
- Frequent merges to \`main\`
- \`main\` is always deployable
- Incomplete features hidden behind **feature flags**
- CI runs on every PR

**Gitflow (legacy):**
- \`main\` = production, \`develop\` = integration branch
- Feature branches merge to develop
- Release branches cut from develop, merge to main AND develop
- Hotfix branches from main

Gitflow adds ceremony. It made sense when releases were quarterly. With continuous delivery, trunk-based wins — less merge debt, faster feedback.

**Interview answer:** "We use trunk-based with feature flags. Short-lived branches, PR reviews, CI gates. Main deploys to staging automatically; production is promoted after smoke tests."`,
      },
      {
        q: 'When should I merge vs rebase?',
        a: `**Rebase** on your **private feature branch** to incorporate latest main:
\`\`\`bash
git checkout feature/my-work
git rebase main
\`\`\`
Creates linear history. Easier to read \`git log\`.

**Merge** when integrating to **shared branches** (main, develop):
\`\`\`bash
git checkout main
git merge feature/my-work
\`\`\`
Preserves branch history with a merge commit.

**Golden rule: Never rebase commits that others have based work on.** If you rebase a pushed branch, teammates' history diverges — use \`git push --force-with-lease\` only on your own feature branches.

Squash-merge on GitHub combines all feature commits into one on main — popular middle ground.`,
      },
    ],
    takeaways: [
      'Trunk-based: short branches, frequent merges, feature flags',
      'Rebase private feature branches; merge into shared branches',
      'Never rebase commits others have pulled',
    ],
  }),

  'git:advanced': buildLesson({
    intro:
      'Interactive rebase, cherry-pick, and stash are power tools for maintaining clean history and moving work between branches.',
    dialogues: [
      {
        q: 'How do I use interactive rebase to clean up commits before a PR?',
        a: `\`\`\`bash
git rebase -i HEAD~4   # edit last 4 commits
\`\`\`

Editor opens with:
\`\`\`
pick abc1234 Add user model
pick def5678 WIP fix tests
pick ghi9012 WIP more fixes
pick jkl3456 Finalize auth feature
\`\`\`

Change to:
\`\`\`
pick abc1234 Add user model
squash def5678 WIP fix tests
squash ghi9012 WIP more fixes
pick jkl3456 Finalize auth feature
\`\`\`

\`squash\` combines commits; \`fixup\` squashes without keeping message; \`reword\` changes commit message; \`drop\` removes a commit.

Result: two clean commits instead of four messy ones. Reviewers see logical units, not "fix typo" commits.`,
      },
      {
        q: 'When do I use cherry-pick vs merge?',
        a: `**Cherry-pick** applies a **specific commit** to another branch:
\`\`\`bash
git cherry-pick abc1234
\`\`\`

**Use case:** Hotfix merged to \`main\` needs to go to \`release/2.1\` branch without merging all of main.

**Merge** brings entire branch history. Use when integrating a completed feature.

Cherry-pick can cause duplicate commits if you later merge the source branch — Git may not recognize they're the same change. Prefer merge when integrating full features; cherry-pick for surgical backports.`,
      },
    ],
    takeaways: [
      'Interactive rebase cleans up WIP commits before PR',
      'Cherry-pick for surgical backports; merge for full features',
      'git stash saves uncommitted work when switching branches',
    ],
  }),

  'git:recovery': buildLesson({
    intro:
      'Git rarely loses data permanently. Reflog, bisect, and revert are your recovery toolkit — know when each is safe on shared branches.',
    dialogues: [
      {
        q: 'I ran git reset --hard and lost my work. Can I recover?',
        a: `**Yes, probably.** \`git reflog\` records every HEAD movement for ~90 days:

\`\`\`bash
git reflog
# abc1234 HEAD@{0}: reset: moving to HEAD~3
# def5678 HEAD@{1}: commit: Add payment integration  ← your lost work
git checkout def5678   # or: git reset --hard def5678
\`\`\`

Reflog is **local only** — not pushed to remote. If you never committed, check your IDE's local history instead.

**Prevention:** Commit often. Push feature branches daily. Don't reset --hard without checking \`git status\` first.`,
      },
      {
        q: 'How does git bisect help find bugs?',
        a: `When a bug exists now but didn't in v1.0.0, and there are 500 commits between — manual search is painful.

\`\`\`bash
git bisect start
git bisect bad          # current commit is broken
git bisect good v1.0.0  # this tag worked
# Git checks out middle commit — you test (manual or script)
git bisect good         # or bad
# Repeat ~9 times for 500 commits (binary search)
git bisect reset
\`\`\`

Automate with \`git bisect run ./test_script.sh\` — Git runs your test on each step automatically.

**Interview tip:** bisect finds the introducing commit; you still need to understand *why* that commit caused the bug.`,
      },
      {
        q: 'Revert vs reset — which is safe on main?',
        a: `**\`git revert <commit>\`** — creates a **new commit** that undoes the changes. Safe on shared branches. History preserved. Use in production to undo a bad deploy.

**\`git reset\`** — moves branch pointer. \`--soft\` keeps changes staged; \`--hard\` destroys changes. Only safe on **unpushed** local commits. Never reset shared branches — teammates' repos diverge.

Production hotfix workflow: revert the bad commit on main, deploy immediately, then fix properly in a new PR.`,
      },
    ],
    takeaways: [
      'git reflog recovers "lost" commits for ~90 days',
      'git bisect binary-searches for bug-introducing commits',
      'git revert is safe on shared branches; reset is not',
    ],
  }),

  'cicd:devops-culture': buildLesson({
    intro:
      'DevOps is a culture of shared ownership, automation, and fast feedback — not just Jenkins or GitHub Actions. Understanding CALMS and DORA metrics frames every CI/CD decision.',
    dialogues: [
      {
        q: 'What is DevOps really — is it a job title or a toolchain?',
        a: `DevOps is a **set of practices and cultural principles**, not a specific tool. The core idea: development and operations are not separate silos — the team that writes code owns its behavior in production.

**What it looks like in practice:**
- Developers write tests and run them in CI
- Deployments are automated, not manual SSH
- Incidents trigger blameless post-mortems, not blame
- Monitoring and alerting are built with the feature, not bolted on later

**CALMS:** Culture, Automation, Lean, Measurement, Sharing.

It's not "hire a DevOps engineer to fix ops." It's "every engineer can deploy and debug production."`,
      },
      {
        q: 'What are DORA metrics and what do elite teams achieve?',
        a: `Google's DORA research defines four metrics of software delivery performance:

| Metric | Elite | Low |
|--------|-------|-----|
| **Deployment frequency** | Multiple per day | Monthly or less |
| **Lead time for changes** | < 1 hour | > 6 months |
| **Mean time to recover** | < 1 hour | > 1 week |
| **Change failure rate** | 0–15% | 46–60% |

**Key insight:** Speed and stability are **not trade-offs**. Elite teams deploy more often AND have fewer failures — because small batches, automation, and fast feedback catch problems early.

Measure these in your org. If lead time is 2 weeks, ask: what's waiting? Code review? Manual QA? Approval gates?`,
      },
    ],
    takeaways: [
      'DevOps is culture + practices — shared ownership of production',
      'CALMS: Culture, Automation, Lean, Measurement, Sharing',
      'DORA metrics: deploy frequency, lead time, MTTR, change failure rate',
    ],
  }),

  'cicd:ci': buildLesson({
    intro:
      'Continuous Integration catches bugs in minutes, not days. Pipeline design — what runs when, in what order, and how fast — directly affects team velocity.',
    dialogues: [
      {
        q: 'What should a CI pipeline run, and in what order?',
        a: `**Order matters** — fail fast on cheap checks:

1. **Lint/format** (10–30s) — ruff, eslint. Catches style and simple bugs.
2. **Type check** (30s–1min) — mypy, tsc.
3. **Unit tests** (1–3min) — no DB, no network, mocked dependencies.
4. **Integration tests** (3–10min) — real DB in Docker, API tests.
5. **Build** — Docker image, compile.
6. **Security scan** — dependency audit, SAST.
7. **Deploy staging** — only on merge to main.

**Parallelize** independent jobs: lint + typecheck + unit tests can run simultaneously.

**Target:** PR checks complete in **< 10 minutes**. Slow CI → developers skip it → broken main.`,
      },
      {
        q: 'How do I handle flaky tests in CI?',
        a: `Flaky tests (pass sometimes, fail randomly) destroy trust in CI. Developers click "re-run" instead of fixing.

**Fix:**
1. **Quarantine** — move flaky tests to separate job that doesn't block merge; track in issue
2. **Root cause** — timing issues (add explicit waits), shared state (isolate tests), external deps (mock them)
3. **Retry budget** — max 1 retry for known infra flakes, not logic bugs
4. **Metrics** — track flaky test rate; fail build if > threshold

**Never** disable tests permanently without a ticket. A skipped test is a bug waiting for production.`,
      },
    ],
    takeaways: [
      'CI order: lint → typecheck → unit → integration → build → security',
      'Target < 10 min PR checks; parallelize independent jobs',
      'Fix or quarantine flaky tests — they erode CI trust',
    ],
  }),

  'cicd:github-actions': buildLesson({
    intro:
      'GitHub Actions is the default CI/CD for most teams on GitHub. Workflows, secrets, environments, and matrix builds cover most production needs.',
    dialogues: [
      {
        q: 'How do GitHub Actions workflows trigger and what are the key components?',
        a: `Workflows live in \`.github/workflows/*.yml\`.

**Triggers (\`on:\`):**
- \`push\` / \`pull_request\` — most common for CI
- \`schedule\` — cron for nightly jobs
- \`workflow_dispatch\` — manual button
- \`workflow_call\` — reusable from other workflows

**Structure:**
\`\`\`
Workflow → Jobs (parallel by default) → Steps (sequential)
\`\`\`

Each job runs on a fresh VM (\`runs-on: ubuntu-latest\`). Steps use \`actions/checkout\` to clone repo, then run commands or use marketplace actions.

**Permissions:** Scope \`GITHUB_TOKEN\` minimally — \`contents: read\` for CI, \`packages: write\` only for publish jobs.`,
      },
      {
        q: 'How do I manage secrets safely in GitHub Actions?',
        a: `**Repository secrets:** Settings → Secrets → Actions. Available to all workflows.

**Environment secrets:** Scoped to \`staging\` or \`production\` environments. Add **protection rules**: required reviewers before production deploy.

**Best practices:**
- Never echo secrets in logs (GitHub masks known secrets)
- Use **OIDC** to authenticate to AWS/GCP without long-lived keys:
  \`\`\`yaml
  permissions:
    id-token: write
    contents: read
  \`\`\`
- Rotate secrets on schedule and immediately on any leak
- \`secrets.GITHUB_TOKEN\` is auto-provided — don't create a duplicate

**Anti-pattern:** Storing AWS access keys in secrets. Use OIDC federation instead.`,
      },
    ],
    takeaways: [
      'Workflows: trigger → jobs (parallel) → steps (sequential)',
      'Scope GITHUB_TOKEN permissions minimally',
      'Use environment protection rules for production deploys',
    ],
  }),

  'cicd:cd': buildLesson({
    intro:
      'Continuous Delivery gets code to users safely. Deployment strategy choice — rolling, blue-green, or canary — depends on risk tolerance and infrastructure.',
    dialogues: [
      {
        q: 'Compare rolling, blue-green, and canary deployments.',
        a: `| Strategy | How it works | Rollback speed | Risk | Cost |
|----------|-------------|----------------|------|------|
| **Rolling** | Replace instances one by one | Slow (roll forward) | Medium — mixed versions briefly | Low |
| **Blue-green** | Two full environments, switch traffic | Instant (switch back) | All-or-nothing | 2x infra during deploy |
| **Canary** | Route 5% → 25% → 100% traffic | Fast (stop canary) | Lowest — limited blast radius | Low-medium |

**Choose:**
- Rolling: default K8s, low-risk routine deploys
- Blue-green: need instant rollback, can afford 2x resources briefly
- Canary: high-risk changes (payment logic, auth), need real-traffic validation

**Feature flags** complement all three — deploy code dark, enable for 1% of users via flag.`,
      },
      {
        q: 'What does zero-downtime deployment require beyond the deploy strategy?',
        a: `Deployment strategy is only half. You also need:

1. **Health checks** — don't route traffic until app passes readiness probe
2. **Graceful shutdown** — PreStop hook drains connections (30s) before killing pod
3. **Backward-compatible APIs** — old and new versions coexist during rolling deploy
4. **Database migrations** — expand-contract pattern, never breaking schema in one deploy
5. **Connection draining** — load balancer stops sending new requests, waits for in-flight to complete

**Kubernetes example:**
\`\`\`yaml
readinessProbe:
  httpGet: { path: /health, port: 8080 }
  initialDelaySeconds: 5
lifecycle:
  preStop:
    exec: { command: ['sleep', '15'] }
terminationGracePeriodSeconds: 30
\`\`\``,
      },
    ],
    takeaways: [
      'Canary safest for high-risk; blue-green fastest rollback',
      'Feature flags decouple deploy from release',
      'Zero-downtime needs health checks, graceful shutdown, compatible migrations',
    ],
  }),

  'cicd:iac': buildLesson({
    intro:
      'Infrastructure as Code makes servers, networks, and databases reproducible, reviewable, and versioned — just like application code.',
    dialogues: [
      {
        q: 'Why use Terraform instead of clicking in the AWS console?',
        a: `**Console problems:**
- Not reproducible — "works on my account"
- Not reviewable — no PR for infra changes
- Not versioned — who changed the security group?
- Drift — manual changes accumulate, docs lie

**Terraform benefits:**
- \`.tf\` files in git — PR review for infra
- \`terraform plan\` shows exactly what will change before applying
- State file tracks what exists — detects drift
- Modules reuse patterns (VPC, EKS cluster) across environments

**Workflow:** Edit .tf → PR → \`terraform plan\` in CI → review → merge → \`terraform apply\` in CD pipeline.`,
      },
      {
        q: 'What is GitOps and how does it relate to CI/CD?',
        a: `**GitOps:** Git is the single source of truth for both app config and infrastructure. An operator (ArgoCD, Flux) watches the git repo and syncs the cluster to match.

\`\`\`
Developer merges PR → git updated → ArgoCD detects change → deploys to K8s
\`\`\`

**Benefits:**
- Every deploy is a git commit — full audit trail
- Rollback = revert git commit
- Same workflow for app and infra changes

**vs traditional CI/CD:** CI/CD pipeline pushes to cluster. GitOps pulls from git. GitOps is more declarative and self-healing (ArgoCD reverts manual kubectl changes).`,
      },
    ],
    takeaways: [
      'IaC makes infrastructure reproducible, reviewable, and versioned',
      'terraform plan before apply — review infra changes like code',
      'GitOps: git as source of truth, operator syncs cluster state',
    ],
  }),

  'cicd:release-management': buildLesson({
    intro:
      'Releasing software is more than clicking deploy — versioning, changelogs, database migrations, and rollback plans separate professional teams from chaotic ones.',
    dialogues: [
      {
        q: 'How do you do zero-downtime database migrations in a CI/CD pipeline?',
        a: `**Expand-contract pattern** — never break schema in a single deploy:

**Deploy 1:** Add \`email_new\` column (nullable)
**Deploy 2:** App writes to both \`email\` and \`email_new\`
**Deploy 3:** Backfill job copies \`email\` → \`email_new\` for existing rows
**Deploy 4:** App reads from \`email_new\`, still writes both
**Deploy 5:** App writes only to \`email_new\`
**Deploy 6:** Drop \`email\` column

Each deploy is backward-compatible. Old code runs fine during rolling deploy. **Never** rename or drop in one step — old pods will crash.

Run migration as a separate CI job before app deploy, or use tools like Flyway/Liquibase with versioned migration files.`,
      },
      {
        q: 'What is your rollback plan when a production deploy fails?',
        a: `**Immediate (minutes):**
- Blue-green: switch traffic back
- K8s: \`kubectl rollout undo deployment/app\`
- Feature flag: disable the feature

**Database:** Migrations are forward-only. Rollback = new migration that reverses the change, not restoring old schema.

**Post-incident:**
1. Blameless post-mortem within 48 hours
2. Add monitoring/alert that would have caught this
3. Add automated test that reproduces the bug
4. Update runbook

**Prevention:** Canary deploys, automated smoke tests post-deploy, error rate alerts with 5-minute window.`,
      },
    ],
    takeaways: [
      'Expand-contract pattern for zero-downtime DB migrations',
      'Database rollbacks are forward migrations, not schema reverts',
      'Every deploy needs a rollback plan before you start',
    ],
  }),
};
