import type { Module } from '../../types/curriculum';

export const sql: Module = {
  id: 'sql',
  title: 'SQL — Query to Optimization',
  stage: 4,
  level: 'intermediate',
  icon: '🗄️',
  description:
    'From SELECT to EXPLAIN ANALYZE. Master joins, window functions, indexes, transactions, and production debugging.',
  prerequisites: ['cs-fundamentals'],
  learningObjectives: [
    'Write complex queries with JOINs, CTEs, and window functions',
    'Explain index behavior, selectivity, and when indexes hurt',
    'Debug slow queries using EXPLAIN ANALYZE',
    'Understand ACID, isolation levels, and locking',
    'Investigate production query performance systematically',
  ],
  estimatedHours: 30,
  sections: [
    {
      id: 'fundamentals',
      title: 'SQL Fundamentals',
      content: `### JOIN types
- **INNER JOIN**: Only matching rows from both tables
- **LEFT JOIN**: All from left + matching from right (NULL if no match)
- **RIGHT JOIN**: All from right + matching from left
- **FULL OUTER JOIN**: All from both, NULL where no match
- **CROSS JOIN**: Cartesian product

### WHERE vs HAVING
- **WHERE**: Filters rows BEFORE grouping
- **HAVING**: Filters groups AFTER GROUP BY

### NULL behavior
- \`NULL = NULL\` is **UNKNOWN** (not TRUE)
- Use \`IS NULL\` / \`IS NOT NULL\`
- \`COUNT(*)\` counts all rows including NULLs
- \`COUNT(column)\` ignores NULL values

### Window functions
\`\`\`sql
SELECT 
  employee_id,
  salary,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) as rank
FROM employees;
\`\`\``,
      codeExamples: [
        {
          title: 'Finding duplicates with window functions',
          language: 'sql',
          code: `SELECT email, COUNT(*) as cnt
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Or with window function
SELECT * FROM (
  SELECT *, COUNT(*) OVER (PARTITION BY email) as dup_count
  FROM users
) t WHERE dup_count > 1;`,
        },
      ],
    },
    {
      id: 'indexes',
      title: 'Indexes — When They Help and When They Don\'t',
      content: `### B-tree index (default in PostgreSQL)
- O(log n) lookup
- Supports: =, <, >, <=, >=, BETWEEN, LIKE 'prefix%'
- Does NOT support: LIKE '%suffix' (leading wildcard)

### Index selectivity
Selectivity = distinct values / total rows.
- High selectivity (e.g., email): index very useful
- Low selectivity (e.g., gender): index may not be used (sequential scan faster)

### Composite indexes
Column order matters! Index on (a, b, c) supports:
- WHERE a = ?
- WHERE a = ? AND b = ?
- WHERE a = ? AND b = ? AND c = ?
But NOT: WHERE b = ? alone

### Covering index
Index contains all columns needed by query → index-only scan (no table access).

### When index is NOT used
1. Low selectivity
2. Table too small (seq scan faster)
3. Query returns large portion of table (>5-10%)
4. Function on indexed column: \`WHERE UPPER(name) = 'X'\`
5. Stale statistics — run ANALYZE`,
      codeExamples: [
        {
          title: 'EXPLAIN ANALYZE workflow',
          language: 'sql',
          code: `-- Always use EXPLAIN ANALYZE for real timings
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC
LIMIT 100;

-- Look for:
-- Seq Scan on large tables → missing index
-- Nested Loop with high rows → bad join order
-- Sort with high cost → consider index for ORDER BY
-- Buffers: shared hit vs read → cache effectiveness`,
        },
      ],
      practicalExercise:
        'Take a slow query from your project. Run EXPLAIN ANALYZE. Identify the bottleneck. Propose and test an index.',
    },
    {
      id: 'transactions',
      title: 'Transactions, ACID & Isolation',
      content: `### ACID
- **Atomicity**: All or nothing
- **Consistency**: Valid state to valid state
- **Isolation**: Concurrent transactions don't interfere
- **Durability**: Committed data survives crashes

### Isolation levels (PostgreSQL)
| Level | Dirty Read | Non-repeatable | Phantom |
|-------|-----------|----------------|---------|
| Read Uncommitted | Possible* | Possible | Possible |
| Read Committed (default) | No | Yes | Yes |
| Repeatable Read | No | No | Yes* |
| Serializable | No | No | No |

*PostgreSQL prevents dirty reads even at Read Uncommitted

### Locking strategies
- **Pessimistic**: SELECT FOR UPDATE — lock rows upfront
- **Optimistic**: Version column — check on update, retry if changed

### Deadlock
Transaction A locks row 1, wants row 2. Transaction B locks row 2, wants row 1. PostgreSQL detects and aborts one.`,
      codeExamples: [
        {
          title: 'Optimistic locking pattern',
          language: 'sql',
          code: `-- Add version column
ALTER TABLE accounts ADD COLUMN version INT DEFAULT 0;

-- Update with version check
UPDATE accounts 
SET balance = balance - 100, version = version + 1
WHERE id = 1 AND version = @expected_version;

-- If 0 rows affected → someone else modified → retry`,
        },
      ],
    },
  ],
  questions: [
    {
      id: 'sql-q1',
      level: 'understanding',
      question: 'When does a B-tree index stop helping because of selectivity?',
      answer:
        'When the query would return a large fraction of rows (>5-10%), the planner chooses sequential scan because reading the entire table is faster than random index lookups + heap fetches. Low-cardinality columns (boolean, status with few values) often have poor selectivity.',
    },
    {
      id: 'sql-q2',
      level: 'application',
      question: 'How do you maintain consistency with offset pagination when records change between requests?',
      answer:
        'Offset pagination is inconsistent under concurrent writes — new inserts shift pages, causing duplicates or skips. Solution: cursor-based pagination using (created_at, id) as cursor. Each page returns an opaque cursor for the next page. Consistent snapshot if using repeatable read isolation.',
    },
    {
      id: 'sql-q3',
      level: 'debugging',
      question: 'A query takes 8 seconds in production but 100ms locally. How do you investigate?',
      answer:
        '1) Data volume — production has 100x more data. 2) EXPLAIN ANALYZE on production (read replica). 3) Missing indexes — different schema? 4) Lock contention — other transactions holding locks. 5) Connection pool wait time. 6) Network latency to DB. 7) Stale statistics — run ANALYZE. 8) Different query plan due to parameter values. 9) Resource contention — CPU, I/O on DB server.',
      keyPoints: ['Data volume', 'EXPLAIN ANALYZE', 'Locks', 'Statistics', 'Network'],
    },
    {
      id: 'sql-q4',
      level: 'senior',
      question: 'Design indexing strategy for a table with 100M rows receiving 1000 writes/sec and complex read queries.',
      answer:
        '1) Identify top 10 read queries via pg_stat_statements. 2) Composite indexes matching WHERE + ORDER BY columns. 3) Partial indexes for common filters (WHERE status = active). 4) Avoid over-indexing — each index slows writes. 5) Consider partitioning by date for time-series. 6) Read replicas for analytics queries. 7) Connection pooling (PgBouncer). 8) Monitor index usage with pg_stat_user_indexes.',
    },
  ],
  seniorScenarios: [
    {
      title: 'Slow production query',
      scenario: 'Users report dashboard loading in 30 seconds. The main query was fast last month.',
      approach:
        '1) pg_stat_statements — find the query. 2) EXPLAIN ANALYZE on replica. 3) Check if data grew significantly. 4) Check for missing index (new query pattern?). 5) Lock waits? 6) Table bloat — need VACUUM? 7) Compare plan with last month. 8) Quick win: add index. Long-term: materialized view or caching.',
      keyConsiderations: ['pg_stat_statements', 'Data growth', 'Plan changes', 'Vacuum/bloat'],
    },
  ],
  resources: [
    { title: 'Use The Index, Luke', url: 'https://use-the-index-luke.com/', type: 'book' },
    { title: 'PostgreSQL EXPLAIN', url: 'https://www.postgresql.org/docs/current/using-explain.html', type: 'documentation' },
  ],
};
