import { buildTextbookLesson } from '../textbook-format';

export const textbookDataApiLessons: Record<string, string> = {
  'mongodb:modeling': buildTextbookLesson({
    chapter: 'MongoDB Document Modeling',
    overview:
      'Document databases store data as flexible JSON-like documents rather than rigid rows and tables. MongoDB is the most widely deployed document database in production, and its power comes from schema design that matches how your application reads and writes data. This chapter teaches you to think in documents: when to embed related data, when to reference it, how to model for query patterns, and how to avoid the pitfalls that cause unbounded document growth and painful migrations.',
    objectives: [
      'Explain the document model and how it differs from relational normalization',
      'Choose embedding vs referencing based on access patterns and cardinality',
      'Design schemas around query patterns rather than theoretical purity',
      'Recognize anti-patterns such as unbounded arrays and deep nesting',
      'Apply modeling techniques for common domains like e-commerce and content management',
    ],
    definitions: [
      {
        term: 'Document',
        definition:
          'A BSON record stored in a MongoDB collection. Documents are self-contained units that can hold nested objects and arrays, identified by an `_id` field.',
      },
      {
        term: 'Embedding',
        definition:
          'Storing related data inside the same document (denormalization). Reads are fast because a single query returns everything needed.',
      },
      {
        term: 'Referencing',
        definition:
          'Storing a foreign-key-like identifier that points to a document in another collection. Enables independent updates and avoids duplication.',
      },
      {
        term: 'Working set',
        definition:
          'The subset of data and indexes that fit in RAM. Schema design affects working-set size and therefore query latency at scale.',
      },
    ],
    sections: [
      {
        title: 'The Document Model vs Relational Thinking',
        content: `Relational databases encourage **normalization**: split data across tables, join at query time, enforce integrity with foreign keys. MongoDB encourages the opposite default: **co-locate data that is read together**.

In PostgreSQL you might have \`orders\`, \`order_items\`, and \`products\` tables joined on every order detail page. In MongoDB you often embed \`items\` inside the \`order\` document because an order and its line items are almost always fetched as a unit.

This is not "NoSQL means no schema." Documents have structure — it is **application-enforced** and **evolvable**. Fields can differ across documents in the same collection (polymorphic documents), which helps during migrations but requires discipline in application code.

**When MongoDB fits well:**
- Flexible or evolving schemas (product catalogs, user profiles with optional fields)
- Hierarchical or nested data (CMS content trees, configuration blobs)
- Read-heavy workloads with predictable access patterns
- Horizontal scaling via sharding on a shard key you control

**When PostgreSQL may be better:**
- Complex multi-entity transactions with strict ACID across many tables
- Heavy reporting with ad-hoc joins across unrelated entities
- Strong relational integrity as a hard requirement`,
      },
      {
        title: 'Embed vs Reference — The Core Decision',
        content: `Use this decision framework in interviews and in production:

**Embed when:**
- Relationship is **one-to-few** (a user has a handful of addresses, not thousands)
- Child data is **always accessed with the parent** (order items with orders)
- Child data does **not** need independent queries
- Updates to embedded data are **infrequent** or scoped to the parent document
- Array size is **bounded** (you can cap it — e.g., last 50 login events)

**Reference when:**
- Relationship is **one-to-many** or **many-to-many** with large cardinality
- Related entity is **queried independently** (search all products regardless of order)
- Same entity is **referenced by many parents** (user profile referenced by orders, reviews, messages)
- Embedded data would cause **unbounded growth** (comments on a viral post)
- Child updates must propagate without rewriting large parent documents

**Cardinality cheat sheet:**

| Relationship | Typical approach |
|---|---|
| One-to-one | Embed if small and always together; else reference |
| One-to-few | Embed (addresses, payment methods) |
| One-to-many (bounded) | Embed with cap, or reference |
| One-to-many (unbounded) | Reference + paginated queries |
| Many-to-many | Reference with junction collection |

The MongoDB documentation summarizes: **"data that is accessed together should be stored together."** That single sentence drives most modeling decisions.`,
      },
      {
        title: 'Designing for Query Patterns',
        content: `In relational design you normalize first and let queries follow. In MongoDB you **start with queries**:

1. List the top 5–10 read and write operations your application performs.
2. For each operation, ask: "Can one document (or one indexed query) satisfy this?"
3. If not, consider embedding, referencing, or duplicating (yes — **controlled duplication** is acceptable).

**E-commerce example — order document with embedded items:**

\`\`\`json
{
  "_id": "order_7f3a",
  "user_id": "user_42",
  "status": "shipped",
  "created_at": "2026-03-15T10:00:00Z",
  "items": [
    {
      "product_id": "prod_101",
      "sku": "WIDGET-XL",
      "name": "Premium Widget",
      "qty": 2,
      "unit_price": 29.99
    }
  ],
  "shipping": {
    "address": { "line1": "123 Main St", "city": "Austin", "zip": "78701" },
    "carrier": "UPS",
    "tracking": "1Z999AA10123456784"
  },
  "total": 59.98
}
\`\`\`

Notice we **denormalize** \`name\` and \`sku\` into the order. If the product title changes later, historical orders still show what the customer bought — exactly what you want for invoices.

**Product catalog — separate collection with references:**

\`\`\`json
{
  "_id": "prod_101",
  "name": "Premium Widget",
  "category_ids": ["cat_electronics", "cat_gadgets"],
  "attributes": { "color": "black", "weight_kg": 0.5 },
  "inventory": { "warehouse_a": 120, "warehouse_b": 45 }
}
\`\`\`

Products are queried independently (search, filter, browse). Orders reference \`product_id\` but snapshot pricing at purchase time.`,
      },
      {
        title: 'Patterns for Common Scenarios',
        content: `**Bucket pattern** — split unbounded one-to-many into "bucket" documents. Instead of one document with 100,000 sensor readings, store 100 readings per document keyed by \`(device_id, time_bucket)\`. Queries fetch the relevant buckets.

**Subset pattern** — embed only recent or frequently accessed data. A social profile embeds the last 20 posts but references older posts in a separate collection.

**Extended reference pattern** — store minimal duplicated fields to avoid joins. Embed \`author_name\` and \`author_avatar_url\` in each comment so listing comments does not require a lookup to \`users\`.

**Polymorphic pattern** — one collection holds multiple shapes distinguished by a \`type\` field. Event sourcing logs, CMS blocks, and notification feeds use this. Index \`type\` plus query-specific fields.

**Schema versioning** — add \`schema_version: 2\` to documents. Application code handles v1 and v2 during migration. Migrate lazily on read or via background jobs.

Always design with the **16 MB document limit** in mind. MongoDB rejects documents larger than 16 MB. Unbounded arrays are the most common way teams hit this limit.`,
      },
      {
        title: 'Indexes and Schema Co-Design',
        content: `Schema and indexes are inseparable. A beautiful document layout fails if queries cannot use indexes efficiently.

**Compound indexes** should match your filter + sort patterns. If you query \`{ user_id: X, status: "open" }\` sorted by \`created_at\`, index \`(user_id, status, created_at)\`.

**Multikey indexes** apply to array fields. Embedding \`tags: ["mongodb", "database"]\` lets you index \`tags\` for tag-based queries — but each array element becomes an index entry, so very large arrays inflate index size.

**Shard key** choice is a modeling decision. A bad shard key (low cardinality, monotonic \`_id\` only) creates hot shards. Co-locate related data on the same shard when possible using a compound shard key like \`{ tenant_id: 1, _id: 1 }\`.

Run **explain("executionStats")** on production-like data volumes. A collection scan on 50 documents is fine; on 50 million it is a production incident.`,
      },
    ],
    example: {
      title: 'Modeling a Blog with Comments',
      language: 'json',
      code: `// posts collection — post with embedded recent comments
{
  "_id": "post_abc",
  "title": "MongoDB Modeling Guide",
  "body": "...",
  "author_id": "user_1",
  "comment_count": 847,
  "recent_comments": [
    { "id": "c1", "author": "Alice", "text": "Great post!", "at": "2026-03-10" }
  ]
}

// comments collection — paginated full comment history
{
  "_id": "c1",
  "post_id": "post_abc",
  "author_id": "user_2",
  "author_name": "Alice",
  "text": "Great post!",
  "created_at": "2026-03-10T14:00:00Z"
}`,
      explanation:
        'The post document serves the "show post with a few comments" query in one read. The comments collection handles "load more comments" with `{ post_id, created_at }` index and cursor pagination. `author_name` is duplicated to avoid a user lookup on every comment list — updated only if the user changes their display name (acceptable staleness or async backfill).',
    },
    pitfalls: [
      'Treating MongoDB like PostgreSQL with unlimited joins — excessive `$lookup` stages often mean the schema is wrong',
      'Embedding unbounded arrays (comments, events, logs) — leads to 16 MB limit errors and slow rewrites on every insert',
      'Normalizing too aggressively and requiring 5+ queries or aggregations for every page load',
      'Duplicating data without a strategy for staleness when source documents change',
      'Choosing a shard key after data volume makes migration painful — plan early for multi-tenant or high-scale apps',
    ],
    summary: [
      'MongoDB rewards schema design aligned with read/write patterns, not textbook normalization',
      'Embed for one-to-few, bounded, co-accessed data; reference for large or independently queried entities',
      'Controlled denormalization (snapshotting names, prices) is a feature, not a bug',
      'Use bucket, subset, and extended reference patterns for scale',
      'Co-design indexes and shard keys with your document structure from day one',
    ],
    reviewQuestions: [
      {
        q: 'An order has 3 items on average but could have 500 for enterprise bulk orders. Embed or reference?',
        hint: 'Consider document size, update frequency, and whether you query items independently of the order header.',
      },
      {
        q: 'Why snapshot product name and price inside an order document?',
        hint: 'Think about historical accuracy, audit trails, and what happens when catalog data changes.',
      },
      {
        q: 'What is wrong with storing all user activity events embedded in the user document?',
        hint: 'Unbounded growth, document rewrite cost, and the 16 MB limit.',
      },
    ],
  }),

  'mongodb:aggregation': buildTextbookLesson({
    chapter: 'MongoDB Aggregation Pipeline',
    overview:
      'The aggregation pipeline is MongoDB\'s framework for data processing — a sequence of stages that transform documents, much like a Unix pipeline or SQL\'s SELECT/WHERE/GROUP BY/JOIN composed into one declarative program. Mastering aggregation is essential for analytics, reporting, ETL within the database, and complex read paths that go beyond simple find queries.',
    objectives: [
      'Describe how the aggregation pipeline processes documents stage by stage',
      'Use core stages: $match, $group, $project, $sort, $lookup, $unwind',
      'Optimize pipelines with early $match and index-aware design',
      'Build multi-stage analytics queries for real business questions',
      'Compare aggregation vs application-level processing and vs SQL',
    ],
    definitions: [
      {
        term: 'Aggregation pipeline',
        definition:
          'An ordered array of stages. Each stage receives documents from the previous stage, transforms them, and passes results to the next.',
      },
      {
        term: '$match',
        definition:
          'Filters documents (like SQL WHERE). Should appear early to reduce documents processed by later stages.',
      },
      {
        term: '$group',
        definition:
          'Groups documents by an `_id` expression and computes accumulators ($sum, $avg, $push, etc.) — analogous to SQL GROUP BY.',
      },
      {
        term: '$lookup',
        definition:
          'Performs a left outer join to another collection. Powerful but expensive — prefer embedding when join-like access is frequent.',
      },
    ],
    sections: [
      {
        title: 'Pipeline Mental Model',
        content: `Think of aggregation as a **factory line**. Raw documents enter stage 1; each stage reshapes, filters, or enriches them; the final stage outputs the result set.

\`\`\`javascript
db.orders.aggregate([
  { $match: { status: "completed", created_at: { $gte: ISODate("2026-01-01") } } },
  { $unwind: "$items" },
  { $group: {
      _id: "$items.product_id",
      total_revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } },
      units_sold: { $sum: "$items.qty" }
  }},
  { $sort: { total_revenue: -1 } },
  { $limit: 10 }
])
\`\`\`

Stage order matters:
1. **$match** — filter early (uses indexes if first stage)
2. **$project** / **$addFields** — shape documents, compute fields
3. **$unwind** — deconstruct arrays into one document per element
4. **$group** — aggregate
5. **$lookup** — join other collections
6. **$sort** / **$skip** / **$limit** — pagination and top-N

Unlike SQL, there is no query planner that freely reorders your intent — **you** are responsible for efficient stage ordering.`,
      },
      {
        title: 'Essential Stages in Depth',
        content: `**$match** — identical syntax to find() queries. Place first when possible so MongoDB can use indexes and reduce working set.

**$project** — include/exclude fields, rename, compute expressions:
\`\`\`javascript
{ $project: { full_name: { $concat: ["$first", " ", "$last"] }, email: 1, _id: 0 } }
\`\`\`

**$group** — \`_id\` defines the group key. Use \`null\` for global aggregates:
\`\`\`javascript
{ $group: { _id: null, avg_order: { $avg: "$total" }, count: { $sum: 1 } } }
\`\`\`

**$unwind** — expands \`items\` array so each item becomes its own document. Use \`preserveNullAndEmptyArrays: true\` to keep documents with empty arrays.

**$lookup** — join syntax (simplified):
\`\`\`javascript
{
  $lookup: {
    from: "products",
    localField: "items.product_id",
    foreignField: "_id",
    as: "product_details"
  }
}
\`\`\`

For correlated subquery-style lookups (MongoDB 3.6+), use the pipeline form of \`$lookup\` with \`let\` and \`$expr\`.

**$facet** — run multiple pipelines on the same input in one round trip (e.g., return paginated results AND total count simultaneously).`,
      },
      {
        title: 'Real-World Analytics Patterns',
        content: `**Top products by revenue** (shown in overview) — unwind line items, group by product, sort, limit.

**Monthly revenue trend:**
\`\`\`javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: {
      _id: { $dateToString: { format: "%Y-%m", date: "$created_at" } },
      revenue: { $sum: "$total" },
      order_count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
])
\`\`\`

**Cohort-style analysis** — $lookup users, $group by signup month and compute retention metrics. Often combined with $bucket or $dateTrunc (MongoDB 5.0+).

**Deduplication** — $sort by timestamp, $group with $first to keep latest record per key.

**Text search + aggregation** — $match with $text index first, then $group for faceted counts by category.

For dashboards, consider **pre-aggregated collections** updated by change streams or nightly jobs when real-time aggregation on billions of documents is too slow.`,
      },
      {
        title: 'Performance and Optimization',
        content: `**Golden rule:** filter as early and as aggressively as possible.

- Put **$match** first — it can use indexes
- Put **$project** early to drop large unused fields before $unwind multiplies document count
- Avoid **$lookup** on unindexed foreign fields
- **$sort** before **$group** is expensive; **$sort** after **$group** on small result sets is fine
- Use **allowDiskUse: true** for large sorts/groups that exceed memory limit (100 MB default per stage)
- Add **{ $limit: N }** as early as legally possible for top-N queries

Use **explain("executionStats")** on the aggregate command. Watch \`totalDocsExamined\` vs \`nReturned\` — a ratio near 1 is ideal; millions examined for dozens returned signals a missing index or bad stage order.

**Index intersection** does not save a pipeline that $unwind's before $match on nested fields — index the fields you actually filter on, or restructure documents.`,
      },
    ],
    example: {
      title: 'Customer Lifetime Value by Segment',
      language: 'javascript',
      code: `db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: {
      _id: "$user_id",
      lifetime_value: { $sum: "$total" },
      order_count: { $sum: 1 }
  }},
  { $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "user"
  }},
  { $unwind: "$user" },
  { $group: {
      _id: "$user.segment",
      avg_ltv: { $avg: "$lifetime_value" },
      customers: { $sum: 1 }
  }},
  { $sort: { avg_ltv: -1 } }
])`,
      explanation:
        'First aggregate per user (orders collection only — no join yet). Then $lookup users for segment. Finally group by segment. This order minimizes the number of user documents joined — only one per paying customer, not per order.',
    },
    pitfalls: [
      '$unwind before $match on array fields — multiplies documents then filters; match on array conditions first when possible',
      'Using $lookup as a crutch for bad schema design — every lookup is a subquery cost',
      'Forgetting allowDiskUse on large analytics jobs — pipeline fails with memory limit exceeded',
      '$group without indexes on $match fields — full collection scan on huge collections',
      'Assuming aggregation is always faster than app-level code — sometimes fetching and reducing in application memory is simpler and cacheable',
    ],
    summary: [
      'Aggregation pipelines are ordered stages; stage order directly affects performance',
      '$match early, $project to slim documents, $unwind to flatten arrays, $group to aggregate',
      '$lookup enables joins but should be used sparingly — prefer schema that matches access patterns',
      'Use explain(), indexes, and pre-aggregation for production analytics at scale',
      '$facet and pipeline $lookup unlock advanced patterns for pagination and correlated joins',
    ],
    reviewQuestions: [
      {
        q: 'Why should $match typically be the first stage?',
        hint: 'Indexes, reduced document volume, and less work for downstream stages.',
      },
      {
        q: 'You need top 10 products by revenue and total count of products sold. One query or two?',
        hint: 'Consider $facet to run two pipelines on the same filtered input.',
      },
      {
        q: 'When would you move aggregation logic to a background job?',
        hint: 'Data volume, latency requirements, and whether results can be eventually consistent.',
      },
    ],
  }),

  'elasticsearch:fundamentals': buildTextbookLesson({
    chapter: 'Elasticsearch Search Fundamentals',
    overview:
      'Elasticsearch is a distributed search and analytics engine built on Apache Lucene. It powers full-text search, log analytics (the ELK stack), and faceted product catalogs. Unlike a primary database optimized for transactional CRUD, Elasticsearch is optimized for **search**: finding relevant documents among millions using inverted indexes, tokenization, and relevance scoring. This chapter explains how search works under the hood.',
    objectives: [
      'Explain inverted indexes and why they enable fast full-text search',
      'Describe the analyzer pipeline from raw text to searchable tokens',
      'Understand BM25 relevance scoring at a conceptual level',
      'Design index mappings with appropriate field types (text vs keyword)',
      'Articulate when Elasticsearch complements vs replaces a primary database',
    ],
    definitions: [
      {
        term: 'Inverted index',
        definition:
          'A data structure mapping each term to the list of documents containing it. Enables O(1) term lookup instead of scanning every document.',
      },
      {
        term: 'Analyzer',
        definition:
          'A pipeline of character filters, tokenizer, and token filters that converts raw text into normalized tokens stored in the index.',
      },
      {
        term: 'Mapping',
        definition:
          'Schema definition for an index — field names, types (text, keyword, date, nested), analyzers, and indexing options.',
      },
      {
        term: 'Shard',
        definition:
          'A horizontal partition of an index. Each shard is a self-contained Lucene index. Shards enable scale-out across nodes.',
      },
    ],
    sections: [
      {
        title: 'Why Elasticsearch Exists',
        content: `SQL databases excel at **exact matches**, **joins**, and **ACID transactions**. They struggle with:
- Full-text search across long text fields (\`LIKE '%mongodb%'\` cannot use B-tree indexes)
- Fuzzy matching ("mongodb" matching "Mongo DB")
- Relevance ranking (which of 10,000 matches is *best*?)
- Sub-second faceted navigation (filter by category, brand, price range simultaneously)
- Autocomplete and "search as you type"

Elasticsearch solves these with **inverted indexes** and **distributed architecture**. In production it is almost always a **secondary store**: data is synced from PostgreSQL, MongoDB, or event streams via Logstash, Debezium CDC, or application-level indexing.

**Common use cases:**
- E-commerce product search with filters and facets
- Application and infrastructure log aggregation
- Content management full-text search
- Security information and event management (SIEM)
- Autocomplete and "did you mean?" suggestions`,
      },
      {
        title: 'Inverted Indexes and Lucene',
        content: `A **forward index** maps document → content (read the whole document to find a word). An **inverted index** maps term → document IDs:

\`\`\`
"mongodb"  → [doc1, doc5, doc99]
"database" → [doc1, doc3, doc5]
"elastic"  → [doc5, doc12]
\`\`\`

Query "mongodb AND database" → intersect posting lists → [doc1, doc5]. This is fast even with billions of documents because lookup is by term, not by scan.

Each Elasticsearch index is split into **shards** (default 1). Shards distribute across nodes. **Replicas** provide read scaling and failover.

**Near real-time (NRT):** documents are indexed into a memory buffer, refreshed to searchable segments every ~1 second (configurable). Not instant, but fast enough for search UIs. A **flush** commits segments to disk.

Understanding segments matters for interviews: merges combine small segments into larger ones; too many small segments hurts performance; forcemerge is a maintenance operation, not a daily tool.`,
      },
      {
        title: 'Analyzers and Tokenization',
        content: `Raw text is not what gets indexed. An **analyzer** transforms it:

**Character filters** — normalize input (strip HTML, replace æ → ae)
**Tokenizer** — split into tokens ("Quick brown fox" → ["Quick", "brown", "fox"])
**Token filters** — lowercase, stop words, stemming ("running" → "run")

\`\`\`json
PUT /articles
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "english"
      },
      "status": {
        "type": "keyword"
      }
    }
  }
}
\`\`\`

**text** fields are analyzed — use for full-text search.
**keyword** fields are not analyzed — use for exact matches, sorting, aggregations (category, SKU, email).

**Multi-fields** let one logical field serve both purposes:
\`\`\`json
"title": {
  "type": "text",
  "fields": {
    "keyword": { "type": "keyword" }
  }
}
\`\`\`

Search with \`match\` on \`title\`; aggregate or sort on \`title.keyword\`. Analyzer choice dramatically affects relevance — "MongoDB" vs "mongo db" vs "mongoDB" must be tested with real queries.`,
      },
      {
        title: 'Relevance Scoring with BM25',
        content: `Elasticsearch default scoring uses **BM25** (Best Matching 25), an evolution of TF-IDF:

- **Term frequency (TF):** more occurrences in a document → higher score (with diminishing returns)
- **Inverse document frequency (IDF):** rare terms across the corpus → higher weight ("elasticsearch" scores higher than "the")
- **Field length normalization:** shorter fields matching a term score higher (a match in \`title\` beats a match in \`body\`)

\`\`\`json
GET /articles/_search
{
  "query": {
    "multi_match": {
      "query": "mongodb aggregation",
      "fields": ["title^3", "body", "tags^2"]
    }
  }
}
\`\`\`

The \`^3\` **boost** on title says title matches matter 3× more. Boosts encode business relevance.

**Explain API** (\`_explanation: true\`) shows why a document scored as it did — essential for debugging "why is result #5 above result #1?"

For production tuning: A/B test ranking, collect click-through data, use **learning to rank** plugins for advanced cases. Start simple — over-tuned scoring without user feedback often backfires.`,
      },
      {
        title: 'Architecture and Operational Basics',
        content: `**Cluster topology:** nodes with roles — master-eligible (cluster state), data (store shards), ingest (pre-process pipelines), coordinating (route requests).

**Index lifecycle:** hot (fast SSD, frequent queries) → warm → cold → delete. ILM policies automate rollover and retention.

**Sync strategies from primary DB:**
1. **Dual write** — app writes to DB and ES (risk: inconsistency on partial failure)
2. **Outbox pattern** — transactional outbox + consumer indexes to ES (recommended)
3. **CDC** — Debezium captures DB changes → Kafka → ES connector

**Never use Elasticsearch as sole source of truth** for transactional data. It lacks multi-document ACID transactions comparable to PostgreSQL. Treat it as a **search view** that can be rebuilt from the primary store.

**Health monitoring:** cluster status (green/yellow/red), JVM heap pressure, pending tasks, slow query log, shard allocation failures.`,
      },
    ],
    example: {
      title: 'Indexing a Product Document',
      language: 'json',
      code: `PUT /products/_doc/prod_101
{
  "name": "Wireless Bluetooth Headphones",
  "description": "Premium noise-cancelling over-ear headphones",
  "category": "electronics",
  "brand": "AudioMax",
  "price": 149.99,
  "tags": ["wireless", "bluetooth", "audio"],
  "created_at": "2026-01-15T00:00:00Z"
}

GET /products/_search
{
  "query": { "match": { "name": "bluetooth headphones" } }
}`,
      explanation:
        'The match query analyzes the search string and finds documents whose analyzed name/description fields share tokens. category and brand are typically keyword fields for exact filter aggregations. price is numeric for range filters.',
    },
    pitfalls: [
      'Using text fields for aggregations or sorting — use keyword sub-fields instead',
      'Mapping a field as text then needing exact match later — reindexing required to change mapping',
      'Treating Elasticsearch as primary database — data loss risk and no transactional guarantees',
      'Default 5 shards per index on small datasets — wastes resources; right-size shards (target 10–50 GB per shard)',
      'Ignoring refresh interval for bulk indexing — set refresh_interval to -1 during bulk load, restore after',
    ],
    summary: [
      'Elasticsearch uses inverted indexes for fast full-text search at scale',
      'Analyzers tokenize and normalize text; text vs keyword field types serve different purposes',
      'BM25 scores relevance using term frequency, inverse document frequency, and field length',
      'Deploy ES as a search layer synced from your primary database',
      'Mappings are chosen at index time — plan fields, analyzers, and multi-fields deliberately',
    ],
    reviewQuestions: [
      {
        q: 'Why can\'t you efficiently run LIKE \'%term%\' in PostgreSQL for product search?',
        hint: 'B-tree indexes, full table scans, and lack of relevance ranking.',
      },
      {
        q: 'When would you use a keyword field instead of text?',
        hint: 'Exact match, filtering, sorting, aggregations — no analysis needed.',
      },
      {
        q: 'How would you rebuild Elasticsearch if the cluster lost all data?',
        hint: 'Primary database as source of truth; full reindex from DB or event log.',
      },
    ],
  }),

  'elasticsearch:queries': buildTextbookLesson({
    chapter: 'Elasticsearch Query Types',
    overview:
      'Elasticsearch query DSL is rich and composable. Production search APIs combine full-text relevance queries with exact filters, range constraints, and aggregations for faceted navigation. This chapter covers the query types you will use daily and how to structure bool queries for real search interfaces.',
    objectives: [
      'Use match, term, range, and bool queries appropriately',
      'Distinguish query context (scoring) from filter context (yes/no, cacheable)',
      'Build faceted search with terms aggregations and filters',
      'Implement pagination with search_after for deep results',
      'Debug poor relevance and slow queries systematically',
    ],
    definitions: [
      {
        term: 'Query context',
        definition:
          'Queries that compute relevance scores (_score). Used for full-text search where ranking matters.',
      },
      {
        term: 'Filter context',
        definition:
          'Yes/no matching without scoring. Results are cacheable and faster — use for exact filters (category, price range).',
      },
      {
        term: 'Bool query',
        definition:
          'Combines clauses: must (AND, scored), filter (AND, not scored), should (OR, boosts), must_not (exclude).',
      },
      {
        term: 'Aggregation',
        definition:
          'Analytics over search results — counts, averages, histograms, nested facets. Like SQL GROUP BY on search results.',
      },
    ],
    sections: [
      {
        title: 'Match vs Term — The Most Important Distinction',
        content: `**match** — full-text query. Input is analyzed. Use on \`text\` fields.
\`\`\`json
{ "match": { "title": "quick brown fox" } }
\`\`\`
Finds documents containing analyzed tokens. Operator \`and\` vs \`or\` controls token matching.

**term** — exact value query. No analysis. Use on \`keyword\`, numeric, date, boolean fields.
\`\`\`json
{ "term": { "status": "published" } }
\`\`\`

**Common bug:** \`{ "term": { "title": "Quick Brown" } }\` on a text field often returns zero results because indexed tokens are lowercased ("quick", "brown") but the term query does not analyze input.

**match_phrase** — tokens must appear in order and adjacent (configurable slop for word gaps). Use for quoted-phrase search.

**multi_match** — search across multiple fields with optional per-field boosts.`,
      },
      {
        title: 'Bool Queries for Production Search',
        content: `Real search UIs combine text search + filters:

\`\`\`json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "python tutorial" } }
      ],
      "filter": [
        { "term": { "category": "programming" } },
        { "range": { "price": { "lte": 50 } } },
        { "term": { "in_stock": true } }
      ],
      "must_not": [
        { "term": { "status": "archived" } }
      ],
      "should": [
        { "term": { "featured": true } }
      ]
    }
  }
}
\`\`\`

- **must** — required, contributes to score
- **filter** — required, no score, cached — put structural constraints here
- **should** — optional; boosts matching docs (minimum_should_match configurable)
- **must_not** — exclude

**Rule:** filters for business rules (category, price, ACL); must/match for relevance.`,
      },
      {
        title: 'Aggregations and Faceted Search',
        content: `Aggregations power Amazon-style sidebar filters:

\`\`\`json
{
  "query": { "match": { "title": "laptop" } },
  "aggs": {
    "by_category": {
      "terms": { "field": "category", "size": 20 }
    },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "to": 500 },
          { "from": 500, "to": 1000 },
          { "from": 1000 }
        ]
      }
    },
    "avg_price": {
      "avg": { "field": "price" }
    }
  }
}
\`\`\`

**Post-filter vs filter in query:** post_filter applies aggregations on the full result set but filters displayed hits — use when facet counts should reflect all categories even when one is selected.

**Nested aggregations** handle nested object arrays (e.g., reviews within products) using \`nested\` type and \`nested\` aggregation.

Performance tip: use \`"size": 0\` when you only need aggregations, not hit documents.`,
      },
      {
        title: 'Pagination, Sorting, and Deep Paging',
        content: `**from + size** — simple offset pagination. Fine for first few pages. Expensive for deep offsets (Elasticsearch must sort and discard \`from\` documents).

**search_after** — cursor-based pagination using sort values from previous page. Required for deep paging and export:
\`\`\`json
{
  "size": 20,
  "sort": [{ "created_at": "desc" }, { "_id": "asc" }],
  "search_after": [1700000000000, "doc_xyz"]
}
\`\`\`

Always include a unique tiebreaker field (\_id) in sort.

**Sorting:** keyword and numeric fields sort naturally. text fields require \`.keyword\` sub-field. \`_score\` sorts by relevance.

**Scroll API** — batch export of large result sets (reindexing, reports). Not for user-facing pagination — use search_after instead.

**Point in Time (PIT)** — consistent snapshot for search_after across multiple requests when index is actively updating.`,
      },
      {
        title: 'Improving Relevance and Debugging',
        content: `When results feel wrong, work through this checklist:

1. **Analyzer** — run \`/_analyze\` on sample text; do tokens match user expectations?
2. **Field boosts** — is title weighted above body?
3. **Synonyms** — "laptop" ↔ "notebook" via synonym filter in analyzer
4. **function_score** — boost by recency, popularity, or business rules:
\`\`\`json
"function_score": {
  "query": { "match": { "title": "mongodb" } },
  "functions": [
    { "gauss": { "created_at": { "origin": "now", "scale": "30d" } } },
    { "field_value_factor": { "field": "popularity", "modifier": "log1p" } }
  ]
}
\`\`\`
5. **Minimum should match** — require 75% of terms for multi-word queries
6. **Explain API** — inspect per-document scoring

Monitor **slow query log**, use **Profile API** for shard-level timing, and load-test with production query distributions.`,
      },
    ],
    example: {
      title: 'E-Commerce Search API Query',
      language: 'json',
      code: `GET /products/_search
{
  "query": {
    "bool": {
      "must": [{ "multi_match": {
        "query": "wireless headphones",
        "fields": ["name^3", "description", "brand^2"],
        "type": "best_fields",
        "fuzziness": "AUTO"
      }}],
      "filter": [
        { "range": { "price": { "gte": 50, "lte": 200 } } },
        { "term": { "in_stock": true } }
      ]
    }
  },
  "aggs": {
    "brands": { "terms": { "field": "brand", "size": 10 } },
    "price_stats": { "stats": { "field": "price" } }
  },
  "from": 0,
  "size": 24,
  "sort": [{ "_score": "desc" }, { "popularity": "desc" }]
}`,
      explanation:
        'Multi_match with fuzziness handles typos. Filters constrain price and availability without affecting score. Aggregations return brand facets and price statistics for the sidebar. Combined sort breaks ties by popularity.',
    },
    pitfalls: [
      'Using term queries on analyzed text fields — classic zero-results bug',
      'Deep pagination with from/size on page 500 — timeouts and memory pressure',
      'Aggregations on text fields instead of keyword — use .keyword sub-field',
      'Returning huge hit sizes (size: 10000) when only aggregations are needed',
      'Ignoring query vs filter context — scoring filters unnecessarily hurts cache efficiency',
    ],
    summary: [
      'match for full-text on text fields; term for exact match on keyword/numeric fields',
      'bool query combines must, filter, should, must_not for real search interfaces',
      'Aggregations enable faceted navigation and analytics alongside search hits',
      'Use search_after with PIT for deep pagination; avoid large from offsets',
      'Tune relevance with boosts, synonyms, function_score, and systematic debugging',
    ],
    reviewQuestions: [
      {
        q: 'Why put price range in filter instead of must?',
        hint: 'Filter context is cacheable and does not affect relevance scoring.',
      },
      {
        q: 'A user reports search returns nothing for exact SKU match. Likely cause?',
        hint: 'SKU probably mapped as text; need keyword field or term query on .keyword.',
      },
      {
        q: 'How do facet counts stay accurate when a category filter is applied?',
        hint: 'post_filter vs filter in bool query — different effects on aggregation scope.',
      },
    ],
  }),

  'design-patterns:creational': buildTextbookLesson({
    chapter: 'Creational Design Patterns',
    overview:
      'Creational patterns deal with object creation mechanisms — abstracting the instantiation process so systems are independent of how objects are composed, represented, and created. They solve problems like "how do I ensure only one database connection pool exists?" and "how do I create the right payment processor without if/else chains?" This chapter covers Singleton, Factory, Abstract Factory, Builder, and Prototype with production context.',
    objectives: [
      'Explain the purpose of each creational pattern and its problem domain',
      'Implement common patterns idiomatically in modern languages',
      'Recognize when a pattern adds value vs unnecessary abstraction',
      'Connect creational patterns to dependency injection and testing',
      'Discuss thread safety and lifecycle concerns for Singleton',
    ],
    definitions: [
      {
        term: 'Singleton',
        definition:
          'Ensures a class has only one instance and provides global access. Use for shared resources with controlled lifecycle.',
      },
      {
        term: 'Factory Method',
        definition:
          'Defines an interface for creating objects but lets subclasses decide which class to instantiate.',
      },
      {
        term: 'Abstract Factory',
        definition:
          'Provides an interface for creating families of related objects without specifying concrete classes.',
      },
      {
        term: 'Builder',
        definition:
          'Separates construction of a complex object from its representation, enabling step-by-step assembly.',
      },
    ],
    sections: [
      {
        title: 'Why Creational Patterns Matter',
        content: `Object creation sounds trivial — \`new MyClass()\` — until systems grow:

- **Tight coupling:** business code instantiates \`PostgresRepository\` directly; swapping to MongoDB requires changes everywhere
- **Complex construction:** a \`HttpRequest\` with 15 optional fields needs readable, validated assembly
- **Resource management:** connection pools, config loaders, and loggers must be single-instance
- **Runtime selection:** payment provider depends on user country, feature flag, or A/B test

Creational patterns **encapsulate creation logic** behind interfaces. Combined with **dependency injection**, they make systems testable (inject mocks) and flexible (swap implementations via config).

**Interview framing:** patterns are tools, not goals. Senior engineers justify patterns with concrete problems, not pattern names for their own sake.`,
      },
      {
        title: 'Singleton — Use Sparingly, Use Correctly',
        content: `**Problem:** exactly one instance needed (config, connection pool, metrics registry).

**Python idioms:**
\`\`\`python
# Module-level instance (Pythonic singleton)
# config.py
settings = Settings()  # imported everywhere

# Or functools.lru_cache on factory function
@lru_cache(maxsize=1)
def get_db_pool() -> ConnectionPool:
    return ConnectionPool(dsn=settings.database_url)
\`\`\`

**Thread safety:** lazy initialization in multi-threaded environments needs locking (double-checked locking in Java/C++). Python's GIL helps but async/concurrent code still needs care.

**Anti-patterns:**
- Singleton as global mutable state bag — hidden dependencies, untestable code
- Singleton for everything — use DI container instead
- Eager singleton preventing test isolation

**Better alternatives:** dependency injection frameworks manage lifecycle; "singleton scope" in DI is explicit and mockable.

**When legitimate:** logger, app config loaded once, hardware driver access, connection pool.`,
      },
      {
        title: 'Factory and Abstract Factory',
        content: `**Factory Method** — subclass decides what to create:
\`\`\`python
class NotificationService(ABC):
    @abstractmethod
    def create_notifier(self) -> Notifier: ...

class EmailNotificationService(NotificationService):
    def create_notifier(self) -> Notifier:
        return EmailNotifier()

class PushNotificationService(NotificationService):
    def create_notifier(self) -> Notifier:
        return PushNotifier()
\`\`\`

**Simple Factory** (not GoF but common) — one function selects implementation:
\`\`\`python
def create_payment_processor(provider: str) -> PaymentProcessor:
    processors = {
        "stripe": StripeProcessor,
        "paypal": PayPalProcessor,
    }
    return processors[provider]()
\`\`\`

**Abstract Factory** — creates *families* of related objects:
\`\`\`python
class UIFactory(ABC):
    @abstractmethod
    def create_button(self) -> Button: ...
    @abstractmethod
    def create_checkbox(self) -> Checkbox: ...

class DarkThemeFactory(UIFactory): ...
class LightThemeFactory(UIFactory): ...
\`\`\`

Use Abstract Factory when objects must be visually/behaviorally consistent within a theme or platform. Overkill for two implementations — a simple factory suffices.`,
      },
      {
        title: 'Builder and Prototype',
        content: `**Builder** — step-by-step construction of complex objects:
\`\`\`python
query = (
    QueryBuilder()
    .select("id", "name")
    .from_table("users")
    .where("active = true")
    .order_by("created_at", desc=True)
    .limit(50)
    .build()
)
\`\`\`

Builders shine when:
- Many optional parameters (telescoping constructor anti-pattern)
- Immutable result objects
- Validation during assembly (can't build invalid query)
- Fluent API readability

Language features like Python dataclasses with defaults, Kotlin data class \`copy()\`, and named parameters reduce Builder need — use patterns where language lacks ergonomics.

**Prototype** — clone existing objects instead of reconstructing:
\`\`\`python
import copy
template = load_complex_config()
tenant_config = copy.deepcopy(template)
tenant_config["tenant_id"] = "acme"
\`\`\`

Use for expensive-to-create objects, game entities, document templates. Java \`Cloneable\` is notoriously tricky — prefer explicit copy constructors or serialization-based clone.`,
      },
    ],
    example: {
      title: 'Plugin System with Factory Registry',
      language: 'python',
      code: `class StorageBackend(Protocol):
    def save(self, key: str, data: bytes) -> None: ...

class S3Storage:
    def save(self, key: str, data: bytes) -> None:
        s3_client.put_object(Bucket=BUCKET, Key=key, Body=data)

class LocalStorage:
    def save(self, key: str, data: bytes) -> None:
        Path(key).write_bytes(data)

REGISTRY: dict[str, type[StorageBackend]] = {
    "s3": S3Storage,
    "local": LocalStorage,
}

def create_storage(backend: str) -> StorageBackend:
    return REGISTRY[backend]()`,
      explanation:
        'New backends register in REGISTRY without modifying call sites. Tests inject a FakeStorage. Configuration selects backend at startup. This is Factory + Open/Closed Principle in practice.',
    },
    pitfalls: [
      'Singleton for testability — global state makes unit tests order-dependent',
      'Abstract Factory for two classes that never grow — YAGNI violation',
      'Factory with stringly-typed keys and no error handling for unknown types',
      'Builder with 50 methods when a dataclass with defaults suffices',
      'Confusing Factory Method (subclass overrides) with Simple Factory (one function)',
    ],
    summary: [
      'Creational patterns encapsulate object creation to reduce coupling',
      'Singleton manages single-instance resources — prefer DI-managed singleton scope',
      'Factory selects implementations at runtime; Abstract Factory creates consistent families',
      'Builder assembles complex objects step-by-step with validation',
      'Prototype clones expensive templates — use deep copy consciously',
    ],
    reviewQuestions: [
      {
        q: 'Your app needs one Redis connection pool. Singleton, DI, or module variable?',
        hint: 'Consider testability, lifecycle, and language idioms.',
      },
      {
        q: 'When does Abstract Factory justify its complexity over a simple factory dict?',
        hint: 'Families of related objects that must stay consistent.',
      },
      {
        q: 'Why might a senior engineer reject the Singleton pattern in new code?',
        hint: 'Hidden dependencies, global state, testing difficulty, DI alternatives.',
      },
    ],
  }),

  'design-patterns:structural': buildTextbookLesson({
    chapter: 'Structural Design Patterns',
    overview:
      'Structural patterns explain how to compose classes and objects into larger structures while keeping them flexible and efficient. They address integration problems: wrapping legacy APIs, adding behavior without subclass explosion, simplifying complex subsystems, and controlling access to resources. These patterns appear constantly in frameworks, middleware, and service layers.',
    objectives: [
      'Apply Adapter to integrate incompatible third-party interfaces',
      'Use Decorator for composable cross-cutting behavior',
      'Implement Facade to simplify complex subsystem APIs',
      'Explain Proxy variants: virtual, protection, caching, remote',
      'Compare Decorator vs inheritance vs middleware chains',
    ],
    definitions: [
      {
        term: 'Adapter',
        definition:
          'Converts one interface to another expected by clients. Wraps an existing class without modifying it.',
      },
      {
        term: 'Decorator',
        definition:
          'Attaches additional responsibilities to an object dynamically. Alternative to subclassing for extension.',
      },
      {
        term: 'Facade',
        definition:
          'Provides a unified, simplified interface to a set of interfaces in a subsystem.',
      },
      {
        term: 'Proxy',
        definition:
          'Surrogate controlling access to another object. Variants include lazy loading, access control, caching, and remote proxy.',
      },
    ],
    sections: [
      {
        title: 'Composition Over Inheritance',
        content: `Structural patterns embody **"favor composition over inheritance."** Inheritance creates tight coupling and fragile base class problems. Wrapping objects in adapters, decorators, and proxies lets you combine behaviors at runtime.

Modern examples you already use:
- **HTTP middleware** (Express, FastAPI, Django) — decorator chain on request/response
- **Python @decorator** syntax — function decorators are the Decorator pattern
- **Repository + Unit of Work** — facade over ORM complexity
- **API gateways** — facade + adapter translating internal microservice calls

Understanding structural patterns helps you read framework source code and design clean integration boundaries.`,
      },
      {
        title: 'Adapter — Making Incompatible Interfaces Work',
        content: `**Problem:** your code expects \`PaymentGateway.charge(amount)\` but Stripe SDK uses \`PaymentIntent.create(amount_cents=...)\`.

\`\`\`python
class StripeAdapter(PaymentGateway):
    def __init__(self, stripe_client):
        self._stripe = stripe_client

    def charge(self, amount: Decimal, currency: str) -> Receipt:
        intent = self._stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency=currency.lower(),
        )
        return Receipt(id=intent.id, status=intent.status)
\`\`\`

**Object adapter** (composition — shown above) vs **class adapter** (multiple inheritance — rare in Python).

Use when:
- Integrating third-party libraries you cannot modify
- Legacy system migration — old API wrapped by new interface
- Testing — adapter around real service for interface compliance

Adapters are **one-way translation layers**. Business logic should never leak adapter-specific types past the boundary.`,
      },
      {
        title: 'Decorator — Layered Behavior',
        content: `**Problem:** add logging, metrics, caching, auth to services without subclass explosion (\`LoggedCachedAuthenticatedUserService\`).

\`\`\`python
class UserService(Protocol):
    def get_user(self, id: str) -> User: ...

class CachingUserService:
    def __init__(self, inner: UserService, cache: Cache):
        self._inner = inner
        self._cache = cache

    def get_user(self, id: str) -> User:
        key = f"user:{id}"
        if cached := self._cache.get(key):
            return cached
        user = self._inner.get_user(id)
        self._cache.set(key, user, ttl=300)
        return user
\`\`\`

Stack decorators: \`Metrics(Logging(Caching(RealService())))\`.

**Decorator vs Middleware:** same idea at different scales. Function decorators wrap one function; HTTP middleware wraps request pipeline.

**Pitfall:** decorator order matters. Auth before caching — don't cache unauthorized responses. Logging outermost captures total time.`,
      },
      {
        title: 'Facade and Proxy',
        content: `**Facade** — simplify a complex subsystem:
\`\`\`python
class OrderFacade:
    def __init__(self, inventory, payment, shipping, notifications):
        self._inventory = inventory
        ...

    def place_order(self, cart: Cart) -> OrderResult:
        self._inventory.reserve(cart.items)
        receipt = self._payment.charge(cart.total)
        tracking = self._shipping.dispatch(cart.shipping_address)
        self._notifications.send_confirmation(cart.user_email)
        return OrderResult(receipt=receipt, tracking=tracking)
\`\`\`

Clients call one method; facade orchestrates four services. Your **service layer** in web apps is often a facade over repositories and external APIs.

**Proxy variants:**
- **Virtual proxy** — lazy load expensive object (load image on display)
- **Protection proxy** — check permissions before delegating
- **Caching proxy** — return cached result if fresh
- **Remote proxy** — local representative for remote service (RPC stub)

Python \`@property\`, ORM lazy relationships, and gRPC stubs are proxies in disguise.`,
      },
    ],
    example: {
      title: 'Middleware Stack as Decorator Chain',
      language: 'python',
      code: `# FastAPI-style middleware wraps the app
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(AuthenticationMiddleware)
app.add_middleware(RateLimitMiddleware)

# Each middleware: async def dispatch(request, call_next):
#     ... pre-processing ...
#     response = await call_next(request)
#     ... post-processing ...
#     return response`,
      explanation:
        'Each middleware decorates the next handler. Correlation ID outermost so all logs include it. Auth before business logic. Rate limit at edge. This is structural composition — same pattern from function decorators to distributed API gateways.',
    },
    pitfalls: [
      'Adapter that exposes third-party types to business layer — leaks abstraction',
      'Decorator stacks so deep debugging becomes impossible — limit depth, use observability',
      'Facade that grows into god object — split facades by bounded context',
      'Caching proxy without TTL or invalidation strategy — stale data bugs',
      'Confusing Decorator (same interface) with Adapter (different interface)',
    ],
    summary: [
      'Structural patterns compose objects for flexibility without inheritance explosion',
      'Adapter translates incompatible interfaces — essential for third-party integration',
      'Decorator adds behavior in layers — middleware, caching, logging',
      'Facade simplifies subsystem access — service layer pattern',
      'Proxy controls access — lazy load, cache, protect, remote stubs',
    ],
    reviewQuestions: [
      {
        q: 'You integrate a legacy XML API into your JSON REST service. Which pattern?',
        hint: 'Translation layer wrapping incompatible interface.',
      },
      {
        q: 'Decorator vs subclassing for adding metrics to 10 service classes?',
        hint: 'Composition, single responsibility, runtime stacking.',
      },
      {
        q: 'Your OrderService calls 6 repositories. Is that a bad smell?',
        hint: 'Not necessarily — could be a valid facade orchestrating a bounded transaction.',
      },
    ],
  }),

  'design-patterns:behavioral': buildTextbookLesson({
    chapter: 'Behavioral Design Patterns',
    overview:
      'Behavioral patterns focus on communication between objects and the assignment of responsibilities. They help you build flexible algorithms, event-driven systems, and clean command pipelines. Strategy, Observer, Command, and Template Method appear throughout production code — often without the formal pattern label.',
    objectives: [
      'Apply Strategy to replace conditional logic with pluggable algorithms',
      'Design Observer-based event systems and understand pub/sub trade-offs',
      'Use Command for undo, queuing, and audit trails',
      'Implement Template Method for shared algorithm skeletons',
      'Compare behavioral patterns to modern alternatives (events, lambdas, hooks)',
    ],
    definitions: [
      {
        term: 'Strategy',
        definition:
          'Defines a family of algorithms, encapsulates each, and makes them interchangeable at runtime.',
      },
      {
        term: 'Observer',
        definition:
          'Defines one-to-many dependency: when one object changes state, dependents are notified automatically.',
      },
      {
        term: 'Command',
        definition:
          'Encapsulates a request as an object, enabling parameterization, queuing, logging, and undo.',
      },
      {
        term: 'Template Method',
        definition:
          'Defines algorithm skeleton in base class; subclasses override specific steps without changing structure.',
      },
    ],
    sections: [
      {
        title: 'Strategy — Eliminating Conditional Sprawl',
        content: `**Problem:** pricing logic is a 200-line if/elif chain by customer tier, region, and promo code.

\`\`\`python
class PricingStrategy(Protocol):
    def calculate(self, cart: Cart) -> Decimal: ...

class StandardPricing:
    def calculate(self, cart: Cart) -> Decimal:
        return sum(item.price * item.qty for item in cart.items)

class PremiumMemberPricing:
    def calculate(self, cart: Cart) -> Decimal:
        subtotal = StandardPricing().calculate(cart)
        return subtotal * Decimal("0.90")  # 10% discount

class PricingEngine:
    def __init__(self, strategy: PricingStrategy):
        self._strategy = strategy

    def checkout(self, cart: Cart) -> Decimal:
        return self._strategy.calculate(cart)
\`\`\`

**Benefits:**
- Open/Closed: add \`BlackFridayPricing\` without modifying existing classes
- Testable: each strategy unit-tested in isolation
- Runtime selection via config, feature flags, or DI

**Modern equivalent:** dict of callables, discriminated unions, or policy objects. The pattern is the *idea* — interchangeable algorithms behind one interface.`,
      },
      {
        title: 'Observer and Event-Driven Architecture',
        content: `**Problem:** when order status changes, you must notify email service, analytics, inventory, and push notifications — without coupling Order to all of them.

\`\`\`python
@dataclass
class OrderShipped(Event):
    order_id: str
    tracking_number: str

class EventBus:
    def __init__(self):
        self._handlers: dict[type, list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: type, handler: Callable):
        self._handlers[event_type].append(handler)

    def publish(self, event):
        for handler in self._handlers[type(event)]:
            handler(event)
\`\`\`

**Observer** in UI: React state → re-render. **Pub/Sub** at scale: Kafka, RabbitMQ, SNS/SQS — observers decoupled across processes.

**Trade-offs:**
- Sync observers block publisher — slow handler delays everyone
- Async/event bus adds complexity — ordering, idempotency, dead letters
- Debugging "who reacted to this event?" requires tracing

Use Observer for in-process decoupling; message queues for cross-service fan-out.`,
      },
      {
        title: 'Command — Requests as First-Class Objects',
        content: `**Problem:** implement undo, job queues, transaction logs, or macro recording.

\`\`\`python
class Command(Protocol):
    def execute(self) -> None: ...
    def undo(self) -> None: ...

class TransferFunds:
    def __init__(self, from_acct, to_acct, amount):
        self._from, self._to, self._amount = from_acct, to_acct, amount

    def execute(self):
        self._from.debit(self._amount)
        self._to.credit(self._amount)

    def undo(self):
        self._to.debit(self._amount)
        self._from.credit(self._amount)
\`\`\`

**Production uses:**
- Celery/RQ tasks — serialized command objects
- CQRS write side — commands handled by specific handlers
- Audit log — every command stored with timestamp and actor
- CLI tools — each subcommand is a command object

Command pattern pairs naturally with **Invoker** (queue, scheduler) and **Receiver** (domain object that does the work).`,
      },
      {
        title: 'Template Method and Hooks',
        content: `**Problem:** multiple services share the same workflow but differ in specific steps.

\`\`\`python
class BaseExportService(ABC):
    def export(self, data):  # template method
        validated = self.validate(data)
        transformed = self.transform(validated)
        return self.write_output(transformed)

    @abstractmethod
    def validate(self, data): ...

    @abstractmethod
    def transform(self, data): ...

    @abstractmethod
    def write_output(self, data): ...

class CsvExportService(BaseExportService):
    def validate(self, data): ...
    def transform(self, data): ...
    def write_output(self, data): ...
\`\`\`

**Template Method** enforces algorithm structure; subclasses customize steps. Framework hooks (Django \`get_queryset()\`, pytest fixtures) use the same idea.

**Alternative:** composition with callable hooks instead of inheritance — often more flexible in languages favoring composition.

**Hollywood Principle:** "Don't call us, we'll call you" — framework calls your overrides at the right time.`,
      },
    ],
    example: {
      title: 'Payment Strategy with Feature Flag',
      language: 'python',
      code: `def get_payment_strategy(user: User) -> PricingStrategy:
    if feature_flags.is_enabled("dynamic_pricing", user):
        return DynamicPricingStrategy(ml_model=load_model())
    if user.tier == "premium":
        return PremiumMemberPricing()
    return StandardPricing()

engine = PricingEngine(get_payment_strategy(current_user))
total = engine.checkout(cart)`,
      explanation:
        'Strategy selection centralized in one factory function. Business checkout code unchanged when new strategies added. Feature flags enable gradual rollout of ML-based pricing.',
    },
    pitfalls: [
      'Strategy with only one implementation — premature abstraction',
      'Observer with synchronous handlers causing cascading latency failures',
      'Command without idempotency in distributed queues — duplicate execution bugs',
      'Template Method deep inheritance hierarchies — fragile override chains',
      'Event bus without schema versioning — breaking consumers on event shape change',
    ],
    summary: [
      'Strategy encapsulates interchangeable algorithms behind a common interface',
      'Observer decouples publishers from subscribers — foundation of event-driven design',
      'Command represents actions as objects — enables undo, queuing, and audit',
      'Template Method defines algorithm skeleton with customizable steps',
      'Modern code uses these ideas via lambdas, event buses, and framework hooks',
    ],
    reviewQuestions: [
      {
        q: 'Your notification system supports email, SMS, and push. Strategy or Observer?',
        hint: 'Could be both — Strategy for channel selection, Observer for event-triggered dispatch.',
      },
      {
        q: 'How do you make Command handlers safe for at-least-once delivery?',
        hint: 'Idempotency keys, deduplication, and natural idempotency in domain operations.',
      },
      {
        q: 'When does Template Method become an anti-pattern?',
        hint: 'Deep hierarchies, fragile base classes, better solved with composition.',
      },
    ],
  }),

  'design-patterns:architectural': buildTextbookLesson({
    chapter: 'Architectural Design Patterns',
    overview:
      'Architectural patterns operate at a higher level than GoF design patterns — they structure entire applications and systems. Repository, CQRS, Event Sourcing, Hexagonal Architecture, Circuit Breaker, and Bulkhead appear in system design interviews and production microservices. This chapter connects pattern names to real engineering decisions.',
    objectives: [
      'Explain MVC/MVT and how it maps to modern web frameworks',
      'Apply Repository and Unit of Work for data access abstraction',
      'Contrast CQRS and Event Sourcing with traditional CRUD',
      'Describe Hexagonal Architecture (Ports and Adapters) for testability',
      'Implement resilience patterns: Circuit Breaker and Bulkhead',
    ],
    definitions: [
      {
        term: 'Repository',
        definition:
          'Mediates between domain and data mapping layers, providing collection-like interface for domain objects.',
      },
      {
        term: 'CQRS',
        definition:
          'Command Query Responsibility Segregation — separate models for writes (commands) and reads (queries).',
      },
      {
        term: 'Event Sourcing',
        definition:
          'Store state changes as immutable events rather than current state. Current state derived by replaying events.',
      },
      {
        term: 'Circuit Breaker',
        definition:
          'Prevents cascading failures by stopping calls to a failing service and failing fast until recovery.',
      },
    ],
    sections: [
      {
        title: 'Layered and MVC Patterns',
        content: `**MVC (Model-View-Controller):** Model holds data/logic, View renders UI, Controller handles input and coordinates. Django uses MTV (Template = View, View = Controller) — naming differs, structure similar.

**Typical web layers:**
\`\`\`
Presentation (API routes, controllers)
    ↓
Application/Service (use cases, orchestration)
    ↓
Domain (entities, business rules)
    ↓
Infrastructure (DB, cache, external APIs)
\`\`\`

**Dependency rule:** inner layers never depend on outer layers. Domain knows nothing about HTTP or PostgreSQL.

Modern FastAPI/Spring apps often use: routers → services → repositories → ORM. The pattern provides **separation of concerns** and **testability** — mock repositories in service tests.`,
      },
      {
        title: 'Repository and Unit of Work',
        content: `**Repository** abstracts data access:
\`\`\`python
class UserRepository(Protocol):
    def get_by_id(self, id: UUID) -> User | None: ...
    def save(self, user: User) -> None: ...
    def find_by_email(self, email: str) -> User | None: ...
\`\`\`

Business logic depends on \`UserRepository\`, not SQLAlchemy. Tests use \`InMemoryUserRepository\`.

**Unit of Work** tracks changes across multiple repositories and commits atomically:
\`\`\`python
with unit_of_work() as uow:
    order = uow.orders.get(order_id)
    order.ship()
    uow.inventory.decrement(order.items)
    uow.commit()  # single transaction
\`\`\`

**When valuable:** complex domains, multiple aggregates per transaction, swappable persistence.

**When overkill:** simple CRUD app with one table — repository wrapping ORM adds ceremony without benefit.`,
      },
      {
        title: 'CQRS and Event Sourcing',
        content: `**CQRS** separates read and write models:

| | Write model | Read model |
|---|---|---|
| Purpose | Enforce business rules | Optimized queries |
| Storage | Normalized, transactional | Denormalized, indexed |
| Example | PostgreSQL orders table | Elasticsearch product catalog view |

Writes go through commands (\`PlaceOrder\`); reads query materialized views. Sync via events or CDC.

**Event Sourcing** stores events, not current state:
\`\`\`
OrderCreated { id, items, total }
PaymentReceived { order_id, amount }
OrderShipped { order_id, tracking }
\`\`\`
Current state = replay all events. Enables complete audit trail, temporal queries ("what was inventory on March 1?"), and event-driven integrations.

**Costs:** complexity, eventual consistency on read side, event schema evolution, snapshotting for performance.

**Use when:** audit requirements, complex domains (DDD), need for temporal queries. **Avoid when:** simple CRUD with no audit needs.`,
      },
      {
        title: 'Hexagonal Architecture',
        content: `**Ports and Adapters** — domain at center, infrastructure plugs in:

\`\`\`
         [HTTP API]  [CLI]  [Message Consumer]
              \\      |      /
               \\     |     /
            [Ports - interfaces]
                    |
              [Domain Core]
                    |
            [Ports - interfaces]
               /     |     \\
         [Postgres] [Redis] [Stripe API]
\`\`\`

**Ports** are interfaces defined by domain (\`PaymentPort\`, \`UserRepositoryPort\`).
**Adapters** are implementations (\`StripePaymentAdapter\`, \`PostgresUserRepository\`).

Swap adapters without touching domain. Test domain with fake adapters. This is the architectural expression of Dependency Inversion Principle.

**Folder structure example:**
\`\`\`
domain/         # entities, value objects, domain services
application/    # use cases, command handlers
adapters/
  inbound/      # REST, GraphQL, Kafka consumers
  outbound/     # DB repos, HTTP clients, cache
\`\`\``,
      },
      {
        title: 'Resilience Patterns',
        content: `**Circuit Breaker** — three states:
- **Closed:** requests flow normally; failures counted
- **Open:** fail fast without calling downstream (after threshold)
- **Half-open:** probe with limited requests to test recovery

Libraries: Resilience4j (Java), pybreaker (Python), Polly (.NET). Prevents thread exhaustion when payment service is down.

**Bulkhead** — isolate resources so one failure domain cannot drain the pool:
- Separate thread pools per downstream service
- Separate connection pools per database
- Kubernetes resource limits per pod

Named after ship compartments — flooding one section doesn't sink the ship.

**Combine with:** retries (exponential backoff + jitter), timeouts, fallbacks (cached response), and rate limiting.

**Interview answer:** "I'd wrap external payment calls in a circuit breaker with 5-failure threshold, 30s open window, and fallback to queue order for async retry."`,
      },
    ],
    example: {
      title: 'CQRS in an E-Commerce System',
      language: 'text',
      code: `Write side:
  POST /orders → PlaceOrderCommand → OrderAggregate → events to Kafka

Read side:
  OrderProjector consumes OrderCreated → writes to orders_read table
  GET /orders/{id} → reads denormalized orders_read (fast, no joins)

Search side:
  ProductIndexer consumes ProductUpdated → updates Elasticsearch`,
      explanation:
        'Each read model optimized for its query pattern. Write model enforces invariants. Events connect them with eventual consistency. Rebuild read models by replaying events if corrupted.',
    },
    pitfalls: [
      'CQRS for a todo app — massive complexity for no business benefit',
      'Event Sourcing without snapshot strategy — replaying 1M events on every read',
      'Repository wrapping ORM with pass-through methods adding zero abstraction',
      'Circuit breaker without monitoring — silent open state confuses operators',
      'Hexagonal architecture with 47 adapter folders for a 3-endpoint API',
    ],
    summary: [
      'Layered/MVC separates presentation, application, domain, and infrastructure',
      'Repository + Unit of Work abstract persistence for testability and flexibility',
      'CQRS splits read/write models; Event Sourcing stores immutable event logs',
      'Hexagonal architecture keeps domain independent via ports and adapters',
      'Circuit Breaker and Bulkhead prevent cascading failures in distributed systems',
    ],
    reviewQuestions: [
      {
        q: 'Your fintech app needs complete audit trail of all balance changes. Which patterns?',
        hint: 'Event Sourcing provides immutable history; CQRS may optimize read queries.',
      },
      {
        q: 'Payment service latency spikes cause your API thread pool exhaustion. Solutions?',
        hint: 'Circuit breaker, timeouts, bulkhead isolation, async processing.',
      },
      {
        q: 'When is Repository pattern over-engineering?',
        hint: 'Simple CRUD, single data source, no domain complexity, ORM already sufficient.',
      },
    ],
  }),

  'rest-api:design': buildTextbookLesson({
    chapter: 'REST API Design Principles',
    overview:
      'REST (Representational State Transfer) is an architectural style for designing networked APIs using HTTP semantics. Well-designed REST APIs are predictable, cacheable, and evolve gracefully. Poor APIs become integration nightmares. This chapter covers resource modeling, HTTP verb semantics, versioning, pagination, error handling, idempotency, and the practices that separate production-grade APIs from tutorial demos.',
    objectives: [
      'Model APIs around resources and nouns, not actions and verbs',
      'Apply HTTP methods, status codes, and headers correctly',
      'Design versioning, pagination, filtering, and error response formats',
      'Implement idempotency for safe retries on POST operations',
      'Plan authentication, rate limiting, and observability for APIs at scale',
    ],
    definitions: [
      {
        term: 'Resource',
        definition:
          'A noun identifiable by a URI — /users/42, /orders/7f3a. Resources have representations (JSON, XML) exchanged via HTTP.',
      },
      {
        term: 'Idempotent',
        definition:
          'An operation that produces the same result when executed once or multiple times. GET, PUT, DELETE are idempotent; POST is not by default.',
      },
      {
        term: 'HATEOAS',
        definition:
          'Hypermedia As The Engine Of Application State — responses include links to related actions (self, next, create). Rare in practice but part of REST maturity model.',
      },
      {
        term: 'Idempotency key',
        definition:
          'Client-provided unique key (header) ensuring duplicate POST requests create only one resource — critical for payment and order APIs.',
      },
    ],
    sections: [
      {
        title: 'Resources, URIs, and HTTP Verbs',
        content: `**Good URI design:**
\`\`\`
GET    /users              # list users
POST   /users              # create user
GET    /users/{id}         # get one user
PUT    /users/{id}         # replace user entirely
PATCH  /users/{id}         # partial update
DELETE /users/{id}         # delete user
GET    /users/{id}/orders  # nested collection
\`\`\`

**Anti-patterns:**
\`\`\`
POST /createUser           # verb in URL
GET  /users/delete/42      # destructive action via GET
POST /users/42/updateEmail # RPC-style
\`\`\`

**HTTP method semantics:**

| Method | Safe | Idempotent | Body | Use |
|--------|------|------------|------|-----|
| GET | Yes | Yes | No | Read |
| POST | No | No | Yes | Create, actions |
| PUT | No | Yes | Yes | Full replace |
| PATCH | No | Yes* | Yes | Partial update |
| DELETE | No | Yes | Optional | Remove |

*PATCH idempotency depends on design — use JSON Merge Patch or JSON Patch semantics consistently.

**Status codes** tell the story:
- \`200\` OK, \`201\` Created (with Location header), \`204\` No Content
- \`400\` Bad Request, \`401\` Unauthorized, \`403\` Forbidden, \`404\` Not Found, \`409\` Conflict, \`422\` Unprocessable Entity
- \`429\` Too Many Requests, \`500\` Internal Error, \`503\` Service Unavailable`,
      },
      {
        title: 'Request and Response Design',
        content: `**Consistent JSON envelope** (choose one style and stick to it):

\`\`\`json
// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is invalid",
    "details": [{ "field": "email", "issue": "format" }]
  },
  "request_id": "req_abc123"
}
\`\`\`

**Pagination** — cursor-based preferred at scale:
\`\`\`json
GET /users?limit=20&cursor=eyJpZCI6NDJ9

{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6NjJ9",
    "has_more": true
  }
}
\`\`\`

Offset pagination (\`?page=3&limit=20\`) is simple but slow and inconsistent under concurrent inserts.

**Filtering and sorting:**
\`\`\`
GET /products?category=electronics&min_price=50&sort=-created_at
\`\`\`

Document supported filters in OpenAPI spec. Reject unknown params or ignore explicitly — don't silently misbehave.

**Partial responses:** field selection (\`?fields=id,name,email\`) reduces payload but complicates caching — use sparingly.`,
      },
      {
        title: 'Versioning, Evolution, and Compatibility',
        content: `**Versioning strategies:**

1. **URL path** — \`/v1/users\` (most common, visible, easy to route)
2. **Header** — \`Accept: application/vnd.myapi.v2+json\` (clean URLs, harder to test in browser)
3. **Query param** — \`?version=2\` (least preferred)

**Breaking vs non-breaking changes:**
- **Non-breaking:** add optional fields, add endpoints, add enum values (if clients handle unknown)
- **Breaking:** remove fields, change types, rename fields, change URL structure

**Deprecation policy:** \`Sunset\` header, \`Deprecation\` header (RFC 9745), changelog, migration guide, minimum 6–12 month overlap.

**OpenAPI (Swagger)** as contract — generate client SDKs, validate requests, document auth. Treat published API as **contract** — consumers depend on stability.

For internal microservices, consider consumer-driven contract tests (Pact) to catch breaking changes in CI.`,
      },
      {
        title: 'Security, Auth, and Rate Limiting',
        content: `**Authentication patterns:**
- **API keys** — simple, for server-to-server; rotate regularly; never in URLs
- **JWT (Bearer token)** — stateless, short-lived access token + refresh token
- **OAuth 2.0 / OIDC** — delegated auth for third-party apps

\`\`\`
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
\`\`\`

**Authorization** is separate — 401 (not authenticated) vs 403 (authenticated but not permitted).

**Rate limiting:**
\`\`\`
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 742
X-RateLimit-Reset: 1700003600
Retry-After: 60
\`\`\`

Per-user, per-IP, per-API-key tiers. Token bucket or sliding window algorithms.

**Security essentials:** HTTPS only, input validation, output encoding, CORS configured deliberately, no sensitive data in URLs, correlation IDs for tracing, audit logs for mutations.`,
      },
      {
        title: 'Production-Grade API Practices',
        content: `**Idempotency for POST:**
\`\`\`
POST /payments
Idempotency-Key: uuid-v4-unique-per-attempt

# Server stores key → response mapping for 24h
# Retry with same key returns original response, no double charge
\`\`\`

**Caching:**
- GET responses cacheable with \`ETag\` / \`If-None-Match\` → \`304 Not Modified\`
- \`Cache-Control: max-age=3600\` for public data
- Never cache authenticated personalized responses without careful Vary headers

**Observability:**
- Correlation/request ID in every response header
- Structured logging with user_id, endpoint, latency, status
- Metrics: request rate, error rate, latency histograms per endpoint
- Distributed tracing (OpenTelemetry) across services

**Designing for 100M users (interview framing):** API gateway, cursor pagination, idempotency keys, versioning, rate limiting, circuit breakers to downstreams, multi-region read replicas, CDN for static responses, async processing for heavy operations (202 Accepted + webhook/polling).`,
      },
    ],
    example: {
      title: 'Order Creation with Idempotency',
      language: 'http',
      code: `POST /v1/orders HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "items": [{ "product_id": "prod_101", "quantity": 2 }],
  "shipping_address_id": "addr_55"
}

HTTP/1.1 201 Created
Location: /v1/orders/order_7f3a
X-Request-Id: req_xyz789

{
  "id": "order_7f3a",
  "status": "pending",
  "total": 59.98,
  "created_at": "2026-03-15T10:00:00Z"
}`,
      explanation:
        'Client generates unique idempotency key per checkout attempt. Network timeout → safe retry with same key. Server returns 201 on first success, same 201 body on duplicate — no double order. Location header enables discovery of created resource.',
    },
    pitfalls: [
      'Using GET for state-changing operations — breaks caching, enables CSRF via img tags',
      'Returning 200 with error in body — use proper HTTP status codes',
      'Inconsistent error formats across endpoints — clients cannot parse generically',
      'Offset pagination on large datasets — performance degrades linearly',
      'No idempotency on payment/order POST — network retries cause duplicate charges',
    ],
    summary: [
      'Model APIs as resources with nouns; HTTP verbs express actions on resources',
      'Use correct status codes, consistent error envelopes, and correlation IDs',
      'Cursor pagination, filtering, and OpenAPI contracts enable scalable APIs',
      'Version deliberately with deprecation policy; distinguish breaking changes',
      'Idempotency keys, rate limiting, and caching are essential for production APIs',
    ],
    reviewQuestions: [
      {
        q: 'PUT vs PATCH — when would you choose each?',
        hint: 'Full replacement vs partial update; idempotency and client capabilities.',
      },
      {
        q: 'Client retries POST after timeout. How do you prevent duplicate orders?',
        hint: 'Idempotency-Key header with server-side deduplication store.',
      },
      {
        q: 'Design pagination for a feed with 500M items. Offset or cursor?',
        hint: 'Cursor-based; stable sort key; avoid deep offset cost.',
      },
    ],
  }),

  'graphql:fundamentals': buildTextbookLesson({
    chapter: 'GraphQL Fundamentals',
    overview:
      'GraphQL is a query language and runtime for APIs that lets clients request exactly the data they need in a single round trip. Developed by Facebook in 2012 and open-sourced in 2015, it addresses over-fetching and under-fetching problems common in REST. This chapter covers schemas, types, queries, mutations, subscriptions, and resolvers — the building blocks of every GraphQL server.',
    objectives: [
      'Define GraphQL schemas with types, queries, mutations, and relationships',
      'Explain how resolvers map fields to data sources',
      'Compare GraphQL strengths and weaknesses vs REST',
      'Design schemas that evolve without breaking clients',
      'Understand the execution model: query tree traversal and resolver chain',
    ],
    definitions: [
      {
        term: 'Schema',
        definition:
          'The contract defining all types, queries, mutations, and subscriptions. Strongly typed and introspectable.',
      },
      {
        term: 'Resolver',
        definition:
          'Function that fetches data for a specific field. Receives parent, args, context, and info parameters.',
      },
      {
        term: 'Query',
        definition:
          'Read operation. GraphQL queries mirror the shape of the response — clients request nested fields explicitly.',
      },
      {
        term: 'Mutation',
        definition:
          'Write operation. Typically returns the modified object and any errors. Not inherently idempotent — design carefully.',
      },
    ],
    sections: [
      {
        title: 'The GraphQL Execution Model',
        content: `A GraphQL server has one primary endpoint (usually \`POST /graphql\`). Clients send a query document:

\`\`\`graphql
query GetUserWithOrders($userId: ID!) {
  user(id: $userId) {
    name
    email
    orders(first: 5) {
      edges {
        node {
          id
          total
          items { productName quantity }
        }
      }
    }
  }
}
\`\`\`

The response mirrors the query shape exactly:
\`\`\`json
{
  "data": {
    "user": {
      "name": "Alice",
      "email": "alice@example.com",
      "orders": { "edges": [{ "node": { "id": "o1", "total": 59.98, ... }}]}
    }
  }
}
\`\`\`

**No over-fetching:** client gets only requested fields.
**No under-fetching:** nested data in one request, not N+1 REST calls.

The server parses the query, validates against schema, builds an execution plan, and calls **resolvers** field by field, depth-first.`,
      },
      {
        title: 'Schema Definition Language (SDL)',
        content: `\`\`\`graphql
type User {
  id: ID!
  name: String!
  email: String!
  orders(first: Int = 10, after: String): OrderConnection!
  createdAt: DateTime!
}

type Order {
  id: ID!
  total: Float!
  status: OrderStatus!
  items: [OrderItem!]!
  user: User!
}

enum OrderStatus { PENDING SHIPPED DELIVERED CANCELLED }

type Query {
  user(id: ID!): User
  users(search: String, limit: Int): [User!]!
}

type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
}

input CreateOrderInput {
  userId: ID!
  items: [OrderItemInput!]!
}

type CreateOrderPayload {
  order: Order
  errors: [UserError!]
}
\`\`\`

**Type system rules:**
- \`!\` means non-null
- \`[Type]\` is a list; \`[Type!]!\` is non-null list of non-null items
- \`ID\`, \`String\`, \`Int\`, \`Float\`, \`Boolean\` are scalars
- Custom scalars: \`DateTime\`, \`JSON\`, \`Email\`

**Input types** for mutations; **payload types** with \`errors\` array for partial failures (GraphQL errors vs domain errors).`,
      },
      {
        title: 'Resolvers and Context',
        content: `\`\`\`javascript
const resolvers = {
  Query: {
    user: (_, { id }, ctx) => ctx.db.users.findById(id),
  },
  User: {
    orders: (user, { first, after }, ctx) =>
      ctx.db.orders.findByUserId(user.id, { limit: first, cursor: after }),
  },
  Order: {
    items: (order, _, ctx) => ctx.db.orderItems.findByOrderId(order.id),
  },
};
\`\`\`

**Resolver signature:** \`(parent, args, context, info)\`
- **parent** — result from parent field resolver
- **args** — field arguments
- **context** — shared per request (db, auth user, DataLoaders)
- **info** — query AST, schema (for advanced optimization)

**Context** is created per request — attach authenticated user, database connection, and DataLoader instances here.

**Default resolvers** return parent properties by field name — explicit resolvers only needed for computed fields, relations, or transformations.`,
      },
      {
        title: 'Mutations, Subscriptions, and Errors',
        content: `**Mutations** should be named as verbs and return payload types:
\`\`\`graphql
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    order { id status total }
    errors { field message }
  }
}
\`\`\`

Run mutations **serially** (GraphQL spec) — unlike queries which can be parallelized. Design for idempotency where possible.

**Subscriptions** — real-time via WebSocket (graphql-ws protocol):
\`\`\`graphql
subscription OnOrderShipped($userId: ID!) {
  orderShipped(userId: $userId) {
    order { id trackingNumber }
  }
}
\`\`\`

Powered by pub/sub (Redis, Kafka). Scale requires dedicated subscription infrastructure.

**Error handling:**
- **GraphQL errors** — syntax, validation, resolver exceptions (top-level \`errors\` array)
- **Domain errors** — business logic failures in payload \`errors\` field (preferred for user-facing validation)

Partial results: GraphQL can return \`data\` and \`errors\` simultaneously if non-null field resolver fails.`,
      },
      {
        title: 'GraphQL vs REST — Honest Trade-offs',
        content: `| Aspect | GraphQL | REST |
|--------|---------|------|
| Endpoints | One | Many resources |
| Response shape | Client-defined | Server-defined |
| Versioning | Evolve schema, deprecate fields | URL/header versions |
| Caching | Complex (POST, nested) | HTTP caching built-in |
| File upload | Awkward (multipart spec) | Straightforward |
| Learning curve | Schema + resolvers + N+1 | HTTP semantics |

**Choose GraphQL when:**
- Multiple clients (web, mobile, TV) need different data shapes
- Complex nested UIs (social feeds, dashboards)
- Strong typing and introspection valued (codegen for clients)

**Choose REST when:**
- Simple CRUD, public API, heavy caching needs
- Browser-facing with standard HTTP tooling
- Team unfamiliar with GraphQL operational complexity

**Schema evolution:** add new fields (non-breaking), deprecate with \`@deprecated(reason: "...")\`, never remove without migration period. Nullable new fields are backward compatible.`,
      },
    ],
    example: {
      title: 'Resolver Chain for Nested Query',
      language: 'text',
      code: `Query: user(id: "42") { name orders { total } }

Execution:
1. Query.user resolver → fetches User { id: 42, name: "Alice" }
2. User.name resolver → default, returns "Alice"
3. User.orders resolver → fetches orders for user 42
4. Order.total resolver → default for each order

Without DataLoader: 1 query for user + N queries for orders (if N orders)
With DataLoader: 1 query for user + 1 batched query for all orders`,
      explanation:
        'GraphQL executes resolvers per field per parent object. Naive nested resolvers cause N+1 database queries — the most common GraphQL performance pitfall, covered in the next chapter.',
    },
    pitfalls: [
      'God query — clients request deeply nested data without limits',
      'Mutations without input validation — same security needs as REST',
      'Ignoring introspection in production — disable or protect in sensitive APIs',
      'Assuming GraphQL replaces API gateway concerns — still need auth, rate limiting',
      'Schema without pagination on lists — returning unbounded arrays',
    ],
    summary: [
      'GraphQL lets clients specify exact data needs in one typed query',
      'Schema (SDL) defines types, queries, mutations; resolvers fetch data per field',
      'Context carries per-request dependencies; default resolvers handle simple fields',
      'Mutations for writes, subscriptions for real-time — design payloads with error arrays',
      'GraphQL trades HTTP caching simplicity for flexible client-driven queries',
    ],
    reviewQuestions: [
      {
        q: 'Why does GraphQL use a single endpoint instead of resource URLs?',
        hint: 'Client-driven queries; server routes by operation name and field selection.',
      },
      {
        q: 'How do you deprecate a field without breaking mobile apps?',
        hint: '@deprecated directive, nullable replacement, migration period.',
      },
      {
        q: 'REST returns 404 for missing user. How does GraphQL handle this?',
        hint: 'Nullable field returns null in data; or errors array for resolver exceptions.',
      },
    ],
  }),

  'graphql:n-plus-1': buildTextbookLesson({
    chapter: 'GraphQL N+1 Problem and DataLoader',
    overview:
      'The N+1 query problem is the most critical performance issue in GraphQL APIs. A single query for a list of N items can trigger N additional database queries for related data — turning one HTTP request into database meltdown. DataLoader, developed by Facebook, solves this with batching and per-request caching. This chapter explains the problem, the solution, and production safeguards against expensive queries.',
    objectives: [
      'Identify N+1 query patterns in GraphQL resolver execution',
      'Implement DataLoader for batched and cached data fetching',
      'Apply query complexity analysis and depth limiting',
      'Design pagination and list limits to prevent abuse',
      'Monitor and debug slow GraphQL operations in production',
    ],
    definitions: [
      {
        term: 'N+1 problem',
        definition:
          'One query fetches N parent objects, then N separate queries fetch related data — total N+1 database round trips.',
      },
      {
        term: 'DataLoader',
        definition:
          'Utility that batches multiple load requests into one query and caches results within a single request lifecycle.',
      },
      {
        term: 'Query complexity',
        definition:
          'Calculated cost of a query based on field weights and depth — used to reject expensive queries before execution.',
      },
      {
        term: 'Persisted queries',
        definition:
          'Pre-registered query whitelist — clients send query ID instead of full query text. Reduces attack surface.',
      },
    ],
    sections: [
      {
        title: 'Understanding the N+1 Problem',
        content: `Consider this query:
\`\`\`graphql
query {
  users(limit: 100) {
    id
    name
    posts { title }
  }
}
\`\`\`

**Naive resolver execution:**
1. \`Query.users\` → \`SELECT * FROM users LIMIT 100\` (1 query)
2. For each of 100 users, \`User.posts\` resolver runs:
   \`SELECT * FROM posts WHERE user_id = ?\` (100 queries)

**Total: 101 queries** for one GraphQL request. At 1000 users: 1001 queries.

This is invisible to the client — the query looks reasonable. The problem is **resolver granularity**: one resolver per field per parent object, executed independently.

The same problem exists in ORMs (Hibernate N+1) and REST if you naively fetch relations. GraphQL makes it easier to trigger because clients freely nest relations.`,
      },
      {
        title: 'DataLoader — Batching and Caching',
        content: `\`\`\`javascript
// Created once per request in context
function createLoaders(db) {
  return {
    postsByUserId: new DataLoader(async (userIds) => {
      const posts = await db.posts.findByUserIds(userIds);
      // Must return array same length as userIds, each position matching
      const grouped = groupBy(posts, 'user_id');
      return userIds.map(id => grouped[id] || []);
    }),
  };
}

// In resolver
User: {
  posts: (user, _, ctx) => ctx.loaders.postsByUserId.load(user.id),
}
\`\`\`

**How it works:**
1. During one event loop tick, DataLoader collects all \`.load(userId)\` calls
2. Calls batch function once with \`[1, 2, 3, ..., 100]\`
3. Single query: \`SELECT * FROM posts WHERE user_id IN (1,2,3,...,100)\`
4. Returns results mapped back to each caller
5. **Cache:** second \`.load(42)\` in same request returns cached result

**Rules:**
- Create new DataLoader instances **per request** (not global — stale data across requests)
- Batch function must return arrays in **same order** as input keys
- Handle missing keys (return null or empty array per position)`,
      },
      {
        title: 'Beyond DataLoader — SQL JOINs and Lookahead',
        content: `DataLoader is not the only solution:

**JOIN in parent resolver** — if query always needs posts, fetch users with posts in one SQL JOIN:
\`\`\`sql
SELECT u.*, p.id as post_id, p.title
FROM users u LEFT JOIN posts p ON p.user_id = u.id
LIMIT 100
\`\`\`
Then map flat rows to nested structure. Optimal when relation is always requested.

**GraphQL lookahead** — inspect \`info\` AST to know which child fields are requested:
\`\`\`javascript
const requestedFields = graphqlFields(info);
if (requestedFields.posts) {
  // eager load posts
}
\`\`\`

Libraries: \`graphql-parse-resolve-info\`, Prisma's include based on selection set.

**Dataloader vs JOIN:** DataLoader is generic and works across any relation; JOIN optimization is query-specific but faster when you know the shape.`,
      },
      {
        title: 'Protecting Against Query Abuse',
        content: `GraphQL's flexibility enables malicious queries:

\`\`\`graphql
query Attack {
  users {
    posts {
      comments {
        author {
          posts {
            comments { body }
          }
        }
      }
    }
  }
}
\`\`\`

**Defenses:**

1. **Depth limiting** — reject queries deeper than N levels (e.g., 7)
2. **Complexity analysis** — assign cost per field; reject above threshold
\`\`\`javascript
const rule = createComplexityLimitRule(1000, {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
});
\`\`\`
3. **Pagination required** — all lists must use \`first\`/\`after\` with max limit
4. **Timeout** — kill queries exceeding 5–10 seconds
5. **Rate limiting by complexity** — expensive queries consume more quota
6. **Persisted queries** — production clients send only registered query hashes
7. **Introspection disabled** in production (or auth-gated)

**Monitoring:** log slow queries, field execution times, DataLoader batch sizes. Apollo Studio, GraphQL Armor, and custom middleware help.`,
      },
    ],
    example: {
      title: 'Before and After DataLoader',
      language: 'text',
      code: `Before (N+1):
  GET /graphql → 1 user query + 100 post queries = 101 DB round trips
  Latency: ~500ms at 5ms/query

After (DataLoader):
  GET /graphql → 1 user query + 1 batched post query = 2 DB round trips
  Latency: ~15ms

After (JOIN optimization for this query shape):
  GET /graphql → 1 JOIN query = 1 DB round trip
  Latency: ~8ms`,
      explanation:
        'DataLoader is the baseline fix for any GraphQL API with relations. JOIN optimization is the next level when query patterns are predictable. Always measure — premature JOIN optimization complicates resolvers.',
    },
    pitfalls: [
      'Global DataLoader instance — cache leaks data across users/requests',
      'Batch function not returning results in input key order — wrong data mapped to wrong parent',
      'DataLoader for single-item lookups only — missing batch opportunity',
      'No query limits — one client can DOS your database with nested queries',
      'Ignoring N+1 in mutations that return nested objects — same problem on write path',
    ],
    summary: [
      'N+1 occurs when list resolvers trigger individual queries per item',
      'DataLoader batches loads within one request tick and caches per request',
      'Create fresh DataLoaders per request; batch functions must preserve key order',
      'JOIN and lookahead optimizations complement DataLoader for hot paths',
      'Protect APIs with depth limits, complexity analysis, pagination, and timeouts',
    ],
    reviewQuestions: [
      {
        q: 'Why must DataLoader be created per request, not per application?',
        hint: 'Per-request cache isolation and preventing cross-user data leakage.',
      },
      {
        q: 'A query requests users and posts. When is JOIN better than DataLoader?',
        hint: 'Always-requested relation, known query shape, performance-critical path.',
      },
      {
        q: 'How would you rate-limit a GraphQL API differently from REST?',
        hint: 'Cost-based limiting by query complexity, not just requests per minute.',
      },
    ],
  }),

  'grpc:protobuf': buildTextbookLesson({
    chapter: 'Protocol Buffers',
    overview:
      'Protocol Buffers (protobuf) is Google\'s language-neutral, platform-neutral mechanism for serializing structured data. It is smaller and faster than JSON, enforces schemas via .proto files, and generates code for dozens of languages. Protobuf is the foundation of gRPC — understanding message design, field numbering, and schema evolution is essential for modern microservice communication.',
    objectives: [
      'Write .proto files defining messages and services',
      'Understand wire format advantages over JSON',
      'Apply field numbering rules for backward and forward compatibility',
      'Generate and use code from protobuf definitions',
      'Design protobuf schemas that evolve safely in production',
    ],
    definitions: [
      {
        term: 'Protocol Buffer',
        definition:
          'Binary serialization format with schema defined in .proto files. Messages are encoded as field number + wire type + value.',
      },
      {
        term: 'Field number',
        definition:
          'Unique integer identifier for each field in a message. Used on the wire — never changes once deployed.',
      },
      {
        term: 'proto3',
        definition:
          'Current protobuf syntax version. Simplified semantics: all fields optional by default, no required keyword.',
      },
      {
        term: 'Code generation',
        definition:
          'protoc compiler generates language-specific classes/structs from .proto files for type-safe serialization.',
      },
    ],
    sections: [
      {
        title: 'Why Protobuf Over JSON',
        content: `| Aspect | Protobuf | JSON |
|--------|----------|------|
| Format | Binary | Text |
| Size | 3–10× smaller | Human readable |
| Parse speed | Faster (no text parsing) | Slower |
| Schema | Required .proto file | Optional (JSON Schema) |
| Browser | Needs conversion | Native |
| Streaming | Native with gRPC | Separate protocols |

**When protobuf wins:**
- Internal microservice communication (high throughput, low latency)
- Mobile apps with bandwidth constraints
- Polyglot systems needing shared contracts
- gRPC streaming APIs

**When JSON wins:**
- Public/browser APIs
- Debugging with curl and human-readable logs
- Rapid prototyping without schema compilation step

Protobuf payloads are not human-readable — use grpcurl, Buf Studio, or logging middleware with JSON conversion for debugging.`,
      },
      {
        title: 'Defining Messages and Services',
        content: `\`\`\`protobuf
syntax = "proto3";

package ecommerce.v1;

option go_package = "github.com/acme/ecommerce/v1";

import "google/protobuf/timestamp.proto";

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
  UserRole role = 4;
  google.protobuf.Timestamp created_at = 5;
}

enum UserRole {
  USER_ROLE_UNSPECIFIED = 0;
  USER_ROLE_ADMIN = 1;
  USER_ROLE_CUSTOMER = 2;
}

message GetUserRequest {
  int32 id = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser(CreateUserRequest) returns (User);
}
\`\`\`

**Scalar types:** double, float, int32, int64, uint32, uint64, bool, string, bytes.

**Repeated** = array. **Map** = key-value. **oneof** = exactly one of several fields.

**Well-known types:** Timestamp, Duration, Empty, Any, Struct — import from google/protobuf/.`,
      },
      {
        title: 'Schema Evolution Rules',
        content: `Protobuf's killer feature: **backward and forward compatibility** if you follow rules:

**DO:**
- Add new fields with **new field numbers** (never reuse)
- Use optional/new fields with sensible defaults
- Mark deprecated fields: \`string old_field = 3 [deprecated = true];\`
- Reserve deleted field numbers: \`reserved 3, 5; reserved "old_field";\`
- Use \`UNSPECIFIED = 0\` as first enum value

**NEVER:**
- Change field numbers (wire format breaks)
- Change field types (int32 → string on same number)
- Reuse field numbers after deletion (old data may have those fields)

**How it works:** old clients ignore unknown field numbers; new clients see missing fields as defaults.

**Example safe evolution:**
\`\`\`protobuf
message Product {
  int32 id = 1;
  string name = 2;
  double price = 3;
  // v2: added optional field
  string description = 4;
  // v3: deprecated price, added money type
  double price = 3 [deprecated = true];
  Money price_v2 = 5;
}
\`\`\`

Use **Buf** for linting, breaking change detection, and schema registry in CI.`,
      },
      {
        title: 'Code Generation and Tooling',
        content: `**Compile .proto to Python:**
\`\`\`bash
python -m grpc_tools.protoc \\
  -I./protos \\
  --python_out=./generated \\
  --grpc_python_out=./generated \\
  protos/user.proto
\`\`\`

**Generated code usage:**
\`\`\`python
from generated import user_pb2, user_pb2_grpc

request = user_pb2.GetUserRequest(id=42)
# Serialize to bytes
data = request.SerializeToString()
# Deserialize
parsed = user_pb2.User()
parsed.ParseFromString(data)
\`\`\`

**Tooling ecosystem:**
- **Buf** — modern protobuf toolchain (lint, format, breaking changes, BSR registry)
- **grpcurl** — curl for gRPC servers
- **protoc-gen-validate** — field validation rules in .proto
- **grpc-gateway** — generate REST API from .proto annotations

**Package organization:** version in package path (\`ecommerce.v1\`) — create \`v2\` package for breaking changes instead of in-place breakage.`,
      },
    ],
    example: {
      title: 'Safe Field Addition',
      language: 'protobuf',
      code: `// v1 — deployed to production
message Order {
  int32 id = 1;
  int32 user_id = 2;
  double total = 3;
}

// v2 — backward compatible addition
message Order {
  int32 id = 1;
  int32 user_id = 2;
  double total = 3;
  string currency = 4;        // new field, old clients ignore
  OrderStatus status = 5;     // new enum field
}

// v3 — deprecate and reserve
message Order {
  reserved 3;
  reserved "total";
  int32 id = 1;
  int32 user_id = 2;
  Money amount = 6;           // replacement for total
  string currency = 4;
  OrderStatus status = 5;
}`,
      explanation:
        'v2 clients work with v1 servers (ignore unknown fields). v1 clients work with v2 servers (missing fields default to zero/empty). v3 reserves field 3 so no future field accidentally reuses the old total wire format.',
    },
    pitfalls: [
      'Reusing field numbers after deletion — silent data corruption with old stored messages',
      'Changing field types on same number — breaks wire compatibility',
      'Missing UNSPECIFIED = 0 enum value — cannot distinguish unset from first value',
      'Huge messages without pagination — ListUsers returning millions of records',
      'No breaking change detection in CI — teams ship incompatible schema changes',
    ],
    summary: [
      'Protobuf provides compact binary serialization with strong schema contracts',
      'Messages and services defined in .proto files; code generated per language',
      'Field numbers (not names) identify fields on the wire — never reuse numbers',
      'Backward compatibility: add optional fields; reserve removed fields',
      'Use Buf, grpcurl, and validation plugins for production protobuf workflows',
    ],
    reviewQuestions: [
      {
        q: 'You need to rename a field from user_name to display_name. Safe?',
        hint: 'Rename in .proto is wire-safe (numbers unchanged); generated code changes.',
      },
      {
        q: 'Why is changing int32 price to string price on field 3 dangerous?',
        hint: 'Same field number, different wire type — parsers fail or misinterpret data.',
      },
      {
        q: 'How do old clients handle a new enum value they do not recognize?',
        hint: 'Received as unknown enum value (numeric); handle UNRECOGNIZED or default.',
      },
    ],
  }),

  'grpc:grpc-vs-rest': buildTextbookLesson({
    chapter: 'gRPC vs REST',
    overview:
      'gRPC and REST are the two dominant API styles for service communication. REST uses HTTP with JSON (typically) and resource-oriented URLs; gRPC uses HTTP/2 with protobuf and service-oriented RPC methods. Neither is universally superior — the choice depends on client type, performance needs, team skills, and operational requirements. This chapter gives you a decision framework for interviews and architecture reviews.',
    objectives: [
      'Compare gRPC and REST across protocol, performance, and tooling dimensions',
      'Identify ideal use cases for each approach',
      'Explain HTTP/2 benefits that gRPC leverages',
      'Discuss browser limitations and grpc-web workarounds',
      'Plan hybrid architectures using both styles appropriately',
    ],
    definitions: [
      {
        term: 'gRPC',
        definition:
          'High-performance RPC framework using HTTP/2, protobuf serialization, and service definitions in .proto files.',
      },
      {
        term: 'HTTP/2',
        definition:
          'Binary protocol with multiplexing, header compression, and server push. gRPC requires HTTP/2.',
      },
      {
        term: 'grpc-web',
        definition:
          'Proxy-based solution enabling browser clients to call gRPC services with limited feature support.',
      },
      {
        term: 'OpenAPI',
        definition:
          'Specification for REST APIs (formerly Swagger). Enables documentation, codegen, and validation.',
      },
    ],
    sections: [
      {
        title: 'Side-by-Side Comparison',
        content: `| Feature | gRPC | REST |
|---------|------|------|
| Protocol | HTTP/2, binary | HTTP/1.1 or HTTP/2, typically JSON |
| Contract | .proto (required) | OpenAPI (optional) |
| Payload size | Small (protobuf) | Larger (JSON text) |
| Latency | Lower (binary parse, multiplexing) | Higher (text parse) |
| Streaming | Built-in (4 modes) | SSE, WebSocket (separate) |
| Browser | Limited (grpc-web proxy) | Native |
| Caching | Not HTTP-cacheable | ETag, Cache-Control |
| Human debug | grpcurl, specialized tools | curl, browser DevTools |
| Codegen | protoc → strong types | OpenAPI → client SDKs |
| Versioning | package versioning (v1, v2) | URL/header versioning |

**Performance numbers (rule of thumb):** gRPC often 5–10× faster serialization and 30–50% smaller payloads vs JSON — matters at thousands of RPS between services, less at human-scale request rates.`,
      },
      {
        title: 'When to Choose gRPC',
        content: `**Ideal scenarios:**
- **Internal microservices** — service-to-service, no browser involved
- **Low latency requirements** — real-time bidding, gaming backends, financial trading
- **Polyglot systems** — shared .proto generates Java, Go, Python, C++ clients
- **Streaming** — live feeds, log tailing, bidirectional chat between services
- **Strong contracts** — schema enforced at compile time, breaking change detection
- **Mobile backends** — bandwidth-sensitive, battery-conscious

**Real architecture example:**
\`\`\`
Mobile App → REST/JSON API Gateway → gRPC → [UserSvc, OrderSvc, PaymentSvc]
                                         ↕ gRPC
                                    InventorySvc
\`\`\`

Public edge speaks REST; internal mesh speaks gRPC. **grpc-gateway** or **Envoy transcoding** translates REST to gRPC at the gateway.`,
      },
      {
        title: 'When to Choose REST',
        content: `**Ideal scenarios:**
- **Public APIs** consumed by third parties
- **Browser-first applications** — no proxy layer wanted
- **Simple CRUD** with standard HTTP semantics
- **HTTP caching** — CDN, browser cache, ETag conditional requests
- **Team familiarity** — faster onboarding, vast tooling ecosystem
- **Debugging and support** — customers can reproduce issues with curl

**REST advantages often underestimated:**
- Universal understanding in interviews and across teams
- API gateways, WAFs, and load balancers have mature REST support
- Webhooks and callbacks are naturally HTTP POST
- File upload/download without protobuf bytes handling

**Don't choose gRPC because it's trendy** — operational cost of protobuf tooling, limited browser support, and harder debugging are real.`,
      },
      {
        title: 'Hybrid Architectures and Migration',
        content: `**Strangler pattern for REST → gRPC migration:**
1. Define .proto matching existing REST resources
2. Implement gRPC server alongside REST
3. Migrate internal consumers to gRPC clients
4. Add grpc-gateway for external REST compatibility
5. Deprecate direct REST when all consumers migrated

**Service mesh integration:** Istio, Linkerd provide mTLS, retries, circuit breaking for gRPC traffic transparently.

**Load balancing:** gRPC uses HTTP/2 long-lived connections — need **L7 load balancing** aware of gRPC (Envoy, nginx with grpc module), not just round-robin TCP.

**Observability:** OpenTelemetry supports both. gRPC metadata maps to trace headers. Protobuf messages need JSON logging for human-readable debug.

**Interview answer template:** "I'd use REST at the API gateway for external clients — caching, familiarity, browser support. Internal services communicate via gRPC for performance, typing, and streaming. Contract defined in protobuf, shared via Buf schema registry, with breaking change detection in CI."`,
      },
    ],
    example: {
      title: 'Decision Matrix for a Fintech Platform',
      language: 'text',
      code: `Component              | Choice  | Reason
-----------------------|---------|----------------------------------
Public mobile API       | REST    | Browser tools, caching, onboarding
Payment service ↔ Ledger| gRPC    | Low latency, strong typing, mTLS
Real-time notifications | gRPC streaming | Server push to connected services
Partner webhooks        | REST    | External POST callbacks
Admin dashboard API     | REST    | Simple CRUD, HTTP caching
Risk scoring service    | gRPC    | High RPS internal calls`,
      explanation:
        'Each boundary evaluated independently. External = REST for compatibility. Internal high-throughput = gRPC. Streaming = gRPC native. No religion — pragmatic per-boundary decisions.',
    },
    pitfalls: [
      'gRPC for browser-facing API without grpc-web proxy plan',
      'REST between 50 microservices at 10k RPS — JSON parsing becomes bottleneck',
      'No schema registry — protobuf contracts drift across teams',
      'L4 load balancer with gRPC — uneven distribution due to connection pinning',
      'Choosing gRPC when team has zero protobuf experience and tight deadline',
    ],
    summary: [
      'gRPC: HTTP/2 + protobuf, fast, typed, streaming — best for internal services',
      'REST: HTTP + JSON, universal, cacheable, debuggable — best for public APIs',
      'Hybrid architectures use REST at edge, gRPC internally',
      'grpc-gateway bridges REST clients to gRPC backends',
      'Choose based on client type, performance needs, and team capabilities — not hype',
    ],
    reviewQuestions: [
      {
        q: 'Your startup has one monolith and a React frontend. gRPC or REST?',
        hint: 'Browser client, small team, simplicity — REST unless strong reason otherwise.',
      },
      {
        q: 'Why does gRPC need L7 load balancing?',
        hint: 'HTTP/2 multiplexes many RPCs over one TCP connection.',
      },
      {
        q: 'How would you expose gRPC services to a partner who only supports REST?',
        hint: 'grpc-gateway, Envoy transcoding, or dedicated REST adapter service.',
      },
    ],
  }),

  'grpc:streaming': buildTextbookLesson({
    chapter: 'gRPC Streaming',
    overview:
      'gRPC supports four communication patterns: unary, server streaming, client streaming, and bidirectional streaming. Streaming enables real-time data transfer without the overhead of repeated unary calls — essential for live feeds, bulk uploads, chat, and log aggregation. This chapter explains each pattern, implementation considerations, and production challenges like backpressure and connection management.',
    objectives: [
      'Distinguish unary, server, client, and bidirectional streaming',
      'Implement each streaming pattern with appropriate use cases',
      'Handle backpressure, flow control, and error propagation in streams',
      'Choose streaming vs polling vs message queues for real-time data',
      'Operate streaming gRPC in production with timeouts and reconnection',
    ],
    definitions: [
      {
        term: 'Unary RPC',
        definition:
          'Single request, single response — equivalent to traditional REST call. Simplest gRPC pattern.',
      },
      {
        term: 'Server streaming',
        definition:
          'Client sends one request; server streams multiple responses. E.g., live stock prices, search results.',
      },
      {
        term: 'Client streaming',
        definition:
          'Client streams multiple requests; server sends one response. E.g., file upload, batch sensor data.',
      },
      {
        term: 'Bidirectional streaming',
        definition:
          'Both sides stream independently. E.g., chat, collaborative editing, real-time gaming.',
      },
    ],
    sections: [
      {
        title: 'The Four RPC Patterns',
        content: `\`\`\`protobuf
service DataService {
  // Unary — like REST
  rpc GetSnapshot(GetRequest) returns (Snapshot);

  // Server streaming — one request, many responses
  rpc WatchPrices(WatchRequest) returns (stream PriceUpdate);

  // Client streaming — many requests, one response
  rpc UploadMetrics(stream MetricPoint) returns (UploadSummary);

  // Bidirectional — both stream
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
\`\`\`

| Pattern | Request | Response | Analogy |
|---------|---------|----------|---------|
| Unary | 1 | 1 | HTTP request/response |
| Server streaming | 1 | N | Download, live feed |
| Client streaming | N | 1 | Upload, batch ingest |
| Bidirectional | N | N | WebSocket, chat |

All patterns use HTTP/2 streams under the hood — multiplexed on a single connection with flow control.`,
      },
      {
        title: 'Server Streaming in Practice',
        content: `**Use cases:** live dashboards, log tailing, large result sets without loading all into memory, progressive search results.

**Server (Python):**
\`\`\`python
class PriceService(price_pb2_grpc.PriceServiceServicer):
    async def WatchPrices(self, request, context):
        symbols = set(request.symbols)
        async for tick in market_data_stream():
            if tick.symbol in symbols:
                yield price_pb2.PriceUpdate(
                    symbol=tick.symbol,
                    price=tick.price,
                    timestamp=tick.ts,
                )
\`\`\`

**Client:**
\`\`\`python
async for update in stub.WatchPrices(request):
    process(update)
\`\`\`

**Benefits over polling:** lower latency (push vs poll interval), less server load (no repeated requests), efficient use of HTTP/2 connection.

**Considerations:** client must handle stream interruption and reconnect; server must handle slow consumers (backpressure via HTTP/2 flow control).`,
      },
      {
        title: 'Client and Bidirectional Streaming',
        content: `**Client streaming — bulk upload:**
\`\`\`python
async def UploadMetrics(self, request_iterator, context):
    count = 0
    total_bytes = 0
    async for metric in request_iterator:
        await store(metric)
        count += 1
        total_bytes += metric.ByteSize()
    return upload_pb2.UploadSummary(count=count, bytes=total_bytes)
\`\`\`

Client sends stream of MetricPoint messages; server responds once with summary.

**Bidirectional streaming — chat:**
\`\`\`python
async def Chat(self, request_iterator, context):
    outgoing = asyncio.Queue()
    async def read_incoming():
        async for msg in request_iterator:
            await broadcast(msg, outgoing)
    async def write_outgoing():
        while True:
            msg = await outgoing.get()
            yield msg
    # Coordinate read and write tasks...
\`\`\`

Most complex pattern — requires careful concurrency handling. Consider if WebSocket or message queue (Kafka) is simpler for your use case.`,
      },
      {
        title: 'Production Concerns',
        content: `**Backpressure:** HTTP/2 flow control limits unacked data. Slow client → server blocks on yield when window full. Monitor stream stalls.

**Deadlines and cancellation:**
\`\`\`python
context.set_deadline(time.time() + 30)  # 30 second max stream life
# Client cancellation propagates — server should clean up resources
\`\`\`

**Reconnection:** clients must detect broken streams and reconnect with cursor/offset:
\`\`\`protobuf
message WatchRequest {
  repeated string symbols = 1;
  string resume_token = 2;  // last received event ID
}
\`\`\`

**Load balancing:** long-lived streams pin to one server — use consistent hashing or dedicated streaming nodes.

**Alternatives to consider:**
- **Kafka/Pulsar** — durable, replayable event streams with consumer groups
- **WebSocket** — browser-native bidirectional
- **Server-Sent Events** — simpler server-to-client push over HTTP

**Choose gRPC streaming when:** both endpoints are gRPC services, low latency matters, and you want typed protobuf messages over the wire. **Choose message queue when:** durability, replay, and fan-out to many consumers matter more than latency.`,
      },
    ],
    example: {
      title: 'Log Tailing with Server Streaming',
      language: 'protobuf',
      code: `// log_service.proto
message TailRequest {
  string service_name = 1;
  string min_level = 2;       // INFO, WARN, ERROR
  google.protobuf.Timestamp since = 3;
}

message LogEntry {
  google.protobuf.Timestamp timestamp = 1;
  string level = 2;
  string message = 3;
  map<string, string> fields = 4;
}

service LogService {
  rpc TailLogs(TailRequest) returns (stream LogEntry);
}

// Client receives entries as they are emitted — no polling`,
      explanation:
        'Operator opens TailLogs stream filtered by service and level. Server yields LogEntry messages in real time. Client displays in terminal UI. On disconnect, client reconnects with since = last timestamp.',
    },
    pitfalls: [
      'Bidirectional streaming when a message queue would provide durability and replay',
      'No deadline on infinite streams — zombie connections consume server resources',
      'Ignoring client disconnect — server goroutines leak continuing to produce',
      'Loading entire client stream into memory before processing — process incrementally',
      'L4 load balancer breaking long-lived HTTP/2 streams on node failure without reconnect logic',
    ],
    summary: [
      'gRPC offers unary, server streaming, client streaming, and bidirectional streaming',
      'Server streaming suits live feeds; client streaming suits bulk uploads',
      'Bidirectional streaming enables chat-like patterns but adds concurrency complexity',
      'HTTP/2 flow control provides backpressure; set deadlines and handle cancellation',
      'Compare streaming gRPC with message queues and WebSocket for each use case',
    ],
    reviewQuestions: [
      {
        q: 'Design real-time order status updates for a mobile app. gRPC stream or WebSocket?',
        hint: 'Mobile to backend — consider existing protocol, battery, reconnect, intermediaries.',
      },
      {
        q: 'Server streams 1M records but client crashes at 500K. How to resume?',
        hint: 'Resume tokens, cursor in request, idempotent replay from checkpoint.',
      },
      {
        q: 'When is Kafka better than gRPC bidirectional streaming?',
        hint: 'Durability, multiple consumers, replay, decoupling, buffering during outages.',
      },
    ],
  }),
};
