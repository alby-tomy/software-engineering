import { createModule } from './helpers';

export const generativeAi = createModule({
  id: 'generative-ai',
  title: 'Generative AI Fundamentals',
  stage: 11,
  level: 'intermediate',
  icon: '✨',
  description:
    'How large language models work, prompt engineering, fine-tuning basics, and choosing models for production use cases.',
  prerequisites: ['python', 'fastapi'],
  estimatedHours: 20,
  learningObjectives: [
    'Explain how transformers and LLMs generate text',
    'Write effective prompts with system/user/assistant roles and few-shot examples',
    'Compare GPT, Claude, Llama, and open-source model trade-offs',
    'Understand fine-tuning vs RAG vs prompt engineering decision tree',
  ],
  sections: [
    {
      id: 'llm-basics',
      title: 'What Are Large Language Models?',
      content: `### Core idea
An LLM predicts the **next token** given previous tokens. Billions of parameters learned from massive text corpora create emergent abilities: reasoning, coding, summarization.

### Key concepts
- **Token**: Subword unit (≈4 chars in English). "Hello" might be 1 token; "unhappiness" might be 3.
- **Context window**: Max tokens the model can see (4K → 128K → 1M+). Everything must fit: system prompt + history + response.
- **Temperature**: Randomness. 0 = deterministic, 1 = creative, >1 = chaotic.
- **Top-p / top-k**: Limit sampling to probable tokens — reduces nonsense.

### How training works (simplified)
1. **Pre-training**: Predict next token on internet-scale data → general knowledge
2. **Fine-tuning (SFT)**: Train on instruction-response pairs → follows instructions
3. **RLHF/DPO**: Human feedback aligns outputs to be helpful and safe

### API mental model
\`\`\`python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a senior Python tutor."},
        {"role": "user", "content": "Explain the GIL in 3 sentences."},
    ],
    temperature=0.3,
)
\`\`\`

You pay per **input tokens + output tokens**. Longer prompts and responses = higher cost.`,
    },
    {
      id: 'transformers',
      title: 'Transformers — How They Actually Work',
      content: `### Why transformers replaced RNNs
**Self-attention** lets every token attend to every other token in parallel — no sequential bottleneck. This enables training on GPUs at scale.

### Attention intuition
For each word, the model asks: "Which other words in this sentence matter for understanding me?"

Example: "The animal didn't cross the street because **it** was too tired"
→ "it" attends strongly to "animal", not "street"

### Architecture layers
1. **Embedding**: Token ID → vector
2. **Positional encoding**: Where in sequence
3. **Multi-head attention** × N layers: Relationships between tokens
4. **Feed-forward network**: Transform representations
5. **Output head**: Predict next token probabilities

### Encoder vs Decoder
- **Encoder** (BERT): Reads entire input — good for classification, embeddings
- **Decoder** (GPT): Generates left-to-right — good for text generation
- **Encoder-Decoder** (T5): Translation, summarization

### Interview answer
"Transformers use self-attention to model relationships between all tokens simultaneously. GPT-style models are autoregressive decoders trained to predict the next token, which is why they're great at generation but need techniques like RAG for factual grounding."`,
    },
    {
      id: 'prompt-engineering',
      title: 'Prompt Engineering — Getting Reliable Outputs',
      content: `### Structure every production prompt
1. **System message**: Role, constraints, output format
2. **Few-shot examples**: 2-5 input→output pairs for the pattern you want
3. **User message**: Actual task with clear delimiters

### Techniques that work
| Technique | When to use |
|-----------|-------------|
| Zero-shot | Simple, well-known tasks |
| Few-shot | Specific format or domain pattern |
| Chain-of-thought | Math, logic, multi-step reasoning |
| JSON mode / structured output | API integration, parsing |
| Role prompting | Consistent persona/tone |

### Chain-of-thought example
\`\`\`
Solve step by step:
1. Identify what we know
2. Identify what we need
3. Show work
4. State final answer
\`\`\`

### Common failures
- **Vague instructions** → "Be helpful" vs "Return JSON with keys: title, summary, tags"
- **No examples** → Model guesses your format
- **Context overflow** → Truncated history loses critical info
- **No validation** → Always parse and validate LLM output in code

### Production pattern
\`\`\`python
SYSTEM = """You classify support tickets.
Return ONLY valid JSON: {"category": str, "priority": "low"|"medium"|"high", "confidence": float}
"""

def classify(ticket: str) -> dict:
    response = llm.chat(system=SYSTEM, user=ticket, temperature=0)
    return json.loads(response)  # Always validate with Pydantic
\`\`\``,
    },
    {
      id: 'model-selection',
      title: 'Choosing the Right Model',
      content: `### Decision matrix
| Need | Model type | Examples |
|------|------------|----------|
| Best reasoning/coding | Frontier closed | GPT-4o, Claude 3.5 Sonnet |
| Cost-sensitive, high volume | Small/fast | GPT-4o-mini, Haiku, Llama 3 8B |
| Data privacy / on-prem | Open source | Llama 3, Mistral, Qwen |
| Embeddings | Embedding model | text-embedding-3-small, BGE, E5 |
| Image/audio | Multimodal | GPT-4o, Gemini |

### Cost optimization
1. **Route by complexity**: Haiku for simple, Sonnet/GPT-4 for hard
2. **Cache prompts**: Identical system prompts → prompt caching (90% savings)
3. **Smaller context**: Trim history, summarize old messages
4. **Batch API**: Non-real-time workloads at 50% discount

### Latency factors
- Model size (bigger = slower)
- Output length (streaming helps perceived latency)
- Provider load and region
- Tool calls add round-trips

### Open vs closed source
**Closed (OpenAI, Anthropic):** Best capability, managed infra, data policies matter
**Open (Llama, Mistral):** Self-host, fine-tune freely, you manage GPUs`,
    },
    {
      id: 'fine-tuning',
      title: 'Fine-Tuning vs RAG vs Prompting',
      content: `### When to use what
\`\`\`
Start here → Prompt engineering (free, fast iteration)
     ↓ not enough
Add RAG → Need private/specific knowledge without retraining
     ↓ not enough
Fine-tune → Need consistent style, format, or domain behavior
     ↓ not enough
Train from scratch → Only for research or unique domains (rare)
\`\`\`

### Fine-tuning types
- **Full fine-tune**: Update all weights — expensive, best for major shifts
- **LoRA/QLoRA**: Train small adapter layers — 100× cheaper, good default
- **Distillation**: Large model teaches small model — deploy cheap inference

### Fine-tuning data format
\`\`\`json
{"messages": [
  {"role": "system", "content": "You write commit messages."},
  {"role": "user", "content": "diff: + def foo(): pass"},
  {"role": "assistant", "content": "feat: add foo function"}
]}
\`\`\`

Need: 100–1000+ high-quality examples. Garbage in = garbage out.

### RAG vs fine-tuning
- **RAG**: Knowledge changes frequently (docs, policies, product catalog)
- **Fine-tuning**: Behavior/style changes (tone, output format, domain jargon)`,
      practicalExercise:
        'Write 3 prompts for the same task (summarize a bug report) using zero-shot, few-shot, and chain-of-thought. Compare output quality.',
    },
  ],
  questions: [
    {
      id: 'gen-q1',
      level: 'understanding',
      question: 'What is a token and why does it matter for LLM APIs?',
      answer:
        'A token is a subword unit the model processes. API pricing, context limits, and latency all scale with token count. Roughly 1 token ≈ 4 characters in English. Long prompts cost more and leave less room for responses.',
    },
    {
      id: 'gen-q2',
      level: 'application',
      question: 'When would you use temperature 0 vs 0.7?',
      answer:
        'Temperature 0 for deterministic tasks: classification, JSON extraction, code generation where consistency matters. Temperature 0.7–1.0 for creative writing, brainstorming, varied phrasing. Never use high temperature for production parsing tasks.',
    },
    {
      id: 'gen-q3',
      level: 'tradeoffs',
      question: 'Fine-tuning vs RAG — how do you decide?',
      answer:
        'RAG when knowledge changes often or is too large to fit in training data (company docs, product catalogs). Fine-tuning when you need consistent behavior, tone, or output format. Often combine both: fine-tuned model + RAG for facts.',
    },
    {
      id: 'gen-q4',
      level: 'senior',
      question: 'How would you reduce LLM API costs by 80% in production?',
      answer:
        'Model routing (small model for easy queries), prompt caching, shorter contexts via summarization, batch API for async work, embedding cache for RAG, reduce output tokens with concise prompts, self-host open models for high-volume simple tasks, monitor token usage per feature.',
    },
  ],
  seniorScenarios: [
    {
      title: 'Choose AI architecture for customer support bot',
      scenario: 'Company wants AI support for 10K daily tickets across 500 help articles that update weekly.',
      approach:
        'RAG over help articles (not fine-tune — content changes weekly). GPT-4o-mini for classification, Sonnet/GPT-4 for complex escalations. Vector DB with pgvector. Human handoff when confidence < 0.7. Log all interactions for eval.',
      keyConsiderations: ['RAG freshness', 'Hallucination guardrails', 'Cost at volume', 'Human escalation'],
    },
  ],
  resources: [
    { title: 'OpenAI Prompt Engineering Guide', url: 'https://platform.openai.com/docs/guides/prompt-engineering', type: 'documentation' },
    { title: 'Anthropic Prompt Engineering', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview', type: 'documentation' },
    { title: 'Attention Is All You Need (Paper)', url: 'https://arxiv.org/abs/1706.03762', type: 'article' },
  ],
});

export const ragEmbeddings = createModule({
  id: 'rag-embeddings',
  title: 'RAG & Vector Embeddings',
  stage: 11,
  level: 'intermediate',
  icon: '🔍',
  description:
    'Retrieval-Augmented Generation: embeddings, chunking, vector databases, and building production knowledge systems.',
  prerequisites: ['generative-ai', 'python'],
  estimatedHours: 18,
  learningObjectives: [
    'Build end-to-end RAG pipelines from documents to answers',
    'Choose chunking strategies and embedding models',
    'Evaluate RAG quality with precision, recall, and faithfulness metrics',
    'Deploy vector search with pgvector, Pinecone, or Weaviate',
  ],
  sections: [
    {
      id: 'embeddings',
      title: 'Embeddings — Turning Text into Vectors',
      content: `### What is an embedding?
A dense vector (e.g., 1536 floats) that captures **semantic meaning**. Similar texts → vectors close in cosine distance.

\`\`\`python
# "dog" and "puppy" → similar vectors
# "dog" and "database" → far apart
embedding = model.encode("How do I reset my password?")
# → [0.023, -0.114, 0.087, ...]  (1536 dimensions)
\`\`\`

### Similarity search
\`\`\`python
import numpy as np

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Query: "password reset"
# Best match from docs: "How to change your password" (score: 0.89)
# Poor match: "Billing FAQ" (score: 0.31)
\`\`\`

### Embedding model choices
| Model | Dimensions | Best for |
|-------|------------|----------|
| text-embedding-3-small | 1536 | General, cost-effective |
| text-embedding-3-large | 3072 | Higher accuracy |
| BGE-large | 1024 | Open source, self-host |
| E5-mistral | 4096 | Long documents |

**Rule:** Use the same embedding model for indexing AND querying. Never mix models.`,
    },
    {
      id: 'rag-pipeline',
      title: 'RAG Architecture — End to End',
      content: `### The RAG pipeline
\`\`\`
Documents → Chunk → Embed → Store in Vector DB
                                    ↓
User Query → Embed query → Retrieve top-k chunks → Augment prompt → LLM → Answer
\`\`\`

### Implementation sketch
\`\`\`python
async def rag_answer(question: str) -> str:
    query_vec = await embed(question)
    chunks = await vector_db.search(query_vec, top_k=5)
    context = "\\n\\n".join(c.metadata["text"] for c in chunks)

    prompt = f"""Answer using ONLY the context below. If unsure, say "I don't know."

Context:
{context}

Question: {question}"""

    return await llm.chat(prompt)
\`\`\`

### Why RAG beats fine-tuning for knowledge
- Update docs → re-embed → instant knowledge refresh
- Citations: show which chunk supported the answer
- No catastrophic forgetting
- Cheaper than retraining

### Advanced patterns
- **Hybrid search**: Vector + BM25 keyword (better for exact terms)
- **Re-ranking**: Retrieve 20, re-rank with cross-encoder, keep top 5
- **Query transformation**: Rewrite user query before search
- **Parent-child chunks**: Search small chunks, return large parent for context`,
    },
    {
      id: 'chunking',
      title: 'Chunking Strategies',
      content: `### Why chunking matters
LLMs have limited context. You can't stuff 10,000 pages into one prompt. Chunking splits documents into retrievable pieces.

### Strategies
| Strategy | Size | Best for |
|----------|------|----------|
| Fixed size | 500–1000 tokens | General docs |
| Sentence-based | Variable | Narrative text |
| Paragraph | Variable | Articles, blogs |
| Semantic | AI-detected boundaries | Mixed content |
| Code-aware | By function/class | Source code |

### Overlap
Use 10–20% overlap between chunks so sentences split across boundaries aren't lost.

\`\`\`python
def chunk_text(text: str, size: int = 512, overlap: int = 64) -> list[str]:
    tokens = tokenize(text)
    chunks = []
    for i in range(0, len(tokens), size - overlap):
        chunks.append(detokenize(tokens[i:i + size]))
    return chunks
\`\`\`

### Metadata per chunk
Store: source file, page number, section title, last_updated, access permissions. Enables filtered search and citations.`,
    },
    {
      id: 'vector-databases',
      title: 'Vector Databases & Search',
      content: `### Options compared
| Solution | Type | Best for |
|----------|------|----------|
| pgvector | PostgreSQL extension | Already on Postgres, <10M vectors |
| Pinecone | Managed SaaS | Quick start, auto-scaling |
| Weaviate | Open source / cloud | Hybrid search built-in |
| Qdrant | Open source / cloud | Performance, filtering |
| Chroma | Embedded | Prototyping, small apps |

### pgvector example
\`\`\`sql
CREATE EXTENSION vector;
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536),
    metadata JSONB
);
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
\`\`\`

### Index types
- **Flat (exact)**: Slow at scale, 100% accurate
- **IVF**: Cluster-based approximate — fast, 95%+ recall
- **HNSW**: Graph-based — faster queries, more memory

### Production checklist
- Batch embed on ingest (not one-by-one)
- Monitor query latency p99
- Re-index when embedding model changes
- Access control filters on metadata`,
    },
    {
      id: 'rag-evaluation',
      title: 'Evaluating RAG Quality',
      content: `### Metrics that matter
| Metric | What it measures |
|--------|------------------|
| Retrieval precision | Are retrieved chunks relevant? |
| Retrieval recall | Did we find the right chunk at all? |
| Faithfulness | Does answer match retrieved context? |
| Answer relevance | Does answer address the question? |
| Latency | End-to-end response time |

### Evaluation dataset
Create 50–200 question-answer pairs from your docs:
\`\`\`json
{
  "question": "What is the refund policy?",
  "expected_answer": "30-day full refund...",
  "source_doc": "policies/refund.md"
}
\`\`\`

### Automated eval with LLM-as-judge
\`\`\`python
def evaluate_faithfulness(question, answer, context) -> float:
    prompt = f"""Rate 1-5: Does the answer ONLY use information from context?
    Context: {context}
    Question: {question}
    Answer: {answer}
    Score:"""
    return float(llm.chat(prompt))
\`\`\`

### Common RAG failures
1. **Wrong chunks retrieved** → Better chunking, hybrid search, re-ranking
2. **Answer ignores context** → Stronger system prompt, lower temperature
3. **Stale knowledge** → Re-embed pipeline on doc updates
4. **Hallucination** → Require citations, confidence thresholds`,
      practicalExercise:
        'Build a minimal RAG pipeline: chunk 5 markdown files, embed with OpenAI, store in a list, retrieve top-3 by cosine similarity, answer with GPT.',
    },
  ],
  questions: [
    {
      id: 'rag-q1',
      level: 'understanding',
      question: 'What problem does RAG solve that fine-tuning does not?',
      answer:
        'RAG grounds answers in specific, updatable documents without retraining. Fine-tuning bakes knowledge into weights — expensive to update and can hallucinate. RAG provides citations and fresh knowledge by retrieving relevant chunks at query time.',
    },
    {
      id: 'rag-q2',
      level: 'application',
      question: 'How do you handle a user question that spans multiple document chunks?',
      answer:
        'Retrieve top-k chunks (5-10), use parent-child chunking to get surrounding context, or use multi-query retrieval (generate 3 versions of the question, search each, merge results). Re-ranking helps surface the most relevant combination.',
    },
    {
      id: 'rag-q3',
      level: 'senior',
      question: 'Design a RAG system for 1 million documents with sub-2s latency.',
      answer:
        'Batch embed on ingest to vector DB (Pinecone/Qdrant). HNSW index. Cache frequent queries. Hybrid search (vector + BM25). Re-rank top-20 to top-5 with cross-encoder. Stream LLM response. Async embed pipeline for doc updates. Monitor retrieval recall weekly with eval set.',
    },
  ],
  seniorScenarios: [],
  resources: [
    { title: 'LangChain RAG Tutorial', url: 'https://python.langchain.com/docs/tutorials/rag/', type: 'documentation' },
    { title: 'pgvector Documentation', url: 'https://github.com/pgvector/pgvector', type: 'documentation' },
  ],
});

export const agenticAi = createModule({
  id: 'agentic-ai',
  title: 'Agentic AI Systems',
  stage: 11,
  level: 'advanced',
  icon: '🤖',
  description:
    'AI agents that reason, plan, use tools, and collaborate. ReAct loops, function calling, multi-agent systems, and MCP integrations.',
  prerequisites: ['generative-ai', 'rag-embeddings', 'fastapi'],
  estimatedHours: 22,
  learningObjectives: [
    'Explain the agent loop: perceive → reason → act → observe',
    'Implement tool-using agents with function calling and ReAct',
    'Design multi-agent workflows with clear handoffs',
    'Evaluate agent reliability, safety, and cost in production',
  ],
  sections: [
    {
      id: 'agent-fundamentals',
      title: 'What Is an AI Agent?',
      content: `### Definition
An **agent** is an LLM that can **take actions** in a loop — not just generate text, but use tools, call APIs, query databases, and iterate until a goal is met.

### Agent vs chatbot
| Chatbot | Agent |
|---------|-------|
| Single turn or conversation | Multi-step reasoning loop |
| Text in → text out | Text in → tools → observe → repeat |
| No side effects | Changes state (DB, files, APIs) |

### The agent loop
\`\`\`
1. PERCEIVE — Receive goal + current state
2. REASON  — LLM decides next action
3. ACT     — Execute tool (search, code, API call)
4. OBSERVE — Get tool result
5. Repeat until done or max iterations
\`\`\`

### When agents shine
- Multi-step research across sources
- Code generation + execution + debugging
- Data analysis pipelines
- Customer support with tool access (order lookup, refund)

### When NOT to use agents
- Simple Q&A → RAG is enough
- Deterministic workflows → regular code is cheaper and reliable
- High-stakes without human review → dangerous`,
    },
    {
      id: 'tool-use',
      title: 'Tool Use & Function Calling',
      content: `### How function calling works
1. You define tools as JSON schemas
2. LLM decides which tool to call with what arguments
3. Your code executes the tool
4. Result goes back to LLM for next step

\`\`\`python
tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"}
            },
            "required": ["city"]
        }
    }
}]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Weather in London?"}],
    tools=tools,
)
# LLM returns: tool_call get_weather(city="London")
\`\`\`

### Tool design principles
- **Clear descriptions** — LLM picks tools based on description
- **Minimal parameters** — fewer ways to mess up
- **Idempotent when possible** — safe to retry
- **Validate inputs** — never trust LLM-generated args blindly
- **Timeout everything** — agents can loop forever

### Common tool categories
- Search (web, docs, database)
- Code execution (sandboxed!)
- API calls (CRM, calendar, email)
- File operations (read, write, list)
- Human escalation (approval gates)`,
    },
    {
      id: 'react-pattern',
      title: 'ReAct — Reasoning + Acting',
      content: `### ReAct pattern
Interleave **Thought → Action → Observation** in the prompt:

\`\`\`
Thought: I need to find the user's order status first.
Action: lookup_order(order_id="12345")
Observation: Order #12345 shipped yesterday, tracking: ABC123

Thought: I have the tracking info. I can answer the user.
Action: respond("Your order shipped yesterday. Track at: ABC123")
\`\`\`

### Implementation with LangGraph
\`\`\`python
from langgraph.graph import StateGraph

graph = StateGraph(AgentState)
graph.add_node("reason", reason_node)    # LLM decides next step
graph.add_node("act", tool_node)         # Execute tool
graph.add_edge("reason", "act")
graph.add_conditional_edges("act", should_continue)  # Loop or end
\`\`\`

### Guardrails
- **Max iterations**: 10–25 steps, then force stop
- **Allowed tools whitelist**: Agent can't call arbitrary APIs
- **Human-in-the-loop**: Approve destructive actions (delete, payment)
- **Cost budget**: Stop if token spend exceeds threshold

### Debugging agents
Log every thought, action, observation. Replay failed runs. Most bugs are: wrong tool selected, bad arguments, infinite loops.`,
    },
    {
      id: 'multi-agent',
      title: 'Multi-Agent Systems',
      content: `### Why multiple agents?
Specialize agents for different tasks — like a team:
- **Planner** agent breaks goal into subtasks
- **Researcher** agent searches and summarizes
- **Coder** agent writes and tests code
- **Reviewer** agent checks output quality

### Orchestration patterns
| Pattern | How it works |
|---------|--------------|
| Supervisor | One agent delegates to workers |
| Sequential | Agent A → Agent B → Agent C |
| Parallel | Multiple agents work simultaneously, merge results |
| Debate | Agents argue, synthesizer decides |

### Handoff design
\`\`\`python
class AgentMessage:
    from_agent: str
    to_agent: str
    task: str
    context: dict  # Shared state
    result: str | None
\`\`\`

### Challenges
- **Context passing**: What does the next agent need to know?
- **Error propagation**: Agent A's mistake confuses Agent B
- **Cost multiplication**: 5 agents × 10 steps = 50 LLM calls
- **Debugging**: Which agent failed?

### When single agent is enough
Most production apps need ONE well-tooled agent, not a swarm. Start simple.`,
    },
    {
      id: 'mcp-production',
      title: 'MCP, Integrations & Production Agents',
      content: `### Model Context Protocol (MCP)
Standard for connecting LLMs to external tools and data sources. Think "USB for AI tools."

\`\`\`
LLM Client ←→ MCP Server ←→ Database / API / Filesystem
\`\`\`

Benefits: Reusable tool servers, consistent interface, works across Claude, Cursor, custom apps.

### Production architecture
\`\`\`
User → API Gateway → Agent Service → Tool Registry
                         ↓              ↓
                    Conversation    Vector DB
                    Store (Redis)   External APIs
                         ↓
                    Observability (traces, costs)
\`\`\`

### Safety checklist
1. Sandboxed code execution (no host filesystem access)
2. Rate limits per user and per tool
3. PII filtering in logs
4. Human approval for write/delete/payment operations
5. Output validation before showing to user
6. Kill switch for runaway loops

### Evaluation
- **Task success rate**: % of goals completed correctly
- **Steps to completion**: Fewer is usually better
- **Cost per task**: Track tokens × tool calls
- **Safety violations**: Unauthorized actions attempted

### Interview answer
"I'd start with a single agent, 3–5 well-defined tools, max 10 iterations, and human approval for destructive actions. Add multi-agent only when single-agent context gets too complex."`,
      practicalExercise:
        'Build a research agent: given a topic, it searches (mock tool), summarizes findings, and cites sources. Log each ReAct step.',
    },
  ],
  questions: [
    {
      id: 'agent-q1',
      level: 'understanding',
      question: 'What is the difference between an LLM chatbot and an AI agent?',
      answer:
        'A chatbot generates text responses. An agent runs a loop: reasons about the goal, selects and executes tools, observes results, and iterates until done. Agents have side effects (API calls, DB writes) and multi-step planning.',
    },
    {
      id: 'agent-q2',
      level: 'application',
      question: 'How do you prevent an agent from infinite loops?',
      answer:
        'Max iteration limit (10-25), cost/token budget, timeout per tool call, detect repeated identical actions, human-in-the-loop for stuck states, clear termination conditions in system prompt.',
    },
    {
      id: 'agent-q3',
      level: 'senior',
      question: 'Design an agentic customer support system for an e-commerce platform.',
      answer:
        'Single supervisor agent with tools: order_lookup, refund_request (human approval), product_search (RAG), ticket_create. Redis conversation state. RAG over help docs. Escalate to human when confidence < 0.7 or refund > $100. Log all tool calls. Eval suite with 100 test scenarios. Circuit breaker on tool failures.',
    },
  ],
  seniorScenarios: [
    {
      title: 'Agent goes rogue and deletes production data',
      scenario: 'An internal coding agent was given filesystem write access and deleted staging database files.',
      approach:
        'Immediate: revoke agent credentials, restore from backup. Prevention: sandboxed execution, read-only by default, human approval for writes, tool allowlist, separate staging credentials, audit log every tool call, max iteration limits.',
      keyConsiderations: ['Principle of least privilege', 'Sandboxing', 'Audit trails', 'Blast radius'],
    },
  ],
  resources: [
    { title: 'LangGraph Documentation', url: 'https://langchain-ai.github.io/langgraph/', type: 'documentation' },
    { title: 'Anthropic Tool Use Guide', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tool-use', type: 'documentation' },
    { title: 'Model Context Protocol', url: 'https://modelcontextprotocol.io/', type: 'documentation' },
  ],
});
