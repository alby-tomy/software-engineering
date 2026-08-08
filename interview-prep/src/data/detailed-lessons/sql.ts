import { buildLesson } from '../content-format';

export const sqlLessons: Record<string, string> = {
  'sql:fundamentals': buildLesson({
    intro:
      'SQL fundamentals are interview bread and butter — joins, NULL semantics, GROUP BY vs HAVING, and window functions show whether you can reason about data, not just memorize syntax.',
    dialogues: [
      {
        q: 'Explain JOIN types and when to use each.',
        a: `**INNER JOIN** — only rows with matches in both tables. Default for "related data that must exist" (orders with valid user_id).

**LEFT JOIN** — all rows from left table; NULLs where right has no match. Use for optional relationships: all users including those with zero orders.

**RIGHT JOIN** — mirror of LEFT (rare in practice — just flip tables and LEFT JOIN).

**FULL OUTER JOIN** — all from both; NULL where no match. Useful for reconciliation ("what's in A but not B?").

**CROSS JOIN** — Cartesian product. Every row paired with every row — dangerous without filter. Used deliberately for combinatorics or generating date grids.

Interview tip: draw Venn diagrams. For "users without orders": \`LEFT JOIN orders ... WHERE orders.id IS NULL\` — not INNER JOIN.`,
      },
      {
        q: 'WHERE vs HAVING — I always mix them up.',
        a: `**WHERE** filters **rows** before aggregation.

**HAVING** filters **groups** after \`GROUP BY\`.

\`\`\`sql
SELECT user_id, COUNT(*) AS order_count
FROM orders
WHERE status = 'completed'      -- filter rows first
GROUP BY user_id
HAVING COUNT(*) > 5             -- filter groups
\`\`\`

You cannot use aggregate aliases in WHERE (\`WHERE COUNT(*) > 5\` is invalid). Use HAVING or a subquery/CTE.

**Performance:** push filters to WHERE when possible — fewer rows aggregated. HAVING on large unfiltered groups is expensive.`,
      },
      {
        q: 'NULL behavior — what trips people up in interviews?',
        a: `**\`NULL = NULL\`** is UNKNOWN (not TRUE) — use \`IS NULL\` / \`IS NOT NULL\`.

**\`COUNT(*)\`** counts all rows including NULLs. **\`COUNT(column)\`** ignores NULL values in that column.

**Aggregates:** \`SUM\`, \`AVG\` skip NULLs. \`AVG\` of (10, NULL, 30) = 20, not 13.33.

**Outer joins** produce NULL for missing matches — your WHERE clause might accidentally filter them out (WHERE right.id = 5 eliminates non-matching left rows — put filter in ON clause for LEFT JOIN).

**COALESCE(col, 0)** for display defaults — doesn't fix logic errors with NULL comparisons.

Three-valued logic: TRUE, FALSE, UNKNOWN — \`WHERE\` only keeps TRUE rows.`,
      },
      {
        q: 'When do window functions beat GROUP BY?',
        a: `**GROUP BY** collapses rows — you lose individual row detail.

**Window functions** compute over a "window" of rows **without collapsing**:

\`\`\`sql
SELECT
  employee_id,
  department_id,
  salary,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dept_rank
FROM employees;
\`\`\`

Use for: running totals, rank within group, comparing row to group average, deduplication patterns.

**Finding duplicates:**
\`\`\`sql
SELECT * FROM (
  SELECT *, COUNT(*) OVER (PARTITION BY email) AS dup_count
  FROM users
) t WHERE dup_count > 1;
\`\`\`

Common functions: \`ROW_NUMBER\`, \`RANK\`, \`DENSE_RANK\`, \`LAG\`, \`LEAD\`, \`SUM() OVER (...)\`.`,
      },
      {
        q: 'How do CTEs help complex queries?',
        a: `**WITH** clauses (Common Table Expressions) break complex logic into named steps:

\`\`\`sql
WITH monthly_sales AS (
  SELECT user_id, DATE_TRUNC('month', created_at) AS month,
         SUM(amount) AS total
  FROM orders
  GROUP BY user_id, DATE_TRUNC('month', created_at)
),
ranked AS (
  SELECT *, RANK() OVER (PARTITION BY month ORDER BY total DESC) AS r
  FROM monthly_sales
)
SELECT * FROM ranked WHERE r <= 10;
\`\`\`

Readable, reusable within the query. PostgreSQL **materializes** CTEs in older versions (optimization hint changed in PG 12+ — CTEs can be inlined).

Use CTEs for: multi-step analytics, recursive hierarchies (\`WITH RECURSIVE\`), replacing nested subqueries.`,
      },
    ],
    takeaways: [
      'INNER vs LEFT: optional relations need LEFT + NULL check for "missing"',
      'WHERE filters rows; HAVING filters groups after aggregation',
      'NULL comparisons need IS NULL; COUNT(*) vs COUNT(col) differ',
      'Window functions preserve rows; GROUP BY collapses them',
    ],
    tip: 'For "second highest salary" prefer window RANK/DENSE_RANK over nested subqueries — cleaner and often faster.',
  }),

  'sql:indexes': buildLesson({
    intro:
      'Indexes are not free speed — they are trade-offs between read latency and write cost. Senior interviews want EXPLAIN ANALYZE literacy and selectivity reasoning.',
    dialogues: [
      {
        q: 'How does a B-tree index work in PostgreSQL?',
        a: `Default **B-tree** index: balanced tree, **O(log n)** lookups for equality and range queries (\`=\`, \`<\`, \`>\`, \`BETWEEN\`, \`ORDER BY\` on indexed column).

Supports **prefix matching** on strings: \`LIKE 'prefix%'\` can use index; **\`LIKE '%suffix'\`** cannot — leading wildcard prevents index use.

Each index entry points to heap row (or covers columns if covering index). **Random heap fetches** on wide result sets can make sequential scan faster than index scan.

**Hash indexes** — equality only, less common. **GIN/GiST** — full-text, JSON, geospatial — different use cases.`,
      },
      {
        q: 'When does PostgreSQL ignore your index?',
        a: `Common reasons:

1. **Low selectivity** — \`WHERE gender = 'F'\` on balanced table returns 50% of rows; seq scan cheaper
2. **Small table** — few pages, reading whole table is fast
3. **Large result fraction** — returning >5–10% of rows, seq scan wins
4. **Function on column** — \`WHERE UPPER(email) = 'X'\` can't use index on \`email\` — use functional index or store normalized
5. **Stale statistics** — run \`ANALYZE\`; bad stats → wrong plan
6. **Wrong type** — implicit cast prevents index use

Always verify with **EXPLAIN (ANALYZE, BUFFERS)** — don't assume index exists = index used.`,
      },
      {
        q: 'Composite indexes — how does column order matter?',
        a: `Index on **(a, b, c)** supports:
- \`WHERE a = ?\`
- \`WHERE a = ? AND b = ?\`
- \`WHERE a = ? AND b = ? AND c = ?\`

**Does NOT** help \`WHERE b = ?\` alone (leftmost prefix rule).

Design composite indexes matching **equality columns first**, then **range/sort columns**:

\`\`\`sql
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);
-- Supports: WHERE user_id = ? ORDER BY created_at DESC
\`\`\`

**Covering index** includes all columns needed by query → **Index Only Scan** — no heap access:

\`\`\`sql
CREATE INDEX idx_covering ON orders (user_id) INCLUDE (amount, status);
\`\`\`

Too many indexes slow **writes** — each INSERT/UPDATE touches all indexes on table.`,
      },
      {
        q: 'Walk through EXPLAIN ANALYZE on a slow query.',
        a: `\`\`\`sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 100;
\`\`\`

**Read the plan:**
- **Seq Scan** on large table → missing index or bad stats
- **Nested Loop** with high row estimates → bad join order or missing index on join key
- **Sort** with high cost → consider index matching ORDER BY
- **Buffers: shared hit vs read** — cache effectiveness

**Actual time** from ANALYZE vs **estimated rows** — big mismatch → run ANALYZE, increase statistics target, or fix correlated columns.

Fix loop: hypothesize → add index → EXPLAIN again → measure production p99.`,
      },
    ],
    takeaways: [
      'B-tree: log n lookups; leading wildcard LIKE cannot use btree',
      'Planner may seq scan: low selectivity, small table, stale stats',
      'Composite index column order matters — equality before range/sort',
      'EXPLAIN ANALYZE + BUFFERS is mandatory for real tuning',
    ],
    tip: 'When proposing an index, say which queries it serves and what write overhead you accept.',
  }),

  'sql:transactions': buildLesson({
    intro:
      'Transactions and isolation levels explain phantom reads, double charges, and "it worked in dev" production bugs. ACID is interview vocabulary you must apply, not recite.',
    dialogues: [
      {
        q: 'Explain ACID with real examples.',
        a: `**Atomicity** — all statements in transaction succeed or all roll back. Transfer $100: debit and credit must both happen — never debit alone.

**Consistency** — database moves from one valid state to another (constraints, foreign keys enforced). You don't invent consistency — schema enforces it.

**Isolation** — concurrent transactions don't interfere in ways your isolation level forbids. Two users booking same seat — isolation + locking prevents double booking.

**Durability** — committed data survives crash. PostgreSQL WAL ensures committed transactions persist after restart.

Interview: tie each to a failure story — partial transfer without atomicity, constraint violation without consistency.`,
      },
      {
        q: 'Isolation levels in PostgreSQL — what can still go wrong?',
        a: `PostgreSQL default: **Read Committed** — each statement sees snapshot of committed data at statement start.

| Level | Dirty read | Non-repeatable read | Phantom |
|-------|------------|---------------------|---------|
| Read Committed | No | Yes | Yes |
| Repeatable Read | No | No | Mostly no* |
| Serializable | No | No | No |

*PG Repeatable Read prevents phantom reads for most cases via predicate locking.

**Non-repeatable read:** transaction reads balance 100, another commits 50, re-read shows 50.

**Phantom read:** re-run query, new rows appear (another user inserted matching rows).

Use **Serializable** for critical financial invariants — higher conflict rate (serialization failures → retry). Use **Read Committed** for most OLTP.`,
      },
      {
        q: 'Pessimistic vs optimistic locking — when which?',
        a: `**Pessimistic** — lock rows upfront:

\`\`\`sql
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- app updates balance
COMMIT;
\`\`\`

Prevents concurrent modification. Risk: **deadlocks**, reduced concurrency. Use when contention is high and conflicts are common (hot inventory row).

**Optimistic** — version column, check on update:

\`\`\`sql
UPDATE accounts
SET balance = balance - 100, version = version + 1
WHERE id = 1 AND version = @expected_version;
-- 0 rows updated → someone else won → retry
\`\`\`

Better when conflicts are rare — no locks held during business logic. Web apps with occasional edits love optimistic locking.`,
      },
      {
        q: 'What is a deadlock and how does PostgreSQL handle it?',
        a: `**Deadlock:** Transaction A locks row 1, wants row 2. Transaction B locks row 2, wants row 1. Neither can proceed.

PostgreSQL **detects** deadlocks and **aborts one transaction** (error: deadlock detected). Application must **retry**.

**Prevention:**
- Consistent **lock ordering** — always lock accounts in ascending id order
- Short transactions — less time holding locks
- \`FOR UPDATE SKIP LOCKED\` for job queues — skip locked rows instead of waiting
- Avoid user interaction inside transactions

Debug: \`pg_locks\` view, log deadlock details, reproduce with concurrent integration tests.`,
      },
    ],
    takeaways: [
      'ACID: atomic transfers, constraint consistency, isolation levels, WAL durability',
      'Read Committed default; Serializable for strict invariants with retry on conflict',
      'Pessimistic FOR UPDATE for hot rows; optimistic versioning for rare conflicts',
      'Deadlocks: consistent lock order, short transactions, retry on abort',
    ],
    tip: 'For "two users buy last item" answer: SELECT FOR UPDATE or atomic UPDATE WHERE stock > 0 with row check.',
  }),
};
