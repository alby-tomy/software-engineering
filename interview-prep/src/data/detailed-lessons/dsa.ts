import { buildLesson } from '../content-format';

export const dsaLessons: Record<string, string> = {
  'dsa:complexity': buildLesson({
    intro:
      'Big-O is the start, not the finish. Senior interviews ask about constant factors, memory at scale, and what happens when your O(n) solution still isn\'t fast enough in production.',
    dialogues: [
      {
        q: 'Beyond Big-O — what else matters in complexity analysis?',
        a: `State **worst, average, and best** case when they differ. Example: quicksort O(n log n) average, O(n²) worst with bad pivot.

**Space complexity** — auxiliary arrays AND **recursion stack depth**. DFS on deep graph can O(n) stack space.

**Amortized** — dynamic array append is O(1) amortized though occasional O(n) resize.

**Hidden constants** — hash map O(1) with expensive hash vs array index O(1) cheap. Cache-friendly sequential scan sometimes beats hash for small n.

Senior template: "O(n) time, O(1) extra space, worst case when all elements unique" — complete answer.`,
      },
      {
        q: 'How do I pick the right data structure for a problem?',
        a: `| Need | Structure | Why |
|------|-----------|-----|
| Fast lookup by key | Hash table | O(1) average |
| Sorted min/max | Heap | O(log n) insert/extract |
| Range queries | BST, segment tree | O(log n) |
| Prefix strings | Trie | O(m) key length |
| Connectivity | Union-Find | O(α(n)) amortized |
| Shortest path (+ weights) | Dijkstra + heap | O((V+E) log V) |

Clarify **operations** and **constraints** before coding: insert frequency? sorted order needed? memory limit? concurrent access?

Wrong structure → correct algorithm still slow.`,
      },
      {
        q: 'Interviewer says your O(n) solution is too slow at 10M items. What do you say?',
        a: `Don't jump to micro-opts — explore scale dimensions:

1. **Does 10M fit in RAM?** — streaming, external sort, disk-based structures
2. **Parallelization** — partition data, map-reduce, GPU for numeric
3. **Preprocessing** — build index offline, query O(log n) or O(1)
4. **Approximation** — count-min sketch, HyperLogLog if exact not required
5. **Different algorithm** — still O(n) but better constants or I/O pattern
6. **Batching** — one DB query vs 10M queries

Example: counting distinct users — exact hash set 10M entries vs approximate sketch 1% error 1KB.

Show you think like production engineer, not LeetCode grinder.`,
      },
      {
        q: 'Hash table O(1) — when is it not O(1)?',
        a: `**Worst case O(n)** — all keys collide into one bucket (bad hash or attack). Java HashMap treeifies long chains; Python has collision handling.

**Load factor** — resize when table grows (amortized cost). High load → more collisions.

**Hash computation** — expensive keys (long strings) add constant cost per op.

**Memory** — O(n) space always — at 10M keys, RAM matters.

**Iteration order** — hash table doesn't support ordered range queries — need tree or sorted structure.

Interview: "Average O(1) with good hash and load factor < 0.75; worst O(n) if adversarial keys."`,
      },
    ],
    takeaways: [
      'Give time AND space; mention worst vs average case',
      'Match structure to operations — hash for lookup, heap for min, trie for prefixes',
      'At scale: streaming, preprocess, approximate, parallelize',
      'Hash O(1) average; collisions and resize matter',
    ],
    tip: 'When stating complexity, add "assuming n fits in memory" — senior habit.',
  }),

  'dsa:patterns': buildLesson({
    intro:
      'Patterns beat problem memorization. Two pointers, sliding window, binary search on answer, and BFS/DFS templates solve most medium interview problems — and senior follow-ups about scale.',
    dialogues: [
      {
        q: 'When do I use two pointers vs sliding window?',
        a: `**Two pointers** — often on **sorted** arrays or when shrinking from both ends:
- Pairs summing to target
- Palindrome check
- Container with most water
- Merge two sorted arrays

Template: \`left = 0, right = len-1\`, move based on condition.

**Sliding window** — **contiguous subarray/substring** with constraint:
- Max sum subarray of size k
- Longest substring without repeat
- Minimum window substring

Template: expand \`right\`, shrink \`left\` while invalid, update answer.

If problem says "contiguous" + "longest/shortest" → sliding window first.`,
      },
      {
        q: 'Binary search — not just on arrays.',
        a: `**Binary search on answer** when:
- Answer lies in range [lo, hi]
- You can **check feasibility** in O(n) or O(log n)

Example: minimum ship capacity to deliver in D days — try capacity \`mid\`, simulate days needed, shrink range.

Template:
\`\`\`python
lo, hi = min_possible, max_possible
while lo < hi:
    mid = (lo + hi) // 2
    if feasible(mid):
        hi = mid
    else:
        lo = mid + 1
return lo
\`\`\`

Watch **integer overflow** in other languages; Python fine. Ensure monotonic feasibility property.`,
      },
      {
        q: 'BFS vs DFS — decision guide.',
        a: `**BFS** — queue, level by level:
- Shortest path in **unweighted** graph
- Level-order tree traversal
- Nearest 0 in grid, rotten oranges

**DFS** — stack or recursion:
- Exhaustive search, all paths
- Cycle detection
- Topological sort
- Connected components
- Tree problems (most are recursive DFS)

**Memory:** BFS O(width) for trees; DFS O(height) recursion stack. Deep tree → DFS stack overflow risk (iterate with explicit stack).

**Graph representation:** adjacency list for sparse O(V+E); matrix for dense or fast edge lookup.`,
      },
      {
        q: 'Walk through sliding window — longest substring without repeating.',
        a: `\`\`\`python
def length_of_longest_substring(s: str) -> int:
    char_index = {}
    left = 0
    max_len = 0
    for right, char in enumerate(s):
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1
        char_index[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len
\`\`\`

**Invariant:** window [left, right] has all unique chars. On duplicate, jump \`left\` past previous occurrence.

**Complexity:** O(n) time — each char visited twice max; O(min(n, alphabet)) space for map.

Communicate invariant before coding — interviewers score process.`,
      },
    ],
    takeaways: [
      'Two pointers: sorted/pair problems; sliding window: contiguous subarray constraints',
      'Binary search on answer when feasibility check exists',
      'BFS shortest unweighted; DFS for search, cycles, topo sort',
      'State window invariant aloud before coding sliding window',
    ],
    tip: 'Name the pattern in the first 30 seconds: "This is sliding window because..."',
  }),

  'dsa:senior-thinking': buildLesson({
    intro:
      'Senior DSA isn\'t harder puzzles — it\'s communicating approach, handling scale follow-ups, and connecting algorithms to production systems.',
    dialogues: [
      {
        q: 'What is the communication framework for coding interviews?',
        a: `1. **Clarify** — input size, constraints, edge cases, duplicates, negative numbers
2. **Approach** — brute force first, then optimize; name pattern
3. **Complexity** — time and space before coding
4. **Code** — clean names, handle edge cases in structure
5. **Test** — empty input, single element, max size mentally
6. **Optimize** — if time permits or interviewer asks

Don't silent-code for 20 minutes. Check in: "I'll use a hash map for O(1) lookups — sound good?"

Senior signal: mention **trade-offs** of your approach vs alternatives.`,
      },
      {
        q: '10 million nodes, limited memory — how do you adapt algorithms?',
        a: `**External memory algorithms:**
- Sort chunks in RAM, merge runs on disk (external merge sort)
- Stream processing — one pass, O(1) memory if possible
- **Map-reduce** — partition by hash, process shards, combine

**Don't store all in memory:**
- Generator/stream instead of list
- Bloom filter for "probably exists" — no false negatives
- Count-min sketch for frequency approximation

**Disk-based structures** — B-tree in database already does this — maybe push work to SQL with index.

Say: "If n=10M and 64-byte nodes = 640MB, fits one machine RAM — if 10B, external sort or distributed."`,
      },
      {
        q: 'Production DSA — what appears outside LeetCode?',
        a: `**Rate limiter** — token bucket, sliding window log in Redis
**Consistent hashing** — distribute cache keys across nodes
**LRU cache** — hash map + doubly linked list (OrderedDict in Python)
**Leaderboard** — sorted set in Redis (ZSET)
**Autocomplete** — trie with top-k at nodes
**Duplicate detection** — bloom filter before expensive DB lookup

Hash collision handling in language dicts. When **sort O(n log n)** beats **counting sort O(n)** — small n, simpler code, cache-friendly array.

Connect algorithm to **operational** concerns: Redis Lua atomicity, TTL, memory per user.`,
      },
      {
        q: 'O(n) in interview but slow in production — investigate what?',
        a: `Same as performance engineering:
1. Constant factors and cache behavior
2. Hidden I/O in loop (DB query per iteration = O(n) queries)
3. Lock contention on shared structure
4. GC pressure from allocations per iteration
5. n larger than assumed in requirements
6. Profile hot path — py-spy, perf

Interview bridge: "My solution is O(n) CPU but if each step hits DB it's O(n) network — batch or cache."`,
      },
    ],
    takeaways: [
      'Clarify → approach → complexity → code → test → optimize',
      'Scale follow-ups: external sort, streaming, approximate structures',
      'Production: rate limiters, consistent hashing, bloom filters',
      'O(n) algorithm + O(n) I/O per step = production disaster',
    ],
    tip: 'Design a rate limiter when asked open-ended system question — ties DSA to backend.',
  }),

  'dsa:graphs': buildLesson({
    intro:
      'Graph problems dominate senior loops — BFS, DFS, Dijkstra, topological sort, and Union-Find each have clear triggers and complexity targets.',
    dialogues: [
      {
        q: 'Graph representations — when adjacency list vs matrix?',
        a: `**Adjacency list** — \`dict\` or array of lists: O(V+E) space. Best for **sparse** graphs (social networks, road maps). Standard for most interview problems.

**Adjacency matrix** — V×V boolean/weight matrix: O(V²) space. Fast **edge lookup** O(1). Dense graphs or when V small.

**Edge list** — list of (u,v) pairs. Useful for Union-Find (Kruskal MST).

Choose based on sparsity and operations: frequent "is edge (u,v)?" → matrix or hash set of edges.`,
      },
      {
        q: 'BFS shortest path — explain and code.',
        a: `BFS explores **layers** — first time we reach a node is shortest path in **unweighted** graph.

\`\`\`python
from collections import deque

def bfs_shortest(graph, start, end):
    if start == end:
        return [start]
    queue = deque([(start, [start])])
    visited = {start}
    while queue:
        node, path = queue.popleft()
        for neighbor in graph[node]:
            if neighbor in visited:
                continue
            if neighbor == end:
                return path + [neighbor]
            visited.add(neighbor)
            queue.append((neighbor, path + [neighbor]))
    return None
\`\`\`

**O(V+E)** time. For path only, store parent pointers instead of full path in queue (space optimization).

**0-1 BFS** for weights 0 or 1 — deque with front/back push.`,
      },
      {
        q: 'Topological sort — when and how?',
        a: `Ordering of DAG where every edge goes forward. Use: task scheduling, build order, course prerequisites.

**Kahn's algorithm (BFS):**
- Count in-degrees
- Queue nodes with in-degree 0
- Remove, decrement neighbors' in-degrees

**DFS approach:**
- DFS post-order, reverse or prepend to result
- Detect cycle if revisit node in current DFS path

If cycle exists → no topological order. **O(V+E)**.

Interview: "955. Course Schedule" — cycle detection + topo sort.`,
      },
      {
        q: 'Dijkstra and Union-Find — quick comparison.',
        a: `**Dijkstra** — shortest path **non-negative** weights. Min-heap priority queue. **O((V+E) log V)**. Doesn't work with negative edges (use Bellman-Ford).

**Union-Find** — dynamic connectivity:
- \`find(x)\` with path compression
- \`union(x,y)\` by rank/size
- **O(α(n))** amortized ≈ constant

Use Union-Find: connected components, Kruskal MST, detect cycle in undirected graph while adding edges.

Don't use Dijkstra on unweighted graph — BFS is simpler and faster.`,
      },
    ],
    takeaways: [
      'Sparse graphs: adjacency list O(V+E)',
      'BFS for unweighted shortest path; O(V+E)',
      'Topo sort on DAG — Kahn BFS or DFS; cycle = impossible',
      'Dijkstra needs non-negative weights; Union-Find for connectivity',
    ],
    tip: 'For grid problems, say "implicit graph" — cells are nodes, 4-direction edges.',
  }),

  'dsa:dynamic-programming': buildLesson({
    intro:
      'DP is recurrence + memoization or tabulation. Senior candidates define state clearly and know common patterns — knapsack, LIS, grid paths, stock problems.',
    dialogues: [
      {
        q: 'When is dynamic programming applicable?',
        a: `Two properties required:

1. **Optimal substructure** — optimal solution contains optimal solutions to subproblems
2. **Overlapping subproblems** — same subproblems solved repeatedly (recursion tree revisits states)

Not every recursion is DP — if subproblems don't overlap, memoization doesn't help.

Identify **state** variables (index, remaining capacity, last action). Write **recurrence** relating state to smaller states. **Base cases** for smallest subproblems.

If only last row of table needed → optimize space.`,
      },
      {
        q: 'Top-down vs bottom-up — trade-offs?',
        a: `**Top-down (memoization)** — recursive, cache results in dict/array. Easier to write from recurrence. Stack depth risk. Only computes needed states.

**Bottom-up (tabulation)** — fill table from base cases up. No recursion stack. Often easier to optimize space (rolling array). Computes all states in range even if unused.

Interview: start top-down, convert to bottom-up if interviewer asks space optimization.

\`\`\`python
# Coin change bottom-up
dp = [inf] * (amount + 1)
dp[0] = 0
for a in range(1, amount + 1):
    for coin in coins:
        if coin <= a:
            dp[a] = min(dp[a], dp[a - coin] + 1)
\`\`\``,
      },
      {
        q: 'Common DP patterns to recognize.',
        a: `1. **0/1 Knapsack** — include/exclude each item once
2. **Unbounded knapsack** — unlimited use (coin change min ways)
3. **LCS / LIS** — sequence comparison, patience sorting for LIS O(n log n)
4. **Grid paths** — 2D DP, sometimes from edge
5. **Interval DP** — merge stones, burst balloons — try all splits
6. **State machine** — buy/sell stock with cooldown/holding state

When you see "count ways", "min/max cost", "is possible" on sequences/grids → DP candidate.`,
      },
      {
        q: 'Space optimization example — knapsack.',
        a: `0/1 Knapsack: \`dp[i][w]\` = max value using first i items, capacity w.

2D table O(n×W). **Optimize:** only previous row needed:

\`\`\`python
def knapsack(weights, values, W):
    dp = [0] * (W + 1)
    for i in range(len(weights)):
        for w in range(W, weights[i] - 1, -1):  # reverse for 0/1
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[W]
\`\`\`

Reverse iteration prevents using item twice in same pass. **O(W)** space.

Mention W large → pseudo-polynomial; NP-hard in general.`,
      },
    ],
    takeaways: [
      'DP needs optimal substructure + overlapping subproblems',
      'Define state, recurrence, base cases before coding',
      'Top-down memo vs bottom-up tabulation; rolling array for space',
      'Recognize knapsack, LIS, grid, interval, state-machine patterns',
    ],
    tip: 'Draw small table for 3×3 example — visual DP lands better than abstract recurrence.',
  }),

  'dsa:trees': buildLesson({
    intro:
      'Tree problems are mostly recursion or BFS. BST properties, LCA, and trie use cases come up constantly in interviews and production (autocomplete, routing).',
    dialogues: [
      {
        q: 'Why are tree problems usually recursive?',
        a: `A tree is **recursive structure** — each subtree is a tree. Most problems decompose:

- **Single node** base case (null → return 0/None/True)
- **Combine** results from left and right children

Examples: max depth, diameter, validate BST, path sum.

**Iterative BFS** with queue for level-order. **Iterative DFS** with explicit stack if recursion depth risky.

Always clarify: binary tree vs BST vs n-ary? Values unique? Balanced?`,
      },
      {
        q: 'BST operations and when BST breaks down.',
        a: `**BST property:** left < root < right (for all nodes).

**Search/insert/delete** O(log n) **if balanced**. Skewed tree → O(n).

**Inorder traversal** → sorted order for BST.

**Validate BST** — pass min/max bounds down, not just compare children to parent.

Production uses **balanced** trees (red-black in \`std::map\`, skip list) or B-trees in databases — not plain BST.

Interview delete in BST: three cases — no child, one child, two children (replace with successor).`,
      },
      {
        q: 'Lowest Common Ancestor — approaches.',
        a: `**Recursive (general binary tree):**
\`\`\`python
def lca(root, p, q):
    if not root or root == p or root == q:
        return root
    left = lca(root.left, p, q)
    right = lca(root.right, p, q)
    if left and right:
        return root
    return left or right
\`\`\`

If both subtrees return non-null, root is LCA. If one side finds target, propagate up.

**BST LCA** — use BST property: both < root → go left; both > root → go right; else root is LCA. O(h).

**With parent pointers** — walk pointers like linked list intersection.`,
      },
      {
        q: 'Trie — when over hash table?',
        a: `**Trie (prefix tree)** — each node = character, path = key prefix.

**Use when:**
- Autocomplete / prefix search
- Spell check
- IP routing tables (bit trie)
- Word search in grid

**O(m)** per operation where m = key length, not number of keys.

**Hash table** better for exact key lookup only. Trie wins shared prefixes and prefix queries.

**Space** — can be heavy; compress paths (radix tree). Production: Elasticsearch, Redis sometimes uses trie-like structures.`,
      },
    ],
    takeaways: [
      'Trees → recursive decomposition with clear base case',
      'BST O(log n) only when balanced; inorder = sorted',
      'LCA: recursive post-order or BST property walk',
      'Trie for prefix problems; hash for exact lookup',
    ],
    tip: 'For "serialize/deserialize tree" mention BFS level-order with null markers.',
  }),
};
