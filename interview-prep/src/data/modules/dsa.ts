import type { Module } from '../../types/curriculum';

export const dsa: Module = {
  id: 'dsa',
  title: 'Data Structures & Algorithms',
  stage: 4,
  level: 'intermediate',
  icon: '🧮',
  description:
    'Daily practice area. Master patterns, not just problems. Senior interviews test scalability thinking, not just correctness.',
  prerequisites: ['cs-fundamentals'],
  learningObjectives: [
    'Choose the right data structure for the problem and explain why',
    'Apply core patterns: two pointers, sliding window, BFS/DFS, DP',
    'Analyze time AND space complexity with trade-offs',
    'Handle follow-ups about scale (10M nodes, limited memory)',
    'Communicate approach before coding',
  ],
  estimatedHours: 80,
  sections: [
    {
      id: 'complexity',
      title: 'Complexity Analysis — Beyond Big-O',
      content: `### Time complexity
State worst-case, average-case, and best-case when they differ.

### Space complexity
Include auxiliary space AND recursion stack.

### Senior follow-up template
When interviewer says "your O(n) solution is too slow in production":
1. **Constant factors** — hash map vs array, cache locality
2. **Memory** — fits in RAM? Need streaming?
3. **Parallelization** — can work be split?
4. **Approximation** — exact answer required?
5. **Preprocessing** — can we index offline?

### Data structure selection guide
| Need | Structure | Why |
|------|-----------|-----|
| Fast lookup by key | Hash table | O(1) average |
| Sorted order + fast min/max | Heap | O(log n) insert/extract |
| Range queries | Segment tree / BST | O(log n) |
| Prefix matching | Trie | O(m) where m = key length |
| Connectivity | Union-Find | O(α(n)) amortized |
| Shortest path (non-negative) | Dijkstra + heap | O((V+E) log V) |`,
    },
    {
      id: 'patterns',
      title: 'Core Patterns',
      content: `### Two Pointers
Use when: sorted array, pairs, palindromes, container problems.
\`\`\`
left = 0, right = len - 1
while left < right:
    if condition: left += 1
    else: right -= 1
\`\`\`

### Sliding Window
Use when: contiguous subarray/substring with constraint.
\`\`\`
for right in range(n):
    add nums[right] to window
    while window_invalid:
        remove nums[left], left += 1
    update answer
\`\`\`

### Binary Search
Use when: sorted data, "find minimum X such that condition holds".
Template: \`while lo < hi: mid = (lo + hi) // 2\`

### BFS vs DFS
- **BFS**: shortest path in unweighted graph, level-order
- **DFS**: connectivity, cycles, topological sort, backtracking

### Dynamic Programming
1. Define state clearly
2. Write recurrence relation
3. Identify base cases
4. Choose top-down (memo) or bottom-up (tabulation)
5. Optimize space if possible`,
      codeExamples: [
        {
          title: 'Sliding window — longest substring without repeating',
          language: 'python',
          code: `def length_of_longest_substring(s: str) -> int:
    char_index = {}
    left = 0
    max_len = 0
    for right, char in enumerate(s):
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1
        char_index[char] = right
        max_len = max(max_len, right - left + 1)
    return max_len`,
        },
        {
          title: 'Binary search on answer',
          language: 'python',
          code: `def min_capacity(weights, days):
    def can_ship(capacity):
        days_needed = 1
        current = 0
        for w in weights:
            if current + w > capacity:
                days_needed += 1
                current = 0
            current += w
        return days_needed <= days

    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if can_ship(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo`,
          explanation: 'When answer is in a range and you can check feasibility — binary search on the answer.',
        },
      ],
      practicalExercise:
        'Solve 2 problems daily: 1 easy/medium for pattern recognition, 1 medium/hard for depth. Always explain approach before coding.',
    },
    {
      id: 'senior-thinking',
      title: 'Senior-Level DSA Thinking',
      content: `### Scale follow-ups
- "10 million nodes, limited memory" → external sort, streaming, disk-based structures
- "Concurrent access" → locking strategy, lock-free structures
- "Cache efficiency" → array over linked list for traversal

### Production DSA
- Hash collision handling in your language's dict
- When O(n log n) sort beats O(n) counting sort (small n, cache)
- Bloom filters for "probably exists" checks
- Consistent hashing for distributed caches

### Communication framework
1. **Clarify** — input size, constraints, edge cases
2. **Approach** — brute force first, then optimize
3. **Complexity** — time and space
4. **Code** — clean, with meaningful names
5. **Test** — walk through edge cases
6. **Optimize** — if time permits`,
    },
  ],
  questions: [
    {
      id: 'dsa-q1',
      level: 'understanding',
      question: 'Why is hash lookup approximately O(1)?',
      answer:
        'Hash function maps keys to array indices in constant time. With a good hash function and load factor < 0.75, collisions are rare. Average case: O(1). Worst case (all collisions): O(n) linked list traversal.',
    },
    {
      id: 'dsa-q2',
      level: 'application',
      question: 'When would you use a trie over a hash table?',
      answer:
        'Use trie for: prefix matching (autocomplete), spell checking, IP routing tables, when you need ordered traversal of keys with shared prefixes. Hash table is better for exact key lookup.',
    },
    {
      id: 'dsa-q3',
      level: 'senior',
      question: 'You receive a 10-million-node linked structure. Limited memory. How would you reverse it?',
      answer:
        'If memory fits: three-pointer iterative reverse in O(n) time, O(1) space. If memory constrained: process in chunks — read chunk from disk, reverse in memory, write to output file. Or use external merge if cannot fit in RAM. Discuss trade-offs: memory vs I/O vs parallelism.',
    },
    {
      id: 'dsa-q4',
      level: 'senior',
      question: 'Your O(n) algorithm works but production is still slow. What do you investigate?',
      answer:
        '1) Constant factors and cache behavior. 2) Memory allocation patterns (GC pressure). 3) I/O in the loop. 4) Lock contention in concurrent access. 5) Data size — does n actually fit assumptions? 6) Profile hot path. 7) Consider approximation or preprocessing.',
    },
  ],
  seniorScenarios: [
    {
      title: 'Design a rate limiter',
      scenario: 'Implement a rate limiter allowing 100 requests per minute per user.',
      approach:
        'Options: (1) Token bucket — flexible, allows bursts. (2) Sliding window log — precise, more memory. (3) Fixed window counter — simple, boundary issue. (4) Sliding window counter — hybrid. For distributed: Redis with Lua script for atomicity. Key: `rate:{user_id}:{window}`.',
      keyConsiderations: ['Token bucket vs sliding window', 'Distributed atomicity', 'Memory per user', 'Burst handling'],
    },
  ],
  resources: [
    { title: 'LeetCode', url: 'https://leetcode.com/', type: 'practice' },
    { title: 'NeetCode Roadmap', url: 'https://neetcode.io/roadmap', type: 'practice' },
    { title: 'Grokking the Coding Interview', url: 'https://www.designgurus.io/course/grokking-the-coding-interview', type: 'book' },
  ],
};
