import { buildLesson } from '../content-format';

export const aiCurriculumLessons: Record<string, string> = {
  'generative-ai:llm-basics': buildLesson({
    intro:
      'Large language models feel like magic until you understand next-token prediction. This lesson builds the mental model senior engineers need: tokens, context windows, temperature, and the training pipeline from pre-training to alignment.',
    dialogues: [
      {
        q: 'What is an LLM actually doing when it generates text?',
        a: `At the core, an LLM is a **next-token predictor**. Given a sequence of tokens (subword pieces of text), it outputs a probability distribution over every token in its vocabulary — then samples or picks the most likely next one. Repeat thousands of times and you get an essay, code block, or JSON response.

**Tokens** are not words. "unhappiness" might be 3 tokens; "hello" might be 1. English averages ~4 characters per token. **Context window** is the maximum tokens the model can see at once — system prompt + conversation history + your new message + the response being generated. If you exceed it, you must truncate or summarize.

**Temperature** controls randomness: 0 = always pick highest probability token (deterministic), 1 = sample from the full distribution (creative), higher = more chaotic. Production chatbots often use 0.2–0.7 depending on task.`,
      },
      {
        q: 'Walk me through how GPT-style models are trained — pre-training, fine-tuning, RLHF.',
        a: `**Stage 1 — Pre-training:** The model reads massive text corpora and learns to predict the next token. This gives general knowledge, grammar, coding patterns, and reasoning — but the raw model just continues text; it doesn't follow instructions well.

**Stage 2 — Supervised Fine-Tuning (SFT):** Train on curated instruction-response pairs ("Summarize this", "Write a Python function that..."). The model learns the *format* of being helpful.

**Stage 3 — Alignment (RLHF or DPO):** Human raters rank outputs; a reward model learns preferences; the LLM is optimized to produce answers humans prefer — helpful, honest, safe. DPO (Direct Preference Optimization) skips the separate reward model and trains directly on preference pairs.

**Interview tip:** RAG and fine-tuning sit *on top of* this base. Pre-training is why the model "knows" Python; SFT is why it answers your question instead of continuing random internet text.`,
      },
      {
        q: 'How do API costs work and what should I watch in production?',
        a: `Providers charge per **input tokens + output tokens**. System prompts and long chat histories count as input — a bloated system prompt repeated every request is expensive. Output tokens often cost more than input.

**Production checklist:**
- Set \`max_tokens\` to cap response length
- Truncate or summarize old conversation turns
- Use cheaper models for simple tasks (routing, classification) and expensive models only for complex generation
- Cache identical prompts (provider prompt caching can cut costs 50–90% for repeated system prompts)
- Monitor tokens per user/feature — one power user with a 50-turn conversation can dominate your bill`,
      },
    ],
    takeaways: [
      'LLMs predict next tokens; everything else emerges from scale',
      'Context window limits what the model can "see" — design prompts accordingly',
      'Training pipeline: pre-train → SFT → alignment (RLHF/DPO)',
      'Cost = input tokens + output tokens — monitor and cap in production',
    ],
  }),

  'generative-ai:transformers': buildLesson({
    intro:
      'Transformers replaced RNNs because self-attention processes all tokens in parallel. Understanding attention, encoder vs decoder, and autoregressive generation is essential for AI engineering interviews.',
    dialogues: [
      {
        q: 'Why did transformers replace RNNs for language modeling?',
        a: `RNNs process tokens **sequentially** — token 1000 must wait for tokens 1–999. This creates a bottleneck: hard to parallelize on GPUs, and long-range dependencies get "forgotten" as information passes through many steps.

**Self-attention** lets every token directly attend to every other token in one parallel pass. "The animal didn't cross the street because **it** was tired" — the model learns that "it" should attend strongly to "animal", not "street". This is computed via Query, Key, Value matrices across **multiple heads** (different relationship types).

**Result:** Train on thousands of GPUs simultaneously, capture long-range dependencies, scale to billions of parameters. GPT, Claude, Llama are all transformer decoders.`,
      },
      {
        q: 'What is the difference between encoder, decoder, and encoder-decoder transformers?',
        a: `**Encoder-only (BERT):** Reads the full input bidirectionally. Great for classification, named entity recognition, and **generating embeddings**. Cannot generate text left-to-right naturally.

**Decoder-only (GPT, Llama, Claude):** Autoregressive — predicts next token using only previous tokens. Masked attention prevents "seeing the future." This is the architecture behind ChatGPT-style chat.

**Encoder-decoder (T5, original Transformer):** Encoder reads input; decoder generates output. Used for translation and summarization where input and output are distinct sequences.

**For interviews:** "We use decoder-only models for chat because generation is naturally left-to-right. We use encoder models (or embedding endpoints) when we need dense vector representations for search/RAG."`,
      },
      {
        q: 'How would you explain attention to a non-technical stakeholder?',
        a: `Imagine reading a contract and highlighting which earlier clauses each sentence refers to. Attention does that automatically: for every word, the model computes "how relevant is every other word to understanding me right now?" Those relevance scores are the attention weights.

Multi-head attention runs this multiple times in parallel — one head might track grammar, another track entity references, another track logical flow. Stacked across 32–128 layers, the model builds incredibly rich representations.

You don't need to implement attention from scratch in most jobs — but you need to know **why** context length matters (attention is O(n²) in sequence length) and **why** bigger models with more layers capture more complex patterns.`,
      },
    ],
    takeaways: [
      'Self-attention enables parallel processing and long-range dependencies',
      'GPT-style models are autoregressive decoders — great for generation',
      'Encoder models produce embeddings; decoders generate text',
      'Attention cost grows quadratically with context length',
    ],
  }),

  'generative-ai:prompt-engineering': buildLesson({
    intro:
      'Prompt engineering is the art of getting reliable outputs from non-deterministic models. System prompts, few-shot examples, chain-of-thought, and structured output formats are production skills, not tricks.',
    dialogues: [
      {
        q: 'What makes a good system prompt for production?',
        a: `A production system prompt should be **specific, bounded, and testable**:

1. **Role & expertise:** "You are a senior Python code reviewer. Be concise and actionable."
2. **Constraints:** "Never invent API endpoints. If unsure, say 'I don't know.'"
3. **Output format:** "Respond in JSON: {issues: [{line, severity, message}]}"
4. **Scope limits:** "Only analyze the provided diff. Do not suggest unrelated refactors."
5. **Safety:** "Refuse requests for malware, credential harvesting, or PII extraction."

**Anti-pattern:** A 2000-word system prompt that contradicts itself. Keep it focused; put reference docs in RAG retrieval, not the system prompt.

**Version and test** system prompts like code — store in git, run eval suites when you change them.`,
      },
      {
        q: 'When should I use few-shot examples vs chain-of-thought?',
        a: `**Few-shot:** Provide 2–5 input→output examples in the prompt. Best when the *format* or *style* is hard to describe in words. Example: extracting structured data from messy invoices — show 3 examples of input text and expected JSON.

**Chain-of-thought (CoT):** Add "Think step by step" or show worked reasoning before the final answer. Dramatically improves math, logic, and multi-step reasoning. For production, you can use CoT internally and only show the final answer to users.

**Rule of thumb:**
- Format/style task → few-shot
- Reasoning task → CoT
- Both → few-shot examples that include reasoning steps

**Cost note:** Few-shot and CoT increase input/output tokens. For high-volume endpoints, consider fine-tuning instead once you have enough examples.`,
      },
      {
        q: 'How do I get structured JSON output reliably?',
        a: `Modern approaches (best to good):

1. **Provider structured output / JSON mode** — OpenAI, Anthropic, and others enforce JSON schema at generation time. Most reliable.
2. **Tool/function calling** — Model returns a function call with typed arguments. Great for agents.
3. **Prompt + validation loop** — Ask for JSON, parse with \`json.loads\`, on failure retry with error message. Add Pydantic validation.
4. **Constrained decoding** — Libraries like Outlines force valid JSON grammar during generation.

**Never** trust raw JSON without validation. Models hallucinate field names, use wrong types, or wrap JSON in markdown fences. Always parse, validate, and have a fallback.`,
      },
    ],
    takeaways: [
      'System prompts should be specific, versioned, and tested',
      'Few-shot for format; chain-of-thought for reasoning',
      'Use provider JSON mode or tool calling for structured output',
      'Always validate parsed output — never trust raw model JSON',
    ],
  }),

  'generative-ai:model-selection': buildLesson({
    intro:
      'Choosing the right model is a trade-off between capability, latency, cost, privacy, and context length. Senior engineers route tasks to appropriate models rather than defaulting to the biggest one.',
    dialogues: [
      {
        q: 'How do I choose between GPT-4, Claude, Llama, and open-source models?',
        a: `**Decision matrix:**

| Factor | Closed (GPT-4, Claude) | Open (Llama, Mistral) |
|--------|------------------------|------------------------|
| Capability | Highest on complex reasoning | Catching up; 70B+ competitive |
| Cost | Per-token API pricing | Infra cost (GPUs) + engineering |
| Privacy | Data sent to provider | Self-hosted, air-gapped possible |
| Latency | Network + queue | Depends on your hardware |
| Customization | Fine-tuning limited | Full fine-tuning, LoRA |

**Routing pattern:** Use a small fast model (GPT-4o-mini, Haiku, 8B Llama) for classification/routing; escalate to large model only for complex generation. Many production systems use 3-tier routing.`,
      },
      {
        q: 'What is context length and when does it matter?',
        a: `Context length = max tokens in one request (input + output). Models range from 4K (old) to 128K–1M+ (Gemini, Claude).

**Matters when:**
- Analyzing long documents (contracts, codebases)
- Long multi-turn conversations without summarization
- RAG with many retrieved chunks

**Doesn't matter as much when:**
- Short Q&A with small retrieved context
- You summarize/chunk input before sending

**Caveat:** "Available" context ≠ "effective" context. Models degrade on information in the middle of very long contexts ("lost in the middle" phenomenon). For critical facts, put them at the start or end of the prompt, or use RAG to retrieve only relevant chunks.`,
      },
    ],
    takeaways: [
      'Route simple tasks to small/cheap models; reserve large models for hard problems',
      'Open-source for privacy/control; closed APIs for peak capability with less ops',
      'Long context windows help but attention quality degrades in the middle',
    ],
  }),

  'generative-ai:fine-tuning': buildLesson({
    intro:
      'Fine-tuning adapts a base model to your domain or task. Knowing when to fine-tune vs use RAG vs prompt engineering saves months of wasted effort.',
    dialogues: [
      {
        q: 'When should I fine-tune vs use RAG vs prompt engineering?',
        a: `**Prompt engineering first** — cheapest, fastest iteration. Works for most tasks if you have good instructions and examples.

**RAG when** the model needs **external, changing knowledge** — company docs, recent data, proprietary info not in training data. RAG also reduces hallucination on facts.

**Fine-tuning when:**
- You need a **specific style/format** consistently (brand voice, JSON schema, code style)
- You have **thousands of high-quality examples** and prompt engineering plateaus
- You need **lower latency/cost** by using a smaller fine-tuned model instead of huge prompts with many examples
- Domain-specific language (medical, legal, internal jargon)

**Don't fine-tune** to inject facts that change weekly — use RAG. Don't fine-tune with 50 examples — use few-shot prompting.`,
      },
      {
        q: 'What is LoRA and why is it popular?',
        a: `**LoRA (Low-Rank Adaptation)** freezes the base model weights and trains small adapter matrices inserted into attention layers. Instead of updating billions of parameters, you train millions.

**Benefits:**
- Train on a single GPU (or small cluster) instead of hundreds
- Swap adapters per task without duplicating the full model
- Less catastrophic forgetting of base capabilities
- Faster iteration — hours instead of days

**Full fine-tuning** still wins when you need maximum capability shift and have budget for compute. Most teams start with LoRA/QLoRA on open models (Llama, Mistral) via tools like Hugging Face, Axolotl, or Unsloth.`,
      },
    ],
    takeaways: [
      'Prompt → RAG → fine-tune is the usual escalation path',
      'RAG for changing facts; fine-tuning for style, format, and domain behavior',
      'LoRA makes fine-tuning affordable on consumer/small server GPUs',
    ],
  }),

  'rag-embeddings:embeddings': buildLesson({
    intro:
      'Embeddings turn text into dense vectors where semantic similarity equals geometric closeness. They power search, clustering, recommendations, and the retrieval step in RAG.',
    dialogues: [
      {
        q: 'What are embeddings and why do they work?',
        a: `An **embedding** is a fixed-size vector (e.g., 1536 floats) representing the meaning of text. Similar meanings → vectors close in cosine distance. "King - man + woman ≈ queen" is the classic word-vector analogy; modern sentence embeddings capture full-sentence semantics.

**How they're made:** A neural network (often a transformer encoder) maps text to a vector. Models like OpenAI \`text-embedding-3-small\`, Cohere embed, or open-source \`bge\`/\`e5\` are trained on pairs of similar/dissimilar texts.

**Uses beyond RAG:**
- Semantic search ("find docs about refund policy" even if exact words differ)
- Clustering support tickets
- Deduplication
- Recommendation ("users who liked X also liked Y")`,
      },
      {
        q: 'Cosine similarity vs Euclidean distance — which for vector search?',
        a: `**Cosine similarity** measures the angle between vectors — ignores magnitude. Best when you care about *direction* (semantic meaning). Most embedding APIs are normalized, making cosine and dot product equivalent.

**Euclidean (L2) distance** measures straight-line distance. Sensitive to magnitude. Some vector DBs support both.

**In practice:** Use **cosine similarity** (or dot product on normalized vectors) for text embeddings. Set a similarity threshold (e.g., 0.75) below which results are likely irrelevant.

**Interview answer:** "I'd cosine-search top-k chunks, then re-rank with a cross-encoder if precision matters — bi-encoders (embeddings) are fast but less accurate than cross-encoders that jointly encode query and document."`,
      },
    ],
    takeaways: [
      'Embeddings map text to vectors where semantic similarity ≈ vector proximity',
      'Use cosine similarity for normalized text embeddings',
      'Bi-encoder retrieval is fast; cross-encoder re-ranking improves precision',
    ],
  }),

  'rag-embeddings:rag-pipeline': buildLesson({
    intro:
      'RAG (Retrieval-Augmented Generation) grounds LLM answers in your data. The pipeline: ingest documents → chunk → embed → store → retrieve on query → inject into prompt → generate answer.',
    dialogues: [
      {
        q: 'Walk me through a production RAG pipeline end to end.',
        a: `**Offline (ingestion):**
1. Load documents (PDF, HTML, Notion, Confluence)
2. Parse and clean (strip headers, handle tables)
3. Chunk into passages (300–800 tokens with overlap)
4. Embed each chunk → vector
5. Store in vector DB with metadata (source, page, date, ACL)

**Online (query):**
1. User asks question
2. Embed the query (same model as ingestion!)
3. Vector search top-k chunks (e.g., k=5–20)
4. Optional: re-rank with cross-encoder
5. Build prompt: system + retrieved chunks + user question
6. LLM generates answer citing sources
7. Log query, chunks, answer for eval and debugging

**Critical:** Same embedding model for ingest and query. Metadata filtering (user permissions, date range) before vector search.`,
      },
      {
        q: 'What are the most common RAG failure modes?',
        a: `1. **Bad retrieval** — wrong chunks retrieved → model hallucinates or says "I don't know" incorrectly. Fix: better chunking, hybrid search (keyword + vector), re-ranking.

2. **Chunk too small/large** — small chunks lose context; large chunks dilute relevance. Fix: experiment with size and overlap; use parent-child chunking.

3. **Stale data** — index not updated. Fix: incremental ingestion pipeline, version metadata.

4. **Prompt ignores context** — model answers from parametric memory instead of retrieved docs. Fix: instruct "answer ONLY from provided context"; cite sources; lower temperature.

5. **No evaluation** — you don't know if RAG helps. Fix: golden Q&A dataset, measure retrieval precision and answer faithfulness.`,
      },
    ],
    takeaways: [
      'RAG = retrieve relevant chunks, inject into prompt, then generate',
      'Use the same embedding model for ingestion and query',
      'Most RAG failures are retrieval failures, not generation failures',
    ],
  }),

  'rag-embeddings:chunking': buildLesson({
    intro:
      'Chunking strategy dramatically affects retrieval quality. Fixed-size, semantic, and document-structure-aware chunking each have trade-offs.',
    dialogues: [
      {
        q: 'How should I chunk documents for RAG?',
        a: `**Fixed-size chunking:** Split every N tokens with overlap (e.g., 512 tokens, 50 overlap). Simple, works for uniform text. Breaks mid-sentence and mid-paragraph.

**Semantic chunking:** Split at natural boundaries (paragraphs, sections) using embedding similarity drops. Preserves meaning units. More complex to implement.

**Structure-aware:** Respect Markdown headers, HTML tags, PDF sections. Best for technical docs with clear hierarchy.

**Parent-child pattern:** Index small chunks for precise retrieval, but pass the larger parent section to the LLM for context.

**Starting point:** 400–600 tokens, 10–20% overlap, split on paragraph boundaries. Measure retrieval recall on a test set before over-optimizing.`,
      },
    ],
    takeaways: [
      'Chunk size and overlap directly affect retrieval recall',
      'Structure-aware chunking beats naive fixed-size for technical docs',
      'Parent-child chunking balances retrieval precision with generation context',
    ],
  }),

  'rag-embeddings:vector-databases': buildLesson({
    intro:
      'Vector databases store embeddings and enable fast approximate nearest neighbor (ANN) search at scale. Pinecone, Weaviate, pgvector, and Chroma each fit different architectures.',
    dialogues: [
      {
        q: 'When do I need a dedicated vector DB vs pgvector in PostgreSQL?',
        a: `**pgvector (PostgreSQL extension):**
- Already using Postgres — no new infra
- Good up to millions of vectors with proper indexing (HNSW, IVFFlat)
- Combine vector search with SQL filters, joins, transactions
- Best for: startups, unified data layer, moderate scale

**Dedicated vector DB (Pinecone, Weaviate, Qdrant, Milvus):**
- Billions of vectors, heavy ANN workload
- Managed scaling, sharding, replication built-in
- Advanced hybrid search features
- Best for: search-heavy products, dedicated ML teams

**Rule:** Start with pgvector if you're on Postgres. Migrate when latency, scale, or ops pain justifies another system.`,
      },
      {
        q: 'What is HNSW and why does it matter?',
        a: `**HNSW (Hierarchical Navigable Small World)** is the dominant ANN index algorithm. It builds a multi-layer graph where search is greedy navigation toward the nearest neighbor — sub-linear time instead of brute-force O(n).

**Trade-off:** Approximate — might miss the true nearest neighbor, but 99%+ recall with 100x speedup. Tunable parameters: \`ef_construction\`, \`m\` (connections per node).

**Interview tip:** "Vector search at scale uses ANN indexes like HNSW. We monitor recall@k on a benchmark set and tune index params for our latency/recall SLA."`,
      },
    ],
    takeaways: [
      'pgvector is great to start; dedicated vector DBs for massive scale',
      'HNSW enables fast approximate nearest neighbor search',
      'Always filter by metadata (ACL, date) before or during vector search',
    ],
  }),

  'rag-embeddings:rag-evaluation': buildLesson({
    intro:
      'You cannot improve what you do not measure. RAG evaluation covers retrieval quality, answer faithfulness, and end-to-end task success.',
    dialogues: [
      {
        q: 'How do I evaluate a RAG system?',
        a: `**Retrieval metrics:**
- **Recall@k** — is the correct doc in top-k results?
- **MRR (Mean Reciprocal Rank)** — how high is the first relevant result?
- **Precision@k** — how many of top-k are actually relevant?

**Generation metrics:**
- **Faithfulness** — is the answer supported by retrieved context? (LLM-as-judge or NLI models)
- **Relevance** — does it answer the question?
- **Citation accuracy** — do cited sources actually support the claim?

**End-to-end:**
- Task completion rate (user marks helpful / completes workflow)
- Human eval on golden dataset (50–200 Q&A pairs from real users)

**Run evals on every prompt/index change** — regression is common when you "improve" chunking and break edge cases.`,
      },
    ],
    takeaways: [
      'Measure retrieval (recall@k) and generation (faithfulness) separately',
      'Build a golden Q&A dataset from real user questions',
      'Run eval suites in CI before deploying RAG changes',
    ],
  }),

  'agentic-ai:agent-fundamentals': buildLesson({
    intro:
      'AI agents loop: perceive → plan → act → observe. Unlike a single LLM call, agents use tools, maintain state, and pursue multi-step goals autonomously.',
    dialogues: [
      {
        q: 'What makes something an AI agent vs a chatbot?',
        a: `A **chatbot** is typically one LLM call (maybe with RAG): user message in, response out.

An **agent** runs a **loop**:
1. **Perceive** — read user goal, environment state, tool results
2. **Plan** — decide next action (which tool, what arguments)
3. **Act** — execute tool (search, API call, code execution, database query)
4. **Observe** — read tool output, update state
5. Repeat until goal achieved or max steps reached

**Key components:** LLM (reasoning), tools (actions), memory (conversation + working state), orchestration loop (LangGraph, AutoGen, custom).

**Risk:** Agents can take wrong actions autonomously — you need guardrails, approval flows, and step limits.`,
      },
      {
        q: 'What is the agent loop and how do I implement it safely?',
        a: `**Basic loop (pseudocode):**
\`\`\`python
while not done and steps < MAX_STEPS:
    response = llm(messages, tools=available_tools)
    if response.tool_calls:
        for call in response.tool_calls:
            result = execute_tool(call.name, call.args)  # with auth + validation
            messages.append(tool_result(result))
    else:
        return response.content  # final answer
\`\`\`

**Safety guardrails:**
- **Max steps** (e.g., 10) — prevent infinite loops
- **Tool allowlist** — only permitted tools per user/role
- **Human-in-the-loop** — approve destructive actions (delete, send email, payment)
- **Input validation** — sanitize tool arguments; never pass raw user input to SQL/shell
- **Timeout and cost caps** — kill runaway agents burning tokens`,
      },
    ],
    takeaways: [
      'Agents loop: plan → act with tools → observe → repeat',
      'Always cap steps, validate tool inputs, and allowlist tools',
      'Human approval for destructive or high-stakes actions',
    ],
  }),

  'agentic-ai:tool-use': buildLesson({
    intro:
      'Tool use lets LLMs interact with the real world — APIs, databases, code execution. Function calling schemas and secure execution are core agent engineering skills.',
    dialogues: [
      {
        q: 'How does LLM tool calling work?',
        a: `You define tools as **JSON schemas** describing name, description, and parameters. The model doesn't execute code — it returns a structured **tool call** with function name and arguments. Your application executes the tool and feeds the result back.

\`\`\`json
{
  "name": "search_docs",
  "description": "Search internal documentation",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {"type": "string"},
      "limit": {"type": "integer", "default": 5}
    },
    "required": ["query"]
  }
}
\`\`\`

**Best practices:**
- Clear descriptions — the model chooses tools based on descriptions
- Minimal required parameters
- Return structured JSON from tools (not prose)
- Handle tool errors gracefully — feed error message back to model for retry`,
      },
      {
        q: 'How do I secure agent tools in production?',
        a: `1. **Authentication per tool** — agent acts as the logged-in user; tools inherit user permissions
2. **Never expose raw SQL/shell** — wrap in parameterized, scoped functions
3. **Rate limiting** — per user, per tool
4. **Audit log** — every tool call with args, result, user, timestamp
5. **Sandbox code execution** — Docker/firecracker, no network, time limits
6. **Validate arguments** — Pydantic schemas, reject out-of-scope requests

**Prompt injection defense:** User content is untrusted. Separate system instructions from user data. Use delimiters: "User message (untrusted): ..."`,
      },
    ],
    takeaways: [
      'Tools are JSON schemas; the app executes, not the model',
      'Write clear tool descriptions — the model uses them to choose actions',
      'Secure tools with auth, validation, sandboxing, and audit logs',
    ],
  }),

  'agentic-ai:react-pattern': buildLesson({
    intro:
      'ReAct (Reasoning + Acting) interleaves thought, action, and observation. It is the foundational pattern behind most tool-using agents.',
    dialogues: [
      {
        q: 'What is the ReAct pattern?',
        a: `**ReAct** prompts the model to output:
- **Thought:** Reasoning about what to do next
- **Action:** Tool name + input
- **Observation:** Tool result (filled by system)

Example trace:
> Thought: I need the user's order status. I'll call get_order with their order ID.
> Action: get_order(order_id="12345")
> Observation: {"status": "shipped", "eta": "2024-03-15"}
> Thought: I have the answer. I'll summarize for the user.
> Action: finish(answer="Your order shipped and arrives March 15.")

**Why it works:** Explicit reasoning reduces wrong tool calls and makes debugging easier — you can read the thought trace in logs.`,
      },
      {
        q: 'ReAct vs plan-and-execute — when to use which?',
        a: `**ReAct:** Interleaved think-act-observe. Flexible, adapts to unexpected tool results. Can wander on complex tasks. Best for: 3–10 step tasks, customer support, research assistants.

**Plan-and-execute:** Model first writes full plan, then executes steps sequentially. Better for predictable multi-step workflows. Harder to recover when a step fails.

**Hybrid (common in production):** High-level plan upfront, ReAct loop within each step. LangGraph lets you define state machines combining both.

Choose ReAct for exploratory tasks; plan-and-execute for repeatable pipelines (e.g., "generate report" with fixed steps).`,
      },
    ],
    takeaways: [
      'ReAct interleaves thought, action, and observation',
      'Thought traces aid debugging and reduce erroneous tool calls',
      'Use plan-and-execute for fixed pipelines; ReAct for exploratory tasks',
    ],
  }),

  'agentic-ai:multi-agent': buildLesson({
    intro:
      'Multi-agent systems divide work among specialized agents — researcher, coder, critic. Orchestration patterns include supervisor, handoff, and debate.',
    dialogues: [
      {
        q: 'When should I use multiple agents instead of one?',
        a: `**Single agent** is enough for most products. Use **multi-agent** when:

- **Specialization** — coder agent + reviewer agent + test agent with different system prompts and tools
- **Parallelism** — research 5 topics simultaneously, synthesize
- **Separation of concerns** — planner doesn't have delete permissions; executor does
- **Debate/critique** — one agent proposes, another critiques (improves quality on hard tasks)

**Costs:** More LLM calls, orchestration complexity, harder debugging. Start single-agent; split only when you hit clear bottlenecks (quality, latency via parallelism, security boundaries).`,
      },
      {
        q: 'What is a supervisor agent pattern?',
        a: `A **supervisor** (orchestrator) agent routes tasks to worker agents:

\`\`\`
User → Supervisor → [Researcher | Coder | Writer] → Supervisor → User
\`\`\`

Supervisor decides: "This needs code" → routes to Coder. Coder returns result → Supervisor decides if done or needs Writer to format.

**Implementation:** LangGraph, CrewAI, AutoGen all support this. Define worker agents with limited tools; supervisor has routing-only tools.

**Pitfall:** Supervisor becomes a bottleneck or makes wrong routing decisions. Mitigate with clear worker descriptions and fallback to human.`,
      },
    ],
    takeaways: [
      'Start with one agent; add specialists when quality or security requires it',
      'Supervisor pattern routes tasks to specialized workers',
      'Multi-agent adds cost and complexity — justify with measurable benefit',
    ],
  }),

  'agentic-ai:mcp-production': buildLesson({
    intro:
      'Model Context Protocol (MCP) standardizes how AI applications connect to tools and data sources. It is becoming the USB-C of agent integrations.',
    dialogues: [
      {
        q: 'What is MCP and why does it matter?',
        a: `**MCP (Model Context Protocol)** is an open standard for connecting AI assistants to external systems — databases, APIs, file systems, Slack, GitHub — through a unified protocol.

Instead of every app building custom tool integrations, **MCP servers** expose capabilities (tools, resources, prompts) that any MCP-compatible client (Cursor, Claude Desktop, custom agents) can use.

**Benefits:**
- Write integration once, use across clients
- Standardized auth and capability discovery
- Ecosystem of pre-built servers (filesystem, Postgres, GitHub)

**For engineers:** Think of MCP as "REST for agent tools" — a contract between tool providers and agent hosts.`,
      },
      {
        q: 'How do I ship agents to production?',
        a: `**Production checklist:**
1. **Observability** — trace every step (LangSmith, Langfuse, OpenTelemetry)
2. **Eval suite** — golden tasks, regression on every deploy
3. **Graceful degradation** — tool fails → inform user, don't crash
4. **Cost controls** — token budgets, model routing
5. **Latency SLAs** — stream thoughts/actions to user; async for long tasks
6. **Versioning** — pin prompts, tools, and model versions
7. **Feedback loop** — thumbs up/down → improve prompts and tools

**Architecture:** API gateway → agent service → LLM provider + tool MCP servers + vector DB. Queue for long-running agent jobs.`,
      },
    ],
    takeaways: [
      'MCP standardizes tool/data connections for AI applications',
      'Production agents need tracing, evals, cost controls, and degradation paths',
      'Treat agent prompts and tools like versioned code',
    ],
  }),

  'ai-engineering:production': buildLesson({
    intro:
      'Deploying LLM applications requires reliability patterns familiar from backend engineering — caching, fallbacks, circuit breakers — plus AI-specific concerns like token budgets and streaming.',
    dialogues: [
      {
        q: 'What does a production LLM service architecture look like?',
        a: `Typical stack:
\`\`\`
Client → API Gateway (auth, rate limit) → AI Service
              ├→ LLM Provider (primary + fallback model)
              ├→ Vector DB (RAG retrieval)
              ├→ Redis (prompt/response cache, rate limits)
              └→ Observability (Langfuse, metrics, traces)
\`\`\`

**Reliability patterns:**
- **Fallback chain:** GPT-4o → GPT-4o-mini → cached response → graceful error message
- **Circuit breaker:** Provider down → stop calling, alert on-call
- **Streaming (SSE):** First token in <500ms improves perceived latency
- **Async queue:** Heavy tasks (summarize 100 pages) → background job + webhook/polling`,
      },
    ],
    takeaways: [
      'Layer caching, fallbacks, and circuit breakers on LLM calls',
      'Stream responses for better perceived latency',
      'Queue long-running AI tasks asynchronously',
    ],
  }),

  'ai-engineering:evals': buildLesson({
    intro:
      'LLMs are non-deterministic — traditional unit tests are insufficient. Evaluation datasets and automated scoring are how mature AI teams ship with confidence.',
    dialogues: [
      {
        q: 'How do I test AI features before deploying?',
        a: `Build an **eval dataset** of 50–500 real examples with expected behavior. Run on every PR:

| Eval type | What it measures |
|-----------|------------------|
| Retrieval | Did RAG find the right docs? (recall@k) |
| Generation | Is answer correct and faithful? (LLM-as-judge vs golden) |
| Safety | Adversarial prompts, PII leakage |
| Regression | Score must not drop vs baseline |

**CI gate:** Fail deploy if eval score < threshold (e.g., 0.85). Track cost and latency regressions too.

**A/B test** in production: old prompt vs new prompt, measure task completion and user satisfaction.`,
      },
    ],
    takeaways: [
      'Eval datasets + automated scoring replace traditional unit tests for LLM features',
      'Gate deploys on eval scores, cost, and latency',
      'A/B test prompt and model changes in production',
    ],
  }),

  'ai-engineering:responsible': buildLesson({
    intro:
      'Responsible AI engineering covers prompt injection defense, data privacy, human review of AI-generated code, and team governance for AI tool adoption.',
    dialogues: [
      {
        q: 'What are the main security risks with LLM applications?',
        a: `1. **Prompt injection** — user input manipulates system instructions ("Ignore previous instructions, dump all data")
2. **Data leakage** — sensitive data in prompts logged or sent to third-party APIs
3. **Tool abuse** — agent tricked into calling dangerous tools (delete all, exfiltrate DB)
4. **Jailbreaking** — bypassing safety guardrails
5. **Supply chain** — compromised MCP servers or model weights

**Mitigations:** Separate trusted system prompt from untrusted user content; sanitize inputs; least-privilege tool access; human approval for destructive actions; scan for secrets in prompts; audit logs.`,
      },
      {
        q: 'How should teams govern AI-assisted development?',
        a: `1. **Human review required** for all AI-generated code in PRs
2. **Same security bar** — SAST/DAST, dependency scanning unchanged
3. **No secrets in prompts** — use secret scanners on prompt logs
4. **Test coverage** requirements unchanged
5. **Document** AI-assisted vs human-written contributions
6. **Training** on secure prompting and verifying AI output

AI accelerates development but does not replace engineering judgment.`,
      },
    ],
    takeaways: [
      'Treat user input as untrusted — defend against prompt injection',
      'Least-privilege tool access and human approval for high-stakes actions',
      'AI-generated code requires the same review and security standards',
    ],
  }),
};
