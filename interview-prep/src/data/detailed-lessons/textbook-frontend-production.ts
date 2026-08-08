import { buildTextbookLesson } from '../textbook-format';

export const textbookFrontendProductionLessons: Record<string, string> = {
  'react:hooks': buildTextbookLesson({
    chapter: 'React Hooks Deep Dive',
    overview:
      'Hooks are the foundation of modern React. They let function components manage state, side effects, and reusable logic without class components. This chapter covers every built-in hook you need for production applications — when to use each, how they work internally, and the rules that keep your app predictable.',
    objectives: [
      'Use useState, useEffect, useRef, useMemo, and useCallback correctly in production code',
      'Extract reusable logic into custom hooks with clear contracts',
      'Avoid stale closures, infinite effect loops, and unnecessary memoization',
      'Explain hook execution order and the Rules of Hooks in interviews',
    ],
    definitions: [
      { term: 'Hook', definition: 'A function that lets you "hook into" React state and lifecycle features from function components.' },
      { term: 'Stale closure', definition: 'A closure that captures an outdated value from a previous render, causing bugs in effects and callbacks.' },
      { term: 'Custom hook', definition: 'A JavaScript function whose name starts with "use" and that may call other hooks to encapsulate reusable stateful logic.' },
    ],
    sections: [
      {
        title: 'useState and State Updates',
        content: `**useState** returns a state value and a setter. React schedules re-renders when state changes — it does not mutate state in place.

State updates are **asynchronous and batched** in React 18+. Multiple setState calls in the same event handler merge into one render. For updates that depend on the previous value, use the functional form:

\`\`\`tsx
setCount((prev) => prev + 1);
\`\`\`

**Object and array state:** Always create new references. Spreading (\`{ ...user, name: 'Alice' }\`) triggers re-render because React compares by reference for objects.

**Lazy initialization:** Pass a function to useState for expensive initial computation — it runs only on first mount:

\`\`\`tsx
const [data, setData] = useState(() => computeExpensiveInitial());
\`\`\`

**Interview insight:** "Why does my component re-render twice in Strict Mode?" — React intentionally double-invokes effects and certain lifecycles in development to surface side-effect bugs.`,
      },
      {
        title: 'useEffect — Side Effects and Cleanup',
        content: `**useEffect** runs after paint. Use it for: data fetching, subscriptions, DOM manipulation, and syncing with external systems. Do **not** use it for transforming data for render (compute during render instead).

**Dependency array:**
- \`[]\` — run once on mount (and cleanup on unmount)
- \`[a, b]\` — run when \`a\` or \`b\` changes
- omitted — run after every render (rarely correct)

**Cleanup function** runs before the next effect and on unmount. Essential for subscriptions, timers, and AbortController:

\`\`\`tsx
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then((r) => r.json())
    .then(setData);
  return () => controller.abort();
}, [url]);
\`\`\`

**Race conditions:** Without cleanup, a slow response can overwrite a newer one. AbortController or an "ignore" flag fixes this.

**Common mistake:** Including objects/functions in deps without memoization causes infinite loops. Extract primitives or memoize.`,
      },
      {
        title: 'useRef, useMemo, and useCallback',
        content: `**useRef** holds a mutable value that persists across renders without causing re-renders. Uses: DOM references, storing previous values, holding timers/interval IDs, avoiding stale closures in callbacks.

\`\`\`tsx
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();
\`\`\`

**useMemo** caches a computed value between renders when dependencies are unchanged. Use when computation is genuinely expensive or when referential equality matters (e.g., object passed to memoized child).

**useCallback** caches a function reference. Equivalent to \`useMemo(() => fn, deps)\`.

**Don't over-memoize.** Memoization has its own cost. Profile first. React 19's compiler may auto-memoize in many cases.

**Rule of thumb:** useMemo/useCallback when:
1. Passing callbacks/objects to \`React.memo\` children
2. Expensive calculations (sorting 10k items)
3. Dependencies of useEffect need stable references`,
      },
      {
        title: 'Custom Hooks and Composition',
        content: `Custom hooks extract reusable stateful logic. They are not a performance optimization — they are an **abstraction** for sharing behavior.

\`\`\`tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
\`\`\`

**Design principles:**
- Return a tuple \`[value, actions]\` or an object \`{ data, loading, error }\`
- Name clearly: \`useAuth\`, \`useLocalStorage\`, \`useMediaQuery\`
- Keep hooks focused — one responsibility
- Test hooks with \`@testing-library/react\`'s \`renderHook\`

**Rules of Hooks (non-negotiable):**
1. Only call hooks at the top level — never inside loops, conditions, or nested functions
2. Only call hooks from React function components or custom hooks

Violations break React's hook call order tracking and cause unpredictable bugs.`,
      },
    ],
    example: {
      title: 'Data fetching hook with loading and error states',
      language: 'tsx',
      code: `function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
  let cancelled = false;
  setLoading(true);
  fetch(\`/api/users/\${userId}\`)
    .then((r) => r.json())
    .then((data) => { if (!cancelled) setUser(data); })
    .catch((e) => { if (!cancelled) setError(e); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
  }, [userId]);

  return { user, loading, error };
}`,
      explanation:
        'This pattern handles the three common states (loading, success, error) and prevents race conditions when userId changes quickly. In production, prefer TanStack Query which handles caching, deduplication, and background refetch automatically.',
    },
    pitfalls: [
      'Calling hooks conditionally — breaks React\'s internal hook index tracking',
      'Missing dependencies in useEffect — causes stale data bugs',
      'Using useEffect for derived state — compute during render instead',
      'Overusing useMemo/useCallback without measuring — adds complexity without benefit',
      'Storing fetched data only in useState without handling loading/error states',
    ],
    summary: [
      'useState batches updates; use functional updates when next state depends on previous',
      'useEffect needs correct deps and cleanup for subscriptions, timers, and fetch abort',
      'useRef for mutable values without re-render; useMemo/useCallback only when justified',
      'Custom hooks share logic; follow Rules of Hooks strictly',
      'Prefer TanStack Query over hand-rolled fetch hooks for server state',
    ],
    reviewQuestions: [
      { q: 'Why must hooks not be called inside conditions?', hint: 'React tracks hooks by call order on each render.' },
      { q: 'When would you choose useRef over useState?', hint: 'When changing the value should not trigger a re-render.' },
    ],
  }),

  'react:state': buildTextbookLesson({
    chapter: 'React State Management',
    overview:
      'State management is one of the most debated topics in React. This chapter teaches a decision framework: when local state suffices, when to lift state, when Context helps, when a global store earns its complexity, and when server state libraries replace most client state needs.',
    objectives: [
      'Choose the right state layer for each piece of application data',
      'Recognize signals that state should be lifted or extracted',
      'Compare Context, Redux/Zustand, and TanStack Query trade-offs',
      'Structure scalable state in large applications',
    ],
    definitions: [
      { term: 'Client state', definition: 'UI state owned by the browser: form inputs, modals, theme, selected tab.' },
      { term: 'Server state', definition: 'Async data from APIs: cached, shared, potentially stale, requires synchronization.' },
      { term: 'Prop drilling', definition: 'Passing props through many intermediate components that do not use them.' },
    ],
    sections: [
      {
        title: 'The State Management Spectrum',
        content: `React state exists on a spectrum from local to global:

1. **Component local state** — form inputs, toggles, hover state
2. **Lifted state** — siblings share via common parent
3. **Context** — theme, locale, auth user (low-frequency updates)
4. **Global store** (Redux, Zustand, Jotai) — complex client logic, middleware, devtools
5. **Server state** (TanStack Query, SWR) — API data with caching and sync

**The modern default:** Keep UI state local or in a lightweight store. Put API data in TanStack Query. Context for dependency injection and rarely-changing globals.

Most "Redux for everything" architectures from 2018 are now over-engineered. Server state libraries eliminated 60-80% of typical Redux use cases.`,
      },
      {
        title: 'When to Lift State',
        content: `Lift state when multiple components need the same data or when sibling components must stay in sync.

**Signals to refactor:**
- Prop drilling more than 2-3 levels for data many descendants need
- Unrelated components sharing state through a distant ancestor
- Frequent updates causing wide re-render trees
- Duplicated state that can get out of sync

**Colocation principle:** Keep state as close as possible to where it's used. Only lift when sharing is required.

\`\`\`tsx
// Before: state in parent, passed to FilterBar and ResultsList
function SearchPage() {
  const [query, setQuery] = useState('');
  return (
    <>
      <FilterBar query={query} onChange={setQuery} />
      <ResultsList query={query} />
    </>
  );
}
\`\`\`

For URL-driven state (filters, pagination), prefer **URL search params** — shareable, bookmarkable, back-button friendly.`,
      },
      {
        title: 'Context — Power and Pitfalls',
        content: `**React Context** provides a value to all descendants without prop drilling. Ideal for:
- Theme (dark/light)
- Authentication session
- i18n locale
- Feature flags

**Performance trap:** Every Context value change re-renders **all** consumers. Split contexts by update frequency:

\`\`\`tsx
// Bad: one context with theme + user + notifications
// Good: separate ThemeContext, AuthContext, NotificationContext
\`\`\`

**Mitigation strategies:**
- Split contexts by concern and update frequency
- Memoize context value: \`useMemo(() => ({ user, login }), [user, login])\`
- Use selectors (Zustand, use-context-selector) for fine-grained subscriptions

Context is **not** a state management replacement for high-frequency updates (e.g., cursor position, animation frames).`,
      },
      {
        title: 'Global Stores and Server State',
        content: `**Redux / Zustand / Jotai** — use when:
- Complex client-side state logic (multi-step wizards, undo/redo)
- State updates from many unrelated parts of the app
- Middleware needs (logging, persistence, time-travel debugging)
- Derived state with complex dependencies

**Zustand** is the modern lightweight choice — minimal boilerplate, works outside React, supports selectors.

**TanStack Query** for server state:
- Automatic caching, background refetch, stale-while-revalidate
- Deduplication of in-flight requests
- Optimistic updates and pagination built-in
- Replaces most "fetch on mount + store in Redux" patterns

\`\`\`tsx
const { data, isLoading } = useQuery({
  queryKey: ['users', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000,
});
\`\`\`

**Interview answer template:** "I'd keep form UI state local, auth in Context, API data in TanStack Query, and only add Zustand if we have complex cross-cutting client state like a multi-step checkout with offline support."`,
      },
    ],
    pitfalls: [
      'Putting server/API data in Redux when TanStack Query handles it better',
      'Single giant Context causing app-wide re-renders on every update',
      'Global store for state only one component uses',
      'Duplicating server state in local state without sync strategy',
      'Ignoring URL as state for filters, tabs, and pagination',
    ],
    summary: [
      'Colocate state; lift only when sharing is required',
      'Context for low-frequency global values; split by concern',
      'TanStack Query replaces most Redux use cases for API data',
      'Global stores earn their cost for complex client logic only',
      'URL search params are underrated state for filters and navigation',
    ],
  }),

  'react:performance': buildTextbookLesson({
    chapter: 'React Performance Optimization',
    overview:
      'React is fast by default — premature optimization wastes time. This chapter teaches when components re-render, how to measure performance problems, and which optimizations actually matter in production applications with thousands of components.',
    objectives: [
      'Explain all causes of React re-renders',
      'Apply React.memo, virtualization, and code splitting appropriately',
      'Use React DevTools Profiler to find real bottlenecks',
      'Avoid common anti-patterns that defeat memoization',
    ],
    definitions: [
      { term: 'Re-render', definition: 'React calling a component function again to compute new JSX — not necessarily DOM updates.' },
      { term: 'Virtualization', definition: 'Rendering only visible items in a long list, recycling DOM nodes as the user scrolls.' },
      { term: 'Code splitting', definition: 'Loading JavaScript bundles on demand instead of one monolithic bundle.' },
    ],
    sections: [
      {
        title: 'Understanding Re-renders',
        content: `A component re-renders when:
1. Its **state** changes
2. Its **props** change (shallow comparison)
3. Its **parent** re-renders (cascading — children always re-render unless memoized)
4. **Context** it consumes changes

Re-rendering is cheap for most components. DOM updates are expensive. React's reconciliation minimizes actual DOM mutations.

**Measure before optimizing:**
- React DevTools Profiler — record interactions, find slow commits
- \`console.time\` around expensive computations
- Web Vitals: LCP, INP (Interaction to Next Paint), CLS

**Rule:** If Profiler shows <16ms per interaction, optimization is premature.`,
      },
      {
        title: 'React.memo and Referential Stability',
        content: `\`React.memo(Component)\` skips re-render if props are shallow-equal to previous.

**Only helps when:**
- Component is expensive to render
- Props are stable between parent re-renders
- Parent re-renders frequently but child's props rarely change

**Defeats memoization:**
\`\`\`tsx
// New function every render — memo is useless
<Child onClick={() => handleClick(id)} />

// Fix: useCallback or pass stable reference
const onClick = useCallback(() => handleClick(id), [id]);
<Child onClick={onClick} />
\`\`\`

**Inline objects in JSX** create new references every render:
\`\`\`tsx
<Chart style={{ width: 400 }} />  // new object every time
\`\`\`

Extract to constant or useMemo when passing to memoized children.`,
      },
      {
        title: 'Virtualization and Code Splitting',
        content: `**Virtualization** (react-window, @tanstack/react-virtual) — for lists/tables with 1000+ rows. Only renders ~20 visible rows regardless of data size.

\`\`\`tsx
import { FixedSizeList } from 'react-window';

<FixedSizeList height={600} itemCount={10000} itemSize={50} width="100%">
  {({ index, style }) => <Row style={style} data={items[index]} />}
</FixedSizeList>
\`\`\`

**Code splitting** with React.lazy + Suspense:
\`\`\`tsx
const AdminPanel = lazy(() => import('./AdminPanel'));

<Suspense fallback={<Spinner />}>
  <AdminPanel />
</Suspense>
\`\`\`

Split by route (Next.js does this automatically), by feature (admin, settings), and by heavy libraries (charts, editors).

**Next.js:** Server Components send zero JS for static content — the ultimate code split.`,
      },
      {
        title: 'Production Performance Checklist',
        content: `**Bundle analysis:** \`@next/bundle-analyzer\` or \`webpack-bundle-analyzer\` — find heavy dependencies.

**Images:** Use next/image, WebP/AVIF, proper sizing, lazy loading.

**Avoid:**
- Inline anonymous functions/objects in hot paths
- Context with frequently changing values at app root
- Fetching in every child instead of lifting or using query cache
- Synchronous expensive work during render (move to useMemo or Web Worker)

**Concurrent features (React 18+):**
- \`useTransition\` — mark updates as non-urgent (filtering large lists)
- \`useDeferredValue\` — defer expensive re-renders

**Web Workers** for CPU-heavy work (sorting, parsing) off the main thread.`,
      },
    ],
    pitfalls: [
      'Memoizing every component without profiling — adds overhead',
      'React.memo on components that always receive new props',
      'Rendering 10k DOM nodes without virtualization',
      'Importing entire lodash/moment instead of tree-shakeable alternatives',
      'Optimizing render time when network latency is the real bottleneck',
    ],
    summary: [
      'Profile first — React DevTools Profiler and Web Vitals',
      'React.memo + stable props for expensive pure components',
      'Virtualize long lists; code-split routes and heavy features',
      'Server Components eliminate client JS for static content',
      'useTransition for non-urgent UI updates in React 18+',
    ],
  }),

  'react:reconciliation': buildTextbookLesson({
    chapter: 'Reconciliation and the Virtual DOM',
    overview:
      'Understanding reconciliation explains why keys matter, why React is fast, and when the Virtual DOM is not the bottleneck. This chapter covers the diffing algorithm, fiber architecture, and practical implications for list rendering and component design.',
    objectives: [
      'Explain how React\'s reconciliation algorithm works',
      'Understand why keys are critical for list rendering',
      'Describe when Virtual DOM helps and when it does not',
      'Apply reconciliation knowledge to avoid subtle UI bugs',
    ],
    definitions: [
      { term: 'Virtual DOM', definition: 'An in-memory JavaScript representation of the UI tree that React diffs against to compute minimal DOM updates.' },
      { term: 'Reconciliation', definition: 'The process of comparing the previous and next element trees to determine what changed.' },
      { term: 'Fiber', definition: 'React\'s unit of work — each component instance is a fiber node in a linked tree, enabling incremental rendering.' },
    ],
    sections: [
      {
        title: 'How Reconciliation Works',
        content: `When state changes, React:
1. Calls component functions to produce new JSX (new Virtual DOM tree)
2. **Diffs** old tree vs new tree
3. Applies **minimal DOM mutations** to match the new tree

**Element type comparison:**
- **Same type** (e.g., both \`<div>\`) → update props, recurse into children
- **Different type** (e.g., \`<div>\` → \`<span>\`) → unmount old subtree, mount new
- **Different component type** → full unmount/remount (state is lost!)

This is why changing component type dynamically destroys internal state:
\`\`\`tsx
{isEditing ? <EditForm key={id} /> : <DisplayView key={id} />}
// key preserves identity when switching back
\`\`\``,
      },
      {
        title: 'Keys and List Rendering',
        content: `When rendering lists, React matches children **by position** unless keys are provided.

**Without stable keys:** React reuses DOM nodes by index, causing:
- Wrong component state attached to wrong item
- Unnecessary DOM updates instead of moves
- Broken animations and focus

\`\`\`tsx
// Bad: index as key for dynamic lists
items.map((item, i) => <Row key={i} item={item} />)

// Good: stable unique ID
items.map((item) => <Row key={item.id} item={item} />)
\`\`\`

**Index as key is OK when:** list is static, never reordered, never filtered.

**Never use random keys** — causes full remount every render.

**Key on component vs element:** Key tells React which identity to preserve across renders.`,
      },
      {
        title: 'Fiber Architecture and Concurrent Rendering',
        content: `React Fiber (since React 16) reimplemented reconciliation as a **work loop** that can be interrupted, paused, and resumed.

**Benefits:**
- Incremental rendering — split work across frames
- Prioritization — user input interrupts low-priority updates
- Concurrent features — Suspense, transitions, streaming

**Render phases:**
1. **Render phase** — compute what changed (interruptible)
2. **Commit phase** — apply DOM updates (synchronous, not interruptible)

**Practical implication:** State updates marked with \`startTransition\` or \`useTransition\` won't block urgent updates like typing.`,
      },
      {
        title: 'Virtual DOM — Myths and Reality',
        content: `**Myth:** "Virtual DOM is always faster than direct DOM manipulation."
**Reality:** For simple, targeted updates, direct DOM can be faster. Virtual DOM wins when:
- Many components update from one state change
- Batching minimizes layout thrashing
- Developer productivity matters more than micro-optimizations

**When Virtual DOM is NOT the bottleneck:**
- Network latency (API calls)
- Large bundle download/parse time
- Expensive layout/paint (CSS, images)
- Main thread blocked by JavaScript computation

**Interview answer:** "React's Virtual DOM enables declarative UI with efficient batched updates. I'd profile with DevTools before assuming render is the problem — usually it's data fetching or bundle size."`,
      },
    ],
    pitfalls: [
      'Using array index as key for sortable/filterable lists',
      'Changing component type without key — loses component state',
      'Assuming Virtual DOM slowness without profiling',
      'Generating random keys — forces unnecessary remounts',
      'Huge lists without virtualization — DOM node count is the real cost',
    ],
    summary: [
      'Reconciliation diffs Virtual DOM trees and applies minimal DOM changes',
      'Same element type updates props; different type unmounts and remounts',
      'Stable unique keys are essential for dynamic lists',
      'Fiber enables concurrent rendering and interruptible work',
      'Profile before blaming Virtual DOM — network and bundle size often dominate',
    ],
  }),

  'react:server-state': buildTextbookLesson({
    chapter: 'Server State with TanStack Query',
    overview:
      'Server state is fundamentally different from client state — it is asynchronous, shared, cacheable, and can become stale. TanStack Query (React Query) is the industry standard for managing server state in React applications, replacing most manual fetch + useState + useEffect patterns.',
    objectives: [
      'Distinguish server state from client state',
      'Configure caching, stale time, and background refetch',
      'Implement optimistic updates and pagination',
      'Handle error states and retry logic in production',
    ],
    definitions: [
      { term: 'Server state', definition: 'Data owned by the server, fetched asynchronously, potentially stale, shared across users and components.' },
      { term: 'Stale-while-revalidate', definition: 'Show cached data immediately while fetching fresh data in the background.' },
      { term: 'Query key', definition: 'A unique identifier (array) for a cached query — changes invalidate and refetch.' },
    ],
    sections: [
      {
        title: 'Server State vs Client State',
        content: `| Property | Client State | Server State |
|----------|-------------|--------------|
| Location | Browser memory | Server/database |
| Ownership | Frontend | Backend |
| Sync | Immediate | Async (network) |
| Sharing | Per-tab or global store | Shared across users |
| Staleness | Always fresh | Can be outdated |

**Client state examples:** modal open, form input, selected tab, sidebar collapsed.
**Server state examples:** user profile, product list, order history, permissions.

Trying to manage server state with useState + useEffect leads to: duplicate requests, no caching, race conditions, manual loading/error handling, and cache invalidation nightmares.`,
      },
      {
        title: 'TanStack Query Core Concepts',
        content: `\`\`\`tsx
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['todos', { status: 'open' }],
  queryFn: () => fetchTodos({ status: 'open' }),
  staleTime: 5 * 60 * 1000,  // 5 min before considered stale
  gcTime: 30 * 60 * 1000,    // cache garbage collection
});
\`\`\`

**Query key** — uniquely identifies cached data. Include all variables that affect the result.

**staleTime** — how long data is considered fresh (no background refetch).
**gcTime** (was cacheTime) — how long inactive data stays in cache.

**Automatic behaviors:**
- Deduplication — same queryKey = one network request
- Background refetch on window focus
- Retry with exponential backoff on failure
- Stale-while-revalidate — show cached, fetch fresh`,
      },
      {
        title: 'Mutations and Cache Invalidation',
        content: `\`\`\`tsx
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: createTodo,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
\`\`\`

**Invalidation strategies:**
- \`invalidateQueries\` — mark stale, refetch on next access
- \`setQueryData\` — optimistically update cache
- \`removeQueries\` — clear cache entirely

**Optimistic updates:**
\`\`\`tsx
onMutate: async (newTodo) => {
  await queryClient.cancelQueries({ queryKey: ['todos'] });
  const previous = queryClient.getQueryData(['todos']);
  queryClient.setQueryData(['todos'], (old) => [...old, newTodo]);
  return { previous };
},
onError: (err, newTodo, context) => {
  queryClient.setQueryData(['todos'], context.previous);
},
\`\`\``,
      },
      {
        title: 'Pagination, Infinite Scroll, and Prefetching',
        content: `**Pagination:**
\`\`\`tsx
useQuery({
  queryKey: ['posts', page],
  queryFn: () => fetchPosts(page),
  placeholderData: keepPreviousData, // smooth page transitions
});
\`\`\`

**Infinite scroll:**
\`\`\`tsx
useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam = 0 }) => fetchPosts(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
\`\`\`

**Prefetching** on hover for instant navigation:
\`\`\`tsx
onMouseEnter={() => queryClient.prefetchQuery({
  queryKey: ['post', id],
  queryFn: () => fetchPost(id),
})}
\`\`\`

**Server Components + Query:** Fetch on server for initial data, hydrate QueryClient for client interactivity.`,
      },
    ],
    pitfalls: [
      'Hand-rolling fetch logic when TanStack Query solves it better',
      'Query keys missing variables — causes stale/wrong cache hits',
      'Not handling isLoading vs isFetching — users see stale data flash',
      'Invalidating too broadly — refetches everything unnecessarily',
      'Storing server data in Redux AND React Query — double source of truth',
    ],
    summary: [
      'Server state is async, shared, and cacheable — different from UI state',
      'TanStack Query handles caching, dedup, retry, and background refetch',
      'Query keys must include all variables affecting the result',
      'Mutations need explicit cache invalidation or optimistic updates',
      'useInfiniteQuery and prefetching for pagination and perceived performance',
    ],
  }),

  'nextjs:app-router': buildTextbookLesson({
    chapter: 'Next.js App Router and Server Components',
    overview:
      'Next.js App Router (Next.js 13+) fundamentally changes how React applications are built. Server Components render on the server with zero client JavaScript, while Client Components handle interactivity. Mastering this boundary is essential for full-stack React development.',
    objectives: [
      'Distinguish Server Components from Client Components',
      'Place the "use client" boundary optimally in component trees',
      'Fetch data directly in Server Components',
      'Design layouts, loading states, and error boundaries in the App Router',
    ],
    definitions: [
      { term: 'Server Component', definition: 'A React component that renders exclusively on the server — no hooks, no browser APIs, no client JS bundle.' },
      { term: 'Client Component', definition: 'A component marked with "use client" that runs in the browser with full React interactivity.' },
      { term: 'RSC payload', definition: 'The serialized output of Server Components sent to the client for hydration and interactivity boundaries.' },
    ],
    sections: [
      {
        title: 'Server vs Client Components',
        content: `**Server Components (default):**
- Render on server only — zero JS sent to client
- Can directly access databases, file system, secrets
- Cannot use useState, useEffect, event handlers
- Can be async — \`async function Page() { const data = await db.query() }\`

**Client Components ("use client"):**
- Run in browser — interactivity, hooks, browser APIs
- Required for: onClick, useState, useEffect, context consumers
- Still pre-rendered on server (SSR) but hydrated on client

**Rule:** Default to Server Components. Push "use client" as **low** as possible — wrap only the interactive leaf, not entire pages.

\`\`\`tsx
// app/users/page.tsx — Server Component
export default async function UsersPage() {
  const users = await db.user.findMany();
  return <UserList users={users} />; // UserList can be client if interactive
}
\`\`\``,
      },
      {
        title: 'File-Based Routing and Layouts',
        content: `App Router uses the \`app/\` directory:

\`\`\`
app/
  layout.tsx       # Root layout (wraps all pages)
  page.tsx         # Home page (/)
  users/
    layout.tsx     # Layout for /users/*
    page.tsx       # /users
    [id]/
      page.tsx     # /users/:id
  api/
    users/route.ts # API route handler
\`\`\`

**Special files:**
- \`layout.tsx\` — shared UI, persists across navigation
- \`loading.tsx\` — Suspense fallback for the route segment
- \`error.tsx\` — error boundary (must be Client Component)
- \`not-found.tsx\` — 404 UI
- \`route.ts\` — API endpoint (GET, POST, etc.)

**Layouts don't re-render** on navigation — only page content swaps. Ideal for sidebars, nav bars.`,
      },
      {
        title: 'Data Fetching in Server Components',
        content: `Server Components fetch data directly — no useEffect, no loading state boilerplate:

\`\`\`tsx
async function ProductPage({ params }: { params: { id: string } }) {
  const product = await fetchProduct(params.id);
  return <ProductDetails product={product} />;
}
\`\`\`

**Parallel data fetching:**
\`\`\`tsx
const [user, orders] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
]);
\`\`\`

**Request deduplication:** Next.js automatically deduplicates identical fetch calls within a single request.

**Caching:** \`fetch(url, { next: { revalidate: 3600 } })\` — ISR-style caching. \`cache: 'no-store'\` for dynamic data.

**Server Actions** for mutations:
\`\`\`tsx
'use server'
async function createUser(formData: FormData) {
  await db.user.create({ data: { name: formData.get('name') } });
  revalidatePath('/users');
}
\`\`\``,
      },
      {
        title: 'Composition Patterns and Boundaries',
        content: `**Pattern: Server page + Client islands**
\`\`\`tsx
// Server Component page
export default async function Dashboard() {
  const stats = await getStats();
  return (
    <div>
      <StatsDisplay stats={stats} />      {/* Server */}
      <InteractiveChart data={stats} />    {/* Client — "use client" */}
      <FilterPanel />                      {/* Client */}
    </div>
  );
}
\`\`\`

**Passing Server → Client:** Only serializable props (JSON-safe). Cannot pass functions, classes, or Date objects directly.

**Children pattern:** Server Components can pass Server Component children to Client Components:
\`\`\`tsx
<ClientWrapper>
  <ServerContent />  {/* Rendered on server, passed as children */}
</ClientWrapper>
\`\`\`

**Interview scenario:** Dashboard with auth, DB data, real-time updates, filters — Server for initial fetch and layout, Client for filters and WebSocket, React Query for client-side refetch.`,
      },
    ],
    pitfalls: [
      'Adding "use client" at the top of page.tsx — ships entire page JS to client',
      'Using useEffect for data that could be fetched in Server Component',
      'Passing non-serializable props from Server to Client Components',
      'Forgetting error.tsx and loading.tsx — poor UX during fetch',
      'Mixing Pages Router and App Router patterns in the same app',
    ],
    summary: [
      'Default to Server Components; "use client" only for interactivity',
      'App Router: file-based routing with layouts, loading, and error boundaries',
      'Fetch directly in async Server Components — no useEffect needed',
      'Push client boundary low in the tree to minimize JS bundle',
      'Server Actions for mutations with revalidatePath/revalidateTag',
    ],
  }),

  'nextjs:rendering': buildTextbookLesson({
    chapter: 'Next.js Rendering Strategies',
    overview:
      'Choosing the right rendering strategy affects performance, SEO, data freshness, and infrastructure cost. This chapter covers SSR, SSG, ISR, streaming, and how Next.js caching layers interact with each strategy.',
    objectives: [
      'Compare SSR, SSG, ISR, and client-side rendering trade-offs',
      'Configure revalidation and caching policies',
      'Implement streaming with Suspense for faster perceived load',
      'Choose rendering strategy based on data freshness requirements',
    ],
    definitions: [
      { term: 'SSR (Server-Side Rendering)', definition: 'HTML generated on each request — always fresh, higher server load.' },
      { term: 'SSG (Static Site Generation)', definition: 'HTML generated at build time — fastest delivery, stale until rebuild.' },
      { term: 'ISR (Incremental Static Regeneration)', definition: 'Static pages regenerated in the background after a revalidation interval.' },
    ],
    sections: [
      {
        title: 'Rendering Strategy Comparison',
        content: `| Strategy | When HTML is built | Data freshness | Server load | Best for |
|----------|-------------------|----------------|-------------|----------|
| SSG | Build time | Stale until rebuild | None at runtime | Blogs, docs, marketing |
| ISR | Build + periodic regen | Configurable (seconds to hours) | Low | Product catalogs, news |
| SSR | Every request | Always fresh | High per request | Personalized dashboards |
| CSR | Client (browser) | Fresh on fetch | None on server | Admin panels, SPAs |

**Decision framework:**
- Data changes rarely → SSG
- Data changes periodically → ISR with revalidate
- Data is user-specific or real-time → SSR or CSR with streaming
- SEO required + dynamic → SSR or ISR`,
      },
      {
        title: 'Static Generation and ISR',
        content: `\`\`\`tsx
// SSG — generated at build time
export default async function BlogPost({ params }) {
  const post = await getPost(params.slug);
  return <Article post={post} />;
}

// ISR — revalidate every 60 seconds
export const revalidate = 60;

// Or per-fetch:
const res = await fetch(url, { next: { revalidate: 3600 } });
\`\`\`

**On-demand revalidation:**
\`\`\`tsx
import { revalidatePath, revalidateTag } from 'next/cache';

// After CMS webhook or mutation:
revalidatePath('/blog/[slug]');
revalidateTag('posts');
\`\`\`

**generateStaticParams** for dynamic routes:
\`\`\`tsx
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}
\`\`\``,
      },
      {
        title: 'SSR and Dynamic Rendering',
        content: `Force dynamic rendering when data must be fresh per request:

\`\`\`tsx
export const dynamic = 'force-dynamic'; // SSR every request
// or
export const fetchCache = 'force-no-store';
\`\`\`

**Use cases:** User dashboards, cart pages, authenticated content, A/B testing.

**Cost consideration:** SSR scales with traffic — every request hits your server. Cache aggressively where possible.

**Partial Prerendering (PPR):** Static shell with dynamic holes — Next.js 14+ experimental. Best of both worlds for pages with static layout + dynamic content.`,
      },
      {
        title: 'Streaming and Suspense',
        content: `Streaming sends HTML in chunks as each Suspense boundary resolves:

\`\`\`tsx
export default function Page() {
  return (
    <div>
      <Header />  {/* Immediate */}
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />  {/* Streams when ready */}
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />  {/* Independent stream */}
      </Suspense>
    </div>
  );
}
\`\`\`

**Benefits:**
- Faster Time to First Byte (TTFB) — user sees layout immediately
- Independent sections load in parallel
- loading.tsx automatically wraps page in Suspense

**loading.tsx vs Suspense:** loading.tsx is route-level; Suspense is component-level granularity.`,
      },
    ],
    pitfalls: [
      'Using SSR for content that rarely changes — wastes server resources',
      'SSG for personalized content — shows wrong data to users',
      'Not setting revalidate — ISR pages never update',
      'Blocking entire page on slowest data fetch instead of streaming',
      'Ignoring cache headers — CDN serves stale content unexpectedly',
    ],
    summary: [
      'SSG for static, ISR for periodic updates, SSR for per-request freshness',
      'revalidatePath/revalidateTag for on-demand cache invalidation',
      'Streaming + Suspense for faster perceived load times',
      'Choose strategy based on data freshness, SEO, and server cost',
      'Push dynamic rendering only where truly needed',
    ],
  }),

  'networking:load-balancing': buildTextbookLesson({
    chapter: 'Load Balancing and Reverse Proxies',
    overview:
      'Load balancers distribute traffic across multiple servers, provide SSL termination, enable health checks, and are the entry point for every scalable web architecture. This chapter covers algorithms, L4 vs L7, and production patterns with Nginx, HAProxy, and cloud load balancers.',
    objectives: [
      'Compare load balancing algorithms and when to use each',
      'Distinguish L4 and L7 load balancing',
      'Design health checks and session affinity strategies',
      'Explain reverse proxy responsibilities beyond load distribution',
    ],
    definitions: [
      { term: 'Load balancer', definition: 'A device or service that distributes incoming requests across multiple backend servers.' },
      { term: 'L7 load balancing', definition: 'Application-layer routing based on HTTP headers, URL path, cookies, or content.' },
      { term: 'SSL termination', definition: 'Decrypting HTTPS at the load balancer so backends receive plain HTTP — reduces CPU on app servers.' },
    ],
    sections: [
      {
        title: 'Load Balancing Algorithms',
        content: `| Algorithm | How it works | Best for |
|-----------|-------------|----------|
| Round robin | Rotate through servers sequentially | Equal-capacity homogeneous servers |
| Weighted round robin | Servers get proportionally more traffic | Mixed server capacities |
| Least connections | Route to server with fewest active connections | Long-lived connections, variable request times |
| IP hash | Same client IP → same server | Session affinity without cookies |
| Consistent hashing | Minimal redistribution when servers added/removed | Caching layers, distributed systems |

**Health checks:** Load balancers probe backends periodically. Unhealthy servers are removed from rotation automatically.

\`\`\`
GET /health → 200 OK within 2s → healthy
GET /health → timeout or 503 → unhealthy (removed)
\`\`\``,
      },
      {
        title: 'L4 vs L7 Load Balancing',
        content: `**L4 (Transport layer):**
- Routes by IP address and TCP/UDP port
- Faster — no HTTP parsing
- Cannot route by URL path or headers
- Examples: AWS NLB, HAProxy in TCP mode

**L7 (Application layer):**
- Routes by HTTP URL, headers, cookies, host
- SSL termination, request rewriting, caching
- Content-based routing: \`/api/*\` → API servers, \`/static/*\` → CDN
- Examples: AWS ALB, Nginx, HAProxy HTTP mode

**Production pattern:** Internet → L7 ALB (SSL termination, routing) → L4/internal LB → application pods.

**Interview answer:** "I'd use L7 ALB at the edge for SSL termination and path-based routing to microservices, with health checks and auto-scaling groups behind it."`,
      },
      {
        title: 'Reverse Proxy Responsibilities',
        content: `A reverse proxy sits between clients and servers, handling:

1. **Load distribution** — spread traffic across backends
2. **SSL/TLS termination** — decrypt HTTPS, forward HTTP internally
3. **Caching** — cache static responses, reduce backend load
4. **Compression** — gzip/brotli response bodies
5. **Rate limiting** — protect backends from abuse
6. **Request buffering** — slow clients don't tie up backend connections
7. **WebSocket proxying** — upgrade connections for real-time

**Nginx example:**
\`\`\`nginx
upstream api_servers {
  least_conn;
  server 10.0.1.1:8000;
  server 10.0.1.2:8000;
}
server {
  listen 443 ssl;
  location /api/ {
    proxy_pass http://api_servers;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
\`\`\``,
      },
      {
        title: 'CDN and Global Distribution',
        content: `**CDN (Content Delivery Network)** caches static assets at edge locations worldwide:
- Reduces latency for global users
- Offloads origin server bandwidth
- DDoS protection at edge

**Cache hierarchy:** Browser → CDN edge → Origin load balancer → App servers → Database

**Cache invalidation:** Purge by URL pattern or tag when content updates.

**When to use CDN:** Static assets (JS, CSS, images), API responses with cache headers, video streaming.

**CloudFront + S3:** Static site hosting with global CDN — no origin servers needed for static content.`,
      },
    ],
    pitfalls: [
      'Round robin with unequal server capacities — overloads weaker servers',
      'No health checks — traffic routed to dead servers',
      'Session affinity when stateless design is possible — limits scaling',
      'SSL termination without HSTS — downgrade attacks possible',
      'Ignoring connection limits — load balancer itself becomes bottleneck',
    ],
    summary: [
      'Choose algorithm based on connection duration and server homogeneity',
      'L7 for HTTP routing and SSL termination; L4 for raw TCP performance',
      'Reverse proxies handle SSL, caching, compression, and rate limiting',
      'Health checks automatically remove failed backends',
      'CDN for static assets reduces latency and origin load globally',
    ],
  }),

  'linux:commands': buildTextbookLesson({
    chapter: 'Essential Linux Commands',
    overview:
      'Production debugging happens on the command line. This chapter covers the essential Linux commands for process management, memory, disk, network, text processing, and system administration — the toolkit every backend engineer needs.',
    objectives: [
      'Monitor processes, CPU, memory, disk, and network from the terminal',
      'Use grep, awk, sed, and pipes for log analysis',
      'Manage services with systemd and journalctl',
      'Navigate the filesystem and understand permissions',
    ],
    definitions: [
      { term: 'PID', definition: 'Process ID — unique identifier for each running process on a Linux system.' },
      { term: 'Pipe (|)', definition: 'Shell operator that sends stdout of one command as stdin to the next.' },
      { term: 'systemd', definition: 'The init system and service manager on most modern Linux distributions.' },
    ],
    sections: [
      {
        title: 'Process Management',
        content: `\`\`\`bash
ps aux                    # All processes with details
ps aux | grep python      # Find Python processes
top                       # Interactive process monitor
htop                      # Better top (install separately)
kill -15 <PID>            # Graceful SIGTERM
kill -9 <PID>             # Force SIGKILL (last resort)
lsof -p <PID>             # Open files by process
lsof -i :8080             # What's listening on port 8080
pgrep -f "uvicorn"        # Find PID by name
\`\`\`

**Signals:** SIGTERM (15) allows cleanup. SIGKILL (9) immediate termination. SIGUSR1 often triggers log rotation or graceful reload.

**Process tree:** \`pstree -p <PID>\` — see parent-child relationships.`,
      },
      {
        title: 'Memory and Disk',
        content: `\`\`\`bash
free -h                   # Memory usage summary
vmstat 1                  # Virtual memory stats every 1s
df -h                     # Disk space by filesystem
du -sh /var/log/*         # Directory sizes
du -sh /* | sort -rh | head  # Largest top-level dirs
iostat -x 1               # Disk I/O stats
\`\`\`

**OOM Killer:** When memory exhausted, Linux kills processes. Check \`dmesg | grep -i oom\` or \`journalctl -k | grep -i oom\`.

**/proc filesystem:**
\`\`\`bash
cat /proc/<PID>/status     # Process memory details
cat /proc/<PID>/limits     # Resource limits
ls /proc/<PID>/fd           # Open file descriptors
\`\`\``,
      },
      {
        title: 'Networking Commands',
        content: `\`\`\`bash
ss -tlnp                  # Listening TCP ports with PIDs
ss -tan state established # Active connections
curl -v https://api.example.com  # HTTP request with headers
curl -w "@curl-format.txt" -o /dev/null -s URL  # Timing breakdown
dig example.com           # DNS lookup
nslookup example.com
tcpdump -i eth0 port 443  # Capture network packets
traceroute example.com    # Route to destination
\`\`\`

**curl timing breakdown** (create curl-format.txt):
\`\`\`
time_namelookup: %{time_namelookup}\\n
time_connect: %{time_connect}\\n
time_appconnect: %{time_appconnect}\\n
time_starttransfer: %{time_starttransfer}\\n
time_total: %{time_total}\\n
\`\`\`

Separates DNS, TCP, TLS, and server response time.`,
      },
      {
        title: 'Text Processing and System Services',
        content: `**Text processing:**
\`\`\`bash
grep -r "ERROR" /var/log/app/     # Recursive search
grep -c "timeout" access.log      # Count matches
awk '{print $1, $9}' access.log   # Extract columns
sed 's/old/new/g' file.txt        # Replace text
sort | uniq -c | sort -rn         # Count occurrences
tail -f /var/log/app.log          # Follow log in real-time
\`\`\`

**systemd services:**
\`\`\`bash
systemctl status nginx
systemctl restart myapp
systemctl enable myapp          # Start on boot
journalctl -u myapp -f          # Follow service logs
journalctl -u myapp --since "1 hour ago"
journalctl -p err               # Error level and above
\`\`\``,
      },
    ],
    pitfalls: [
      'kill -9 as first resort — prevents graceful cleanup',
      'Running top on production without understanding load averages',
      'grep without -r or wrong path — missing log entries',
      'Not checking disk space before deployments — causes silent failures',
      'tcpdump without filters on busy interfaces — overwhelming output',
    ],
    summary: [
      'ps/top/htop for processes; kill -15 before kill -9',
      'free/vmstat for memory; df/du for disk; ss for network',
      'curl -w for latency breakdown; dig for DNS',
      'grep/awk/sed for log analysis; journalctl for systemd logs',
      '/proc filesystem for deep process inspection',
    ],
  }),

  'linux:debugging': buildTextbookLesson({
    chapter: 'Production Debugging on Linux',
    overview:
      'When production breaks at 3 AM, you need a systematic debugging methodology. This chapter provides step-by-step playbooks for CPU spikes, memory leaks, disk exhaustion, and network issues — the scenarios that appear in senior engineering interviews.',
    objectives: [
      'Follow systematic playbooks for CPU, memory, disk, and network issues',
      'Use strace, perf, and pmap for deep process inspection',
      'Debug containerized applications with kubectl equivalents',
      'Correlate symptoms with root causes quickly under pressure',
    ],
    definitions: [
      { term: 'Load average', definition: 'Average number of processes waiting for CPU over 1, 5, and 15 minutes — not the same as CPU percentage.' },
      { term: 'OOMKilled', definition: 'Process terminated by the Linux Out-Of-Memory killer when system memory is exhausted.' },
      { term: 'strace', definition: 'Tool that traces system calls made by a process — reveals what a stuck process is waiting on.' },
    ],
    sections: [
      {
        title: 'CPU at 100% — Investigation Playbook',
        content: `**Step 1:** Identify the process
\`\`\`bash
top -c                    # Sort by CPU, show command
# Note the PID with highest %CPU
\`\`\`

**Step 2:** Profile the hot path
\`\`\`bash
perf top -p <PID>         # Live function-level profiling
perf record -p <PID> -g -- sleep 30
perf report               # Flame graph data
\`\`\`

**Step 3:** Check what it's doing
\`\`\`bash
strace -c -p <PID>        # Syscall summary (30s sample)
strace -p <PID>           # Live syscall trace
cat /proc/<PID>/status    # Thread count
\`\`\`

**Common causes:** Infinite loop, regex catastrophic backtracking, GC thrashing, thread pool exhaustion, crypto operations on hot path.`,
      },
      {
        title: 'Memory Leaks and OOM',
        content: `**Symptoms:** Gradual memory growth, OOMKilled pods, swap thrashing.

**Investigation:**
\`\`\`bash
pmap -x <PID> | tail -1           # Total memory mapped
cat /proc/<PID>/status | grep -i vm  # VmRSS, VmSize
smem -p                           # Proportional memory per process
dmesg | tail -20 | grep -i kill   # OOM killer victims
\`\`\`

**For Python:** \`tracemalloc\`, \`objgraph\`, memory_profiler.
**For Java:** heap dump with \`jmap\`, analyze with VisualVM.
**For containers:** \`kubectl top pod\`, check limits vs actual usage.

**Fix patterns:** Connection pool leaks, unbounded caches, event listener accumulation, large object retention.`,
      },
      {
        title: 'Disk Full and I/O Issues',
        content: `**Disk full:**
\`\`\`bash
df -h                              # Which filesystem?
du -sh /* 2>/dev/null | sort -rh | head -10
du -sh /var/log/* | sort -rh | head
find / -size +100M 2>/dev/null     # Large files
lsof +L1                           # Deleted but open files (space not freed)
\`\`\`

**I/O wait high:**
\`\`\`bash
iostat -x 1                        # %util, await columns
iotop                              # Per-process I/O
\`\`\`

**Common causes:** Log rotation not configured, temp files accumulating, database WAL growth, core dumps.`,
      },
      {
        title: 'Network Issues and Container Debugging',
        content: `**Connection problems:**
\`\`\`bash
ss -tan | awk '{print $1}' | sort | uniq -c | sort -rn  # Connection states
ss -s                                 # Summary stats
netstat -an | grep TIME_WAIT | wc -l  # Too many TIME_WAIT?
tcpdump -i any host <target> port 5432  # DB connectivity
\`\`\`

**Kubernetes equivalents:**
\`\`\`bash
kubectl top pod <name>
kubectl describe pod <name>    # Events, OOMKilled, probe failures
kubectl logs <pod> --previous  # Logs from crashed container
kubectl exec -it <pod> -- bash # Shell into container
\`\`\`

**Systematic approach:** Symptom → metric → process → syscall/trace → root cause → fix → verify → post-mortem.`,
      },
    ],
    pitfalls: [
      'Restarting before collecting diagnostics — lose evidence',
      'Checking only CPU % without load average context',
      'Ignoring TIME_WAIT accumulation after traffic spikes',
      'Debugging in production without a rollback plan ready',
      'Not checking recent deployments — most incidents are deploy-related',
    ],
    summary: [
      'CPU: top → perf/strace → identify hot function or syscall',
      'Memory: pmap/proc status → OOM logs → find leak source',
      'Disk: df → du → find large files and deleted-but-open files',
      'Network: ss states → tcpdump → connection pool and DNS issues',
      'Always check recent deploys first — correlation beats speculation',
    ],
  }),

  'docker:optimization': buildTextbookLesson({
    chapter: 'Docker Image Optimization',
    overview:
      'A 1.8GB Docker image is slow to build, slow to deploy, and a security risk. This chapter teaches multi-stage builds, layer caching, minimal base images, and production Dockerfile patterns that reduce image size by 90%+ while improving security.',
    objectives: [
      'Write multi-stage Dockerfiles that separate build and runtime',
      'Optimize layer caching for faster CI builds',
      'Choose appropriate base images (alpine, distroless, slim)',
      'Apply security hardening: non-root user, health checks, .dockerignore',
    ],
    definitions: [
      { term: 'Multi-stage build', definition: 'A Dockerfile with multiple FROM stages — build artifacts in one stage, copy only runtime needs to the final stage.' },
      { term: 'Layer cache', definition: 'Docker reuses unchanged layers from previous builds — order Dockerfile instructions from least to most frequently changing.' },
      { term: 'Distroless image', definition: 'Minimal container image containing only your application and runtime dependencies — no shell, no package manager.' },
    ],
    sections: [
      {
        title: 'Multi-Stage Builds',
        content: `\`\`\`dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
\`\`\`

**Result:** Build tools, source code, and dev dependencies stay in the builder stage — never in the production image.

**Python example:**
\`\`\`dockerfile
FROM python:3.12-slim AS builder
RUN pip install --no-cache-dir -r requirements.txt
FROM python:3.12-slim
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY app/ /app/
\`\`\``,
      },
      {
        title: 'Layer Caching and Build Speed',
        content: `**Order matters** — least frequently changing layers first:

\`\`\`dockerfile
# Good: dependencies cached separately from code
COPY package.json package-lock.json ./
RUN npm ci                    # Cached until package.json changes
COPY . .                      # Only invalidates on code changes
RUN npm run build

# Bad: single COPY invalidates everything
COPY . .
RUN npm ci && npm run build
\`\`\`

**.dockerignore** — exclude from build context:
\`\`\`
node_modules
.git
*.md
.env
dist
coverage
\`\`\`

**BuildKit cache mounts** (Docker BuildKit):
\`\`\`dockerfile
RUN --mount=type=cache,target=/root/.npm npm ci
\`\`\``,
      },
      {
        title: 'Base Image Selection',
        content: `| Base image | Size | Shell | Package manager | Use case |
|-----------|------|-------|----------------|----------|
| ubuntu:22.04 | ~77MB | Yes | apt | Legacy, debugging needed |
| python:3.12-slim | ~130MB | Yes | apt | Python apps with debugging |
| node:20-alpine | ~50MB | Yes | apk | Node.js apps |
| gcr.io/distroless/nodejs20 | ~50MB | No | None | Production Node.js |
| scratch | 0MB | No | None | Static binaries only |

**Alpine caveat:** Uses musl libc instead of glibc — some Python packages with C extensions may fail. Test thoroughly.

**Distroless:** No shell means you can't \`docker exec\` for debugging — use sidecar debug containers in Kubernetes.`,
      },
      {
        title: 'Security and Production Hardening',
        content: `\`\`\`dockerfile
# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Single process (use exec form)
CMD ["node", "dist/server.js"]
\`\`\`

**Security checklist:**
- Run as non-root (USER directive)
- Pin base image versions (not \`:latest\`)
- Scan images in CI (Trivy, Snyk Container)
- No secrets in image layers — use runtime env/secrets
- Minimize installed packages — smaller attack surface
- Read-only filesystem where possible (\`--read-only\` flag)

**Analyze image size:** \`docker history <image>\` — find bloated layers.`,
      },
    ],
    pitfalls: [
      'Single-stage build with build tools in production image',
      'COPY . . before dependency install — destroys layer cache',
      'Using :latest tag — unpredictable builds and security',
      'Running as root in production — container escape risk',
      'Not using .dockerignore — slow builds and leaked secrets',
    ],
    summary: [
      'Multi-stage builds separate build tools from runtime artifacts',
      'Order Dockerfile layers: dependencies before source code',
      'Alpine for size, slim for compatibility, distroless for security',
      'Non-root user, health checks, and image scanning in CI',
      'docker history to identify and eliminate bloated layers',
    ],
  }),

  'kubernetes:operations': buildTextbookLesson({
    chapter: 'Kubernetes Production Operations',
    overview:
      'Running applications in Kubernetes requires more than deploying a Pod — you need health probes, resource limits, graceful shutdown, rolling updates, and operational playbooks. This chapter covers what separates a demo deployment from production-grade Kubernetes operations.',
    objectives: [
      'Configure liveness, readiness, and startup probes correctly',
      'Set resource requests and limits to prevent noisy neighbors',
      'Implement rolling updates with zero downtime',
      'Debug pod failures systematically with kubectl',
    ],
    definitions: [
      { term: 'Liveness probe', definition: 'Checks if the container is alive — failure triggers restart.' },
      { term: 'Readiness probe', definition: 'Checks if the container can accept traffic — failure removes from Service endpoints.' },
      { term: 'HPA', definition: 'Horizontal Pod Autoscaler — automatically scales replica count based on CPU, memory, or custom metrics.' },
    ],
    sections: [
      {
        title: 'Health Probes',
        content: `\`\`\`yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5

startupProbe:
  httpGet:
    path: /health
    port: 8080
  failureThreshold: 30
  periodSeconds: 10
\`\`\`

**Liveness:** "Is the process alive?" — restart if dead. Don't check dependencies (DB) — that causes restart loops.

**Readiness:** "Can it handle traffic?" — check DB connection, cache warmup. Remove from load balancer when not ready.

**Startup:** For slow-starting apps (JVM). Disables liveness/readiness until startup succeeds.`,
      },
      {
        title: 'Resource Management',
        content: `\`\`\`yaml
resources:
  requests:
    cpu: "250m"      # Guaranteed minimum
    memory: "256Mi"
  limits:
    cpu: "1000m"     # Maximum allowed
    memory: "512Mi"
\`\`\`

**Requests** — used for scheduling (which node has capacity).
**Limits** — maximum allowed; exceeding memory limit → OOMKilled.

**Best practices:**
- Always set requests and limits
- Memory limit ≈ 1.5-2x request for Java/Node.js
- CPU limit can throttle — some teams set CPU request but no limit
- Monitor actual usage: \`kubectl top pod\`

**QoS classes:** Guaranteed (requests = limits) > Burstable > BestEffort (no limits).`,
      },
      {
        title: 'Rolling Updates and Graceful Shutdown',
        content: `\`\`\`yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0    # Never reduce below desired count
    maxSurge: 1          # One extra pod during update

lifecycle:
  preStop:
    exec:
      command: ["/bin/sh", "-c", "sleep 5"]
terminationGracePeriodSeconds: 30
\`\`\`

**Graceful shutdown sequence:**
1. Pod marked for termination → removed from Service endpoints
2. preStop hook runs (drain connections)
3. SIGTERM sent to container
4. App finishes in-flight requests
5. SIGKILL after grace period

**Without preStop:** Load balancer may still route traffic to terminating pod.`,
      },
      {
        title: 'Scaling and Debugging',
        content: `**HPA (Horizontal Pod Autoscaler):**
\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
\`\`\`

**Debugging playbook:**
\`\`\`bash
kubectl describe pod <name>    # Events, probe failures, OOMKilled
kubectl logs <pod> --previous  # Crashed container logs
kubectl exec -it <pod> -- sh   # Shell into running pod
kubectl get events --sort-by=.lastTimestamp
\`\`\`

**20x traffic spike:** HPA scales pods → check node capacity (cluster autoscaler) → verify DB connection pool (PgBouncer) → CDN for static → rate limit at ingress.`,
      },
    ],
    pitfalls: [
      'Liveness probe checking database — restart loop when DB is down',
      'No resource limits — noisy neighbor OOMs other pods',
      'Missing preStop hook — dropped connections during deploys',
      'maxUnavailable: 50% — half capacity during every deploy',
      'Not checking kubectl describe events — fastest path to root cause',
    ],
    summary: [
      'Liveness restarts, readiness controls traffic, startup handles slow boot',
      'Set resource requests and limits on every container',
      'Rolling updates with maxUnavailable: 0 for zero-downtime deploys',
      'preStop hook + terminationGracePeriod for graceful shutdown',
      'kubectl describe + logs --previous for debugging pod failures',
    ],
  }),

  'cloud:aws-core': buildTextbookLesson({
    chapter: 'Core AWS Services',
    overview:
      'AWS is the dominant cloud platform. This chapter maps the essential services every backend engineer must know — compute, storage, databases, messaging, networking, and identity — and how they compose into production architectures.',
    objectives: [
      'Explain the purpose and use case of each core AWS service',
      'Design architectures combining EC2, S3, RDS, Lambda, and SQS',
      'Understand IAM roles, policies, and least-privilege access',
      'Navigate VPC networking fundamentals',
    ],
    definitions: [
      { term: 'EC2', definition: 'Elastic Compute Cloud — virtual servers in AWS with configurable CPU, memory, and networking.' },
      { term: 'S3', definition: 'Simple Storage Service — object storage with 99.999999999% durability, used for files, backups, and static hosting.' },
      { term: 'IAM', definition: 'Identity and Access Management — controls who can access which AWS resources and how.' },
    ],
    sections: [
      {
        title: 'Compute and Serverless',
        content: `**EC2 (Elastic Compute Cloud):**
- Virtual machines — full OS control
- Instance types: t3 (burstable), m5 (general), c5 (compute), r5 (memory)
- Auto Scaling Groups — scale based on demand
- Spot instances — up to 90% discount, can be interrupted

**Lambda:**
- Serverless functions — pay per invocation
- Triggers: API Gateway, SQS, S3 events, EventBridge
- Limits: 15 min timeout, 10GB memory, cold starts
- Best for: event processing, API backends, scheduled tasks

**ECS/EKS:** Container orchestration — Docker on AWS without managing EC2 directly.`,
      },
      {
        title: 'Storage and Databases',
        content: `**S3:**
- Object storage — files, images, backups, data lakes
- Storage classes: Standard, IA (infrequent), Glacier (archive)
- Versioning, lifecycle policies, cross-region replication

**RDS (Relational Database Service):**
- Managed PostgreSQL, MySQL, Aurora
- Automated backups, Multi-AZ failover, read replicas
- You manage schema; AWS manages patching and hardware

**ElastiCache:**
- Managed Redis or Memcached
- Session store, caching layer, rate limiting, pub/sub

**DynamoDB:**
- Managed NoSQL — key-value and document
- Single-digit millisecond latency at any scale
- On-demand or provisioned capacity`,
      },
      {
        title: 'Messaging and API Management',
        content: `**SQS (Simple Queue Service):**
- Managed message queue — decouple producers and consumers
- Standard (at-least-once) or FIFO (exactly-once, ordered)
- Dead Letter Queue for failed messages
- Visibility timeout, long polling

**SNS (Simple Notification Service):**
- Pub/sub — one message to many subscribers
- Fan-out pattern: SNS → multiple SQS queues

**API Gateway:**
- Managed API front door — REST and WebSocket APIs
- Rate limiting, authentication, request validation
- Integrates with Lambda, EC2, HTTP backends

**EventBridge:**
- Event bus for event-driven architectures
- Route events between AWS services and SaaS applications`,
      },
      {
        title: 'Networking, Monitoring, and IAM',
        content: `**VPC (Virtual Private Cloud):**
- Isolated network — subnets (public/private), route tables, NAT gateway
- Security groups (stateful firewall) vs NACLs (stateless)

**CloudWatch:**
- Metrics, logs, alarms, dashboards
- Log Insights for querying structured logs
- Anomaly detection and composite alarms

**IAM best practices:**
- Roles over access keys (especially for EC2/Lambda)
- Least privilege — minimum permissions needed
- MFA for human users
- OIDC for CI/CD (no long-lived keys)

\`\`\`json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::my-bucket/uploads/*"
}
\`\`\``,
      },
    ],
    pitfalls: [
      'Long-lived IAM access keys in code — use roles and OIDC',
      'Public S3 buckets — enable Block Public Access at account level',
      'RDS without Multi-AZ in production — single point of failure',
      'Lambda without dead letter queue — lost failed events',
      'Default VPC security groups allowing all traffic',
    ],
    summary: [
      'EC2 for full control, Lambda for event-driven serverless',
      'S3 for objects, RDS for relational, ElastiCache for caching',
      'SQS/SNS for async messaging, API Gateway for API management',
      'VPC for network isolation, CloudWatch for observability',
      'IAM roles with least privilege — never hardcode access keys',
    ],
  }),

  'cloud:patterns': buildTextbookLesson({
    chapter: 'Cloud Architecture Patterns',
    overview:
      'Knowing AWS services is not enough — you need patterns that combine them into resilient, scalable, cost-effective architectures. This chapter covers multi-AZ deployment, auto-scaling, CDN, secrets management, and Infrastructure as Code.',
    objectives: [
      'Design highly available multi-AZ architectures',
      'Implement auto-scaling for elastic capacity',
      'Apply CDN, caching, and secrets management patterns',
      'Use Infrastructure as Code for reproducible environments',
    ],
    definitions: [
      { term: 'Multi-AZ', definition: 'Deploying resources across multiple Availability Zones for fault tolerance against datacenter failures.' },
      { term: 'Auto Scaling Group', definition: 'Automatically adjusts the number of EC2 instances based on demand metrics or schedules.' },
      { term: 'IaC', definition: 'Infrastructure as Code — defining cloud resources in version-controlled files (Terraform, CDK, CloudFormation).' },
    ],
    sections: [
      {
        title: 'High Availability Patterns',
        content: `**Multi-AZ architecture:**
\`\`\`
Region (us-east-1)
├── AZ-a: ALB + EC2 + RDS primary
├── AZ-b: ALB + EC2 + RDS standby
└── AZ-c: ALB + EC2
\`\`\`

- ALB distributes across AZs automatically
- RDS Multi-AZ: synchronous replication, automatic failover
- S3: automatically replicated across 3+ AZs

**Active-passive vs active-active:**
- Active-passive: standby ready but not serving traffic (cheaper)
- Active-active: all instances serve traffic (higher availability, more complex)

**RTO/RPO:** Recovery Time Objective (how fast) and Recovery Point Objective (how much data loss). Multi-AZ improves both.`,
      },
      {
        title: 'Auto Scaling and Elasticity',
        content: `**Auto Scaling Group (ASG):**
\`\`\`
Min: 2 instances (always available)
Desired: 4 instances (current target)
Max: 20 instances (ceiling)

Scale out: CPU > 70% for 5 minutes → add instances
Scale in: CPU < 30% for 10 minutes → remove instances
\`\`\`

**Scaling policies:**
- Target tracking — maintain metric at target (e.g., 70% CPU)
- Step scaling — add N instances per threshold breach
- Scheduled — predict known traffic patterns (Black Friday)

**Cluster Autoscaler (Kubernetes):** Adds nodes when pods can't be scheduled. Works with ASG.

**Cost optimization:** Right-size instances, use Spot for fault-tolerant workloads, schedule dev environments.`,
      },
      {
        title: 'CDN, Caching, and Edge',
        content: `**CloudFront CDN:**
- Cache static assets at 400+ edge locations
- Origin: S3, ALB, or custom HTTP server
- Cache behaviors by path pattern
- Lambda@Edge for request/response manipulation

**Caching layers:**
\`\`\`
Browser cache → CloudFront → ElastiCache (Redis) → RDS
\`\`\`

**Cache invalidation:** Purge by path when content updates. Use versioned asset URLs (\`app.v2.js\`) to avoid invalidation.

**Secrets Manager / Parameter Store:**
- Rotate database credentials automatically
- Reference in ECS task definitions, Lambda env vars
- Never store secrets in code, AMIs, or environment files in git`,
      },
      {
        title: 'Infrastructure as Code',
        content: `**Terraform example:**
\`\`\`hcl
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  tags = { Name = "app-server" }
}

resource "aws_autoscaling_group" "app" {
  min_size         = 2
  max_size         = 10
  desired_capacity = 4
  launch_template { id = aws_launch_template.app.id }
}
\`\`\`

**Benefits of IaC:**
- Version controlled — review infrastructure changes in PRs
- Reproducible — identical staging and production
- Documented — code IS the documentation
- Drift detection — compare actual vs desired state

**CDK (Cloud Development Kit):** Define infrastructure in TypeScript/Python — generates CloudFormation.`,
      },
    ],
    pitfalls: [
      'Single AZ deployment — datacenter failure takes down everything',
      'Auto-scaling without load testing — scales too late or too aggressively',
      'Secrets in environment variables committed to git',
      'Manual infrastructure changes — drift from documented state',
      'Over-provisioning "just in case" — 3x cost for unused capacity',
    ],
    summary: [
      'Multi-AZ for fault tolerance; active-active for highest availability',
      'ASG + target tracking for elastic capacity based on demand',
      'CloudFront CDN + ElastiCache for layered caching',
      'Secrets Manager for credential rotation — never in code',
      'Terraform/CDK for reproducible, version-controlled infrastructure',
    ],
  }),

  'security:auth': buildTextbookLesson({
    chapter: 'Authentication and Authorization',
    overview:
      'Authentication (who are you?) and authorization (what can you do?) are the foundation of application security. This chapter covers sessions, JWTs, OAuth2, RBAC, and the trade-offs senior engineers must articulate in interviews.',
    objectives: [
      'Compare session-based and token-based authentication',
      'Implement JWT access and refresh token patterns securely',
      'Design RBAC and ABAC authorization models',
      'Explain OAuth2 flows for web, mobile, and service-to-service',
    ],
    definitions: [
      { term: 'Authentication (AuthN)', definition: 'Verifying identity — proving who the user is via credentials, tokens, or certificates.' },
      { term: 'Authorization (AuthZ)', definition: 'Determining what an authenticated user is permitted to do — roles, permissions, policies.' },
      { term: 'RBAC', definition: 'Role-Based Access Control — permissions assigned to roles, roles assigned to users.' },
    ],
    sections: [
      {
        title: 'Session vs Token Authentication',
        content: `**Session-based:**
- Server stores session in memory/Redis
- Client holds session ID in httpOnly cookie
- Easy revocation (delete session)
- Requires shared session store for horizontal scaling
- Best for: traditional web apps, server-rendered pages

**JWT (JSON Web Token):**
- Stateless — server verifies signature, no session store
- Self-contained — carries user claims (id, roles)
- Hard to revoke before expiry
- Larger payload than session ID
- Best for: microservices, SPAs, mobile apps

**Interview comparison:**
| | Sessions | JWT |
|---|---------|-----|
| Revocation | Easy | Hard (need blocklist) |
| Scalability | Needs shared store | Stateless |
| Size | Small cookie | Larger token |
| XSS risk | httpOnly cookie safe | localStorage vulnerable |`,
      },
      {
        title: 'JWT and Refresh Token Pattern',
        content: `**JWT structure:** Header.Payload.Signature (base64url-encoded)

\`\`\`
Header:  { "alg": "RS256", "typ": "JWT" }
Payload: { "sub": "user123", "role": "admin", "exp": 1700000000 }
Signature: HMAC or RSA signature of header + payload
\`\`\`

**Production pattern:**
- **Access token:** Short-lived (15 min), in memory or Authorization header
- **Refresh token:** Long-lived (7 days), httpOnly Secure SameSite cookie
- **Rotation:** Issue new refresh token on each use; detect reuse (token theft)

**Never store JWT in localStorage** — XSS can steal it. Use httpOnly cookies or in-memory storage.

**Revocation:** Maintain JTI (JWT ID) blocklist in Redis for compromised tokens.`,
      },
      {
        title: 'OAuth2 Flows',
        content: `**Authorization Code + PKCE** (web and mobile):
1. Client redirects to authorization server
2. User authenticates and grants permission
3. Authorization server redirects back with code
4. Client exchanges code for tokens (server-side)
5. PKCE prevents code interception attacks

**Client Credentials** (service-to-service):
- Machine-to-machine, no user involved
- Client ID + secret → access token

**When to use what:**
- Web app with backend → Authorization Code
- SPA/mobile → Authorization Code + PKCE
- Microservice calling microservice → Client Credentials
- Never → Implicit flow (deprecated, insecure)`,
      },
      {
        title: 'Authorization Models',
        content: `**RBAC (Role-Based):**
\`\`\`
Roles: admin, editor, viewer
admin → [create, read, update, delete]
editor → [create, read, update]
viewer → [read]

user.roles = ["editor"]
authorize(user, "delete", resource) → denied
\`\`\`

**ABAC (Attribute-Based):**
Policies based on attributes: user department, resource owner, time of day, IP address.
\`allow if user.department == resource.department AND time.hour < 18\`

**Resource-level authorization (critical):**
\`\`\`python
# IDOR prevention — always check ownership
order = db.get_order(order_id)
if order.user_id != current_user.id:
    raise Forbidden()
\`\`\`

**Principle of least privilege:** Grant minimum permissions needed. Default deny.`,
      },
    ],
    pitfalls: [
      'JWT in localStorage — stolen via XSS',
      'No refresh token rotation — stolen refresh token valid for days',
      'Authentication without authorization — logged in but can access any resource',
      'Long-lived access tokens — large window for token theft',
      'Trusting JWT claims without signature verification',
    ],
    summary: [
      'Sessions for easy revocation; JWT for stateless microservices',
      'Short access tokens + httpOnly refresh cookies with rotation',
      'OAuth2 Authorization Code + PKCE for web and mobile',
      'RBAC for simple models; ABAC for fine-grained policies',
      'Always authorize at resource level — prevent IDOR',
    ],
  }),

  'security:owasp': buildTextbookLesson({
    chapter: 'OWASP Top Vulnerabilities',
    overview:
      'The OWASP Top 10 represents the most critical web application security risks. This chapter covers each vulnerability class with prevention techniques, code examples, and the defense-in-depth mindset expected in senior security interviews.',
    objectives: [
      'Identify and prevent SQL injection, XSS, CSRF, and IDOR',
      'Understand SSRF, security misconfiguration, and dependency risks',
      'Apply defense-in-depth across application layers',
      'Design secure APIs with input validation and rate limiting',
    ],
    definitions: [
      { term: 'SQL Injection', definition: 'Attacker injects malicious SQL through user input to manipulate database queries.' },
      { term: 'XSS (Cross-Site Scripting)', definition: 'Attacker injects malicious JavaScript that executes in other users\' browsers.' },
      { term: 'IDOR', definition: 'Insecure Direct Object Reference — accessing resources by manipulating IDs without authorization.' },
    ],
    sections: [
      {
        title: 'Injection and XSS',
        content: `**SQL Injection prevention:**
\`\`\`python
# VULNERABLE
query = f"SELECT * FROM users WHERE id = {user_input}"

# SAFE — parameterized queries
cursor.execute("SELECT * FROM users WHERE id = %s", (user_input,))
\`\`\`

**XSS prevention:**
- Escape output: React auto-escapes JSX; use DOMPurify for HTML
- Content Security Policy (CSP) header blocks inline scripts
- httpOnly cookies prevent JavaScript access
- Never use dangerouslySetInnerHTML without sanitization

**CSP header:**
\`\`\`
Content-Security-Policy: default-src 'self'; script-src 'self'
\`\`\``,
      },
      {
        title: 'CSRF, IDOR, and SSRF',
        content: `**CSRF (Cross-Site Request Forgery):**
Attacker tricks user's browser into making authenticated requests.
- Prevention: SameSite=Strict cookies, CSRF tokens, verify Origin/Referer headers

**IDOR:**
\`\`\`
GET /api/orders/12345  → user's order (authorized)
GET /api/orders/12346  → another user's order (IDOR!)
\`\`\`
Fix: Check \`resource.owner_id == current_user.id\` on every endpoint. Use UUIDs instead of sequential IDs.

**SSRF (Server-Side Request Forgery):**
Attacker makes server fetch internal URLs (\`http://169.254.169.254/\` — AWS metadata).
- Validate and allowlist URLs
- Block internal IP ranges
- Don't follow redirects blindly`,
      },
      {
        title: 'Security Misconfiguration and Dependencies',
        content: `**Common misconfigurations:**
- Default credentials (admin/admin)
- Debug mode in production
- Directory listing enabled
- Unnecessary features/ports open
- Error messages exposing stack traces
- CORS set to \`*\` with credentials

**Dependency vulnerabilities:**
- Automated scanning: Dependabot, Snyk, npm audit
- Pin dependency versions
- Regular updates with CI gates
- SBOM (Software Bill of Materials) for supply chain

**Security headers checklist:**
\`\`\`
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
\`\`\``,
      },
      {
        title: 'API Security Defense in Depth',
        content: `**Layered security:**
1. **Edge:** WAF (Web Application Firewall), DDoS protection, rate limiting
2. **Transport:** HTTPS everywhere, HSTS, certificate pinning
3. **Authentication:** JWT/OAuth2 on all endpoints
4. **Authorization:** Per-resource checks, RBAC middleware
5. **Input validation:** Schema validation (Pydantic, Zod), size limits
6. **Output encoding:** Escape responses, sanitize HTML
7. **Logging:** Audit sensitive operations, no secrets in logs
8. **Secrets:** Vault/Secrets Manager, never in code

**Rate limiting:**
\`\`\`
Per IP: 100 req/min (anonymous)
Per user: 1000 req/min (authenticated)
Per endpoint: 10 req/min (password reset)
\`\`\`

**Interview answer:** "Defense in depth — no single control prevents all attacks. I validate input, parameterize queries, enforce authorization, set security headers, rate limit, and scan dependencies in CI."`,
      },
    ],
    pitfalls: [
      'String concatenation in SQL queries — always parameterize',
      'Trusting client-side validation alone — always validate server-side',
      'Checking authentication but not authorization on every endpoint',
      'CORS wildcard with credentials enabled',
      'Ignoring dependency vulnerabilities — supply chain attacks are rising',
    ],
    summary: [
      'SQL injection: parameterized queries; XSS: escape output + CSP',
      'CSRF: SameSite cookies + tokens; IDOR: authorize every resource access',
      'SSRF: validate URLs, block internal IPs',
      'Security headers, dependency scanning, and WAF for defense in depth',
      'Rate limiting on all endpoints — especially auth and sensitive operations',
    ],
  }),

  'testing:pyramid': buildTextbookLesson({
    chapter: 'The Testing Pyramid',
    overview:
      'The testing pyramid guides how to distribute tests across levels — many fast unit tests at the base, fewer integration tests in the middle, and minimal slow E2E tests at the top. This chapter explains each level, when to use it, and why coverage percentage alone is misleading.',
    objectives: [
      'Explain the testing pyramid and invert it correctly for your stack',
      'Choose the right test level for each scenario',
      'Understand contract testing for microservices',
      'Recognize why high coverage does not guarantee quality',
    ],
    definitions: [
      { term: 'Unit test', definition: 'Tests a single function or class in isolation — fast, no external dependencies.' },
      { term: 'Integration test', definition: 'Tests interaction between components — may use real database, API, or message queue.' },
      { term: 'E2E test', definition: 'End-to-end test simulating real user flows through the full application stack.' },
    ],
    sections: [
      {
        title: 'Pyramid Structure',
        content: `**\`\`\`
        /  E2E  \\        Few, slow, brittle, high confidence
       / Integr. \\      Some, medium speed, test interactions
      /   Unit    \\     Many, fast, isolated, cheap to maintain
\`\`\`**

**Unit tests (70%):**
- Test functions, classes, business logic
- Mock external dependencies
- Run in milliseconds
- Pinpoint exact failure location

**Integration tests (20%):**
- Test component interactions
- Real database (testcontainers), Redis, message queues
- API endpoint tests with test client
- Catch wiring and configuration bugs

**E2E tests (10%):**
- Full user flows through browser (Playwright, Cypress)
- Slow (seconds to minutes), flaky if not maintained
- Critical paths only: signup, checkout, payment`,
      },
      {
        title: 'What to Test at Each Level',
        content: `**Unit test candidates:**
- Business logic and calculations
- Input validation and edge cases
- State machines and algorithms
- Error handling paths

**Integration test candidates:**
- Database queries and transactions
- API endpoints (request → response)
- Message queue publish/consume
- Cache behavior (Redis hit/miss)
- Authentication middleware chain

**E2E test candidates:**
- User registration and login flow
- Complete purchase/checkout
- Critical admin operations
- Cross-service workflows

**Don't unit test:** Framework code, trivial getters/setters, third-party libraries.`,
      },
      {
        title: 'Contract Testing',
        content: `In microservices, **contract tests** verify API compatibility between producer and consumer without running both services.

**Consumer-driven contracts (Pact):**
1. Consumer defines expected request/response
2. Provider verifies it meets the contract
3. CI fails if either side breaks the contract

\`\`\`python
# Consumer test defines contract
@pytest.mark.pact
def test_get_user(pact):
    pact.given("user 123 exists").upon_receiving(
        "a request for user 123"
    ).with_request("GET", "/users/123").will_respond_with(200, body={
        "id": 123, "name": "Alice"
    })
\`\`\`

**Benefits:** Catch breaking API changes before deployment. Independent service development.`,
      },
      {
        title: 'Coverage vs Correctness',
        content: `**95% coverage but frequent production bugs** tells you:
- Tests verify implementation, not behavior
- Missing integration and E2E tests
- Error paths and edge cases not tested
- Concurrency/race conditions untested
- Tests don't match real usage patterns

**Better metrics than coverage:**
- Critical path test coverage (are checkout, auth, payment tested?)
- Mutation testing score (do tests catch intentional bugs?)
- Production incident regression tests
- Test execution time in CI (< 10 min for PR checks)

**Interview answer:** "I aim for high coverage on business logic with unit tests, integration tests for DB and API boundaries, and E2E for critical user flows. Coverage is a guide, not a goal."`,
      },
    ],
    pitfalls: [
      'Testing pyramid inverted — many E2E, few unit tests (ice cream cone anti-pattern)',
      'Mocking your own code instead of external dependencies',
      'No integration tests — unit tests pass but production wiring fails',
      'Chasing 100% coverage on trivial code',
      'Flaky E2E tests ignored instead of fixed or quarantined',
    ],
    summary: [
      'Many unit tests (fast), some integration (real deps), few E2E (critical paths)',
      'Unit for logic, integration for wiring, E2E for user flows',
      'Contract tests verify API compatibility between microservices',
      'Coverage measures executed code, not correctness',
      'Focus on critical path tests and fast CI feedback loops',
    ],
  }),

  'testing:patterns': buildTextbookLesson({
    chapter: 'Testing Patterns and Best Practices',
    overview:
      'Good tests are readable, maintainable, and trustworthy. This chapter covers Arrange-Act-Assert, mocking strategies, test fixtures, property-based testing, and patterns that make test suites a joy rather than a burden.',
    objectives: [
      'Write tests following Arrange-Act-Assert structure',
      'Mock external dependencies correctly without over-mocking',
      'Use testcontainers and fixtures for integration tests',
      'Apply property-based testing for invariant verification',
    ],
    definitions: [
      { term: 'Arrange-Act-Assert', definition: 'Test structure: set up preconditions (Arrange), execute the behavior (Act), verify the outcome (Assert).' },
      { term: 'Test fixture', definition: 'Reusable setup and teardown code that provides consistent test data and environment.' },
      { term: 'Property-based testing', definition: 'Generating random inputs to verify properties that should hold for all valid inputs.' },
    ],
    sections: [
      {
        title: 'Arrange-Act-Assert (AAA)',
        content: `\`\`\`python
def test_calculate_discount_premium_user():
    # Arrange
    user = User(tier="premium", purchase_amount=100.00)
    
    # Act
    discount = calculate_discount(user)
    
    # Assert
    assert discount == 15.00  # 15% premium discount
\`\`\`

**One assertion concept per test** — if a test fails, you know exactly what broke.

**Test naming:** \`test_<what>_<condition>_<expected>\`
- \`test_login_valid_credentials_returns_token\`
- \`test_login_expired_password_raises_error\`

**Avoid:** Multiple unrelated assertions, logic in tests, test interdependence.`,
      },
      {
        title: 'Mocking Strategies',
        content: `**Mock external dependencies, not your own code:**
\`\`\`python
# Good: mock the HTTP client, test your service logic
@patch("app.services.payment_client.charge")
def test_process_payment(mock_charge):
    mock_charge.return_value = {"status": "success"}
    result = process_payment(order)
    assert result.paid == True

# Bad: mock internal helper — tests nothing real
@patch("app.services.validate_order")
def test_process_payment(mock_validate):
    ...
\`\`\`

**Stub vs Mock vs Fake:**
- **Stub:** Returns predefined data (no verification)
- **Mock:** Verifies interactions (was method called with correct args?)
- **Fake:** Working implementation with shortcuts (in-memory DB)

**Prefer stubs and fakes.** Mock only when interaction pattern matters.`,
      },
      {
        title: 'Fixtures and Testcontainers',
        content: `**pytest fixtures:**
\`\`\`python
@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = Session(engine)
    yield session
    session.close()

def test_create_user(db_session):
    user = create_user(db_session, name="Alice")
    assert user.id is not None
\`\`\`

**Testcontainers** — real services in Docker for integration tests:
\`\`\`python
@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:15") as pg:
        yield pg.get_connection_url()
\`\`\`

**Parametrize** for edge cases:
\`\`\`python
@pytest.mark.parametrize("input,expected", [
    ("", 0), ("abc", 0), ("123", 123), ("-5", 0),
])
def test_parse_positive_int(input, expected):
    assert parse_positive_int(input) == expected
\`\`\``,
      },
      {
        title: 'Property-Based and Snapshot Testing',
        content: `**Property-based testing (Hypothesis):**
\`\`\`python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sort_is_idempotent(lst):
    assert sorted(sorted(lst)) == sorted(lst)

@given(st.text())
def test_encode_decode_roundtrip(text):
    assert decode(encode(text)) == text
\`\`\`

Generates hundreds of random inputs — finds edge cases you'd never think of.

**Snapshot testing:** Capture output, compare on future runs. Good for API responses, HTML rendering. Bad if snapshots updated without review.

**Test isolation:** Each test runs independently. No shared mutable state. Database rolled back or recreated per test.`,
      },
    ],
    pitfalls: [
      'Over-mocking — tests pass but production code is broken',
      'Shared mutable fixtures causing test interdependence',
      'Testing implementation details — breaks on refactor',
      'No cleanup in fixtures — test pollution',
      'Snapshot tests updated blindly without reviewing changes',
    ],
    summary: [
      'Arrange-Act-Assert with descriptive test names',
      'Mock external dependencies; use fakes for databases',
      'Fixtures for reusable setup; testcontainers for real integration tests',
      'Parametrize edge cases; property-based testing for invariants',
      'Test behavior, not implementation — tests should survive refactors',
    ],
  }),

  'performance:metrics': buildTextbookLesson({
    chapter: 'Performance Metrics and Latency Analysis',
    overview:
      'You cannot optimize what you do not measure. This chapter covers the metrics that matter in production — percentiles, throughput, error rates, and tail latency — and why averages lie.',
    objectives: [
      'Report latency using percentiles (p50, p95, p99) not averages',
      'Define SLIs, SLOs, and error budgets',
      'Identify causes of tail latency',
      'Choose appropriate metrics for different system components',
    ],
    definitions: [
      { term: 'p99 latency', definition: '99th percentile — 99% of requests complete within this time; 1% are slower.' },
      { term: 'SLI', definition: 'Service Level Indicator — a measurable metric like "request latency" or "error rate".' },
      { term: 'SLO', definition: 'Service Level Objective — target for an SLI, e.g., "p99 latency < 500ms".' },
    ],
    sections: [
      {
        title: 'Why Averages Lie',
        content: `**Scenario:** 100 requests — 99 take 100ms, 1 takes 5000ms.
- Average: 149ms (looks fine!)
- p50: 100ms
- p99: 5000ms (1% of users wait 5 seconds!)

**Always report percentiles:**
\`\`\`
Latency distribution:
  p50:  100ms  (median user experience)
  p90:  150ms
  p95:  200ms  (SLO target)
  p99:  500ms  (tail latency)
  p99.9: 2000ms (worst cases)
\`\`\`

**SLOs should target percentiles:** "99% of requests complete in < 500ms" not "average < 200ms".

**Histogram buckets** in Prometheus capture full distribution, not just averages.`,
      },
      {
        title: 'RED and USE Metrics',
        content: `**RED method (for services):**
- **Rate** — requests per second
- **Errors** — failed requests per second (or error ratio)
- **Duration** — latency distribution (histogram)

\`\`\`promql
# Error rate
rate(http_requests_total{status=~"5.."}[5m])
/ rate(http_requests_total[5m])

# p99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
\`\`\`

**USE method (for resources):**
- **Utilization** — % time resource is busy (CPU 80%)
- **Saturation** — queue depth, wait time (threads waiting)
- **Errors** — error count (disk errors, network drops)

Apply RED to services, USE to infrastructure (CPU, memory, disk, network).`,
      },
      {
        title: 'Tail Latency Causes',
        content: `**p99 >> p50 indicates tail latency problems:**

| Cause | Symptom | Detection |
|-------|---------|-----------|
| GC pauses | Periodic latency spikes | GC logs, JVM metrics |
| Lock contention | Occasional long waits | Thread dumps, perf |
| Slow dependency | 10% of requests slow | Per-downstream metrics |
| Connection pool exhaustion | Wait for connection | Pool utilization metric |
| Cold cache miss | First request slow | Cache hit rate |
| Large payload outliers | Max latency >> p99 | Request size histogram |
| Retry storms | Cascading delays | Retry count metrics |

**Coordinated omission:** If your benchmark drops slow requests, reported latency is artificially low. Use HDR Histogram or proper load testing tools.`,
      },
      {
        title: 'Throughput and Capacity Planning',
        content: `**Throughput:** Requests per second (RPS) the system handles at target latency.

**Capacity formula:**
\`\`\`
Required instances = (RPS × avg_response_time) / target_utilization
Example: (1000 RPS × 0.1s) / 0.7 = 143 instances at 70% utilization
\`\`\`

**Key metrics dashboard:**
1. Request rate (RPS) — traffic volume
2. Error rate (%) — reliability
3. Latency percentiles — user experience
4. Saturation (CPU, memory, connections) — headroom
5. Queue depth — backpressure indicator

**Load testing:** Establish baseline before launch. Test at 2x expected peak. Measure p99, not average.`,
      },
    ],
    pitfalls: [
      'Reporting average latency in production — hides tail problems',
      'Alerting on average instead of p99 or error rate',
      'Ignoring coordinated omission in benchmarks',
      'No baseline metrics before optimization — can\'t prove improvement',
      'Measuring server-side only — missing client-side Web Vitals',
    ],
    summary: [
      'Always report percentiles — p50, p95, p99 — never averages alone',
      'RED for services (Rate, Errors, Duration); USE for resources',
      'Tail latency from GC, locks, slow deps, pool exhaustion',
      'SLOs on percentiles with error budgets for release decisions',
      'Load test at 2x peak measuring p99 before launch',
    ],
  }),

  'performance:methodology': buildTextbookLesson({
    chapter: 'Performance Optimization Methodology',
    overview:
      'Premature optimization is the root of all evil, but ignoring performance until production fails is worse. This chapter teaches a systematic methodology: measure, profile, fix the biggest bottleneck, measure again.',
    objectives: [
      'Follow the measure-profile-fix-verify optimization loop',
      'Identify common bottlenecks in web applications',
      'Avoid premature optimization while maintaining performance awareness',
      'Use profiling tools appropriate for your language and stack',
    ],
    definitions: [
      { term: 'Profiling', definition: 'Measuring where a program spends time or memory during execution — identifies hotspots.' },
      { term: 'Bottleneck', definition: 'The single component limiting overall system throughput or latency.' },
      { term: 'Premature optimization', definition: 'Optimizing code before identifying it as a actual bottleneck through measurement.' },
    ],
    sections: [
      {
        title: 'The Optimization Loop',
        content: `**Never guess. Always measure.**

\`\`\`
1. MEASURE  — establish baseline metrics
2. PROFILE  — find the actual bottleneck
3. FIX      — address the biggest bottleneck only
4. MEASURE  — verify improvement
5. REPEAT   — until SLO is met or diminishing returns
\`\`\`

**Example:** "API is slow"
- Measure: p50=100ms, p99=4000ms
- Profile: p99 requests spend 3.8s in PostgreSQL query
- Fix: Add index on frequently filtered column
- Measure: p50=50ms, p99=200ms
- Done — don't optimize serialization next

**Amdahl's Law:** Speedup is limited by the non-optimized portion. Fixing a component that's 10% of latency by 50% improves total by only 5%.`,
      },
      {
        title: 'Common Bottlenecks',
        content: `**Ranked by frequency in web applications:**

1. **Database queries** — missing indexes, N+1 queries, full table scans
2. **Network I/O** — chatty APIs, no connection pooling, no caching
3. **Serialization** — large JSON payloads, inefficient formats
4. **Lock contention** — synchronized blocks, database row locks
5. **Memory allocation** — excessive object creation, GC pressure
6. **CPU computation** — regex, sorting large datasets on hot path
7. **External dependencies** — third-party API latency

**Quick wins:**
- Add database index (minutes, 10-100x improvement)
- Add Redis cache for hot data (hours, 5-50x improvement)
- Connection pooling (minutes, prevents exhaustion)
- Pagination instead of loading all records (hours)`,
      },
      {
        title: 'Profiling Tools',
        content: `**Python:**
\`\`\`bash
py-spy record -o profile.svg -- python app.py  # Flame graph
python -m cProfile -s cumtime app.py            # Function timing
\`\`\`

**Node.js:**
\`\`\`bash
node --prof app.js && node --prof-process isolate-*.log
# Or Chrome DevTools → Performance tab
\`\`\`

**Go:**
\`\`\`bash
go test -cpuprofile=cpu.prof -bench .
go tool pprof cpu.prof
\`\`\`

**Database:**
\`\`\`sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;
-- PostgreSQL: pg_stat_statements for top queries
\`\`\`

**Flame graphs:** Width = time spent. Tallest widest stack = optimization target.`,
      },
      {
        title: 'When NOT to Optimize',
        content: `**Don't optimize when:**
- No SLO is being violated
- Profiling shows the component is < 5% of total latency
- Code is not yet correct — fix bugs first
- You're optimizing for hypothetical future scale
- The team can't maintain the optimization

**Optimize when:**
- SLO breach in production (p99 > target)
- Load test shows failure at expected peak
- Cost is excessive (over-provisioned due to inefficiency)
- User complaints correlate with measurable slowness

**Interview framework:** "I'd first check our dashboards for which percentile is affected. Then profile the p99 path specifically. Fix the largest contributor, verify with load test, and document the before/after metrics."`,
      },
    ],
    pitfalls: [
      'Optimizing without measuring — fixing the wrong thing',
      'Caching before fixing the underlying slow query',
      'Micro-optimizing Python loops when DB is the bottleneck',
      'Load testing with unrealistic data (empty DB, no concurrency)',
      'Optimizing development environment — production has different characteristics',
    ],
    summary: [
      'Measure → Profile → Fix biggest bottleneck → Measure again',
      'Database queries and network I/O are the most common bottlenecks',
      'Flame graphs and EXPLAIN ANALYZE pinpoint hotspots',
      'Amdahl\'s Law — optimize the largest contributor first',
      'Don\'t optimize without evidence of an SLO breach',
    ],
  }),

  'observability:pillars': buildTextbookLesson({
    chapter: 'The Three Pillars of Observability',
    overview:
      'Observability is the ability to understand internal system state from external outputs. The three pillars — metrics, logs, and traces — each answer different questions. Together they enable rapid incident response and proactive reliability engineering.',
    objectives: [
      'Distinguish metrics, logs, and traces and when to use each',
      'Explain how the three pillars complement each other',
      'Design an observability strategy for microservices',
      'Connect observability to SLIs, SLOs, and alerting',
    ],
    definitions: [
      { term: 'Metrics', definition: 'Aggregated numerical measurements over time — counters, gauges, histograms.' },
      { term: 'Logs', definition: 'Discrete timestamped events with contextual details about what happened.' },
      { term: 'Traces', definition: 'End-to-end record of a request\'s path through distributed services with timing.' },
    ],
    sections: [
      {
        title: 'Metrics — What Is Happening at Scale',
        content: `**Metrics answer:** "Is something wrong? How wrong? Since when?"

**Types:**
- **Counter** — monotonically increasing (total requests, errors)
- **Gauge** — point-in-time value (CPU %, queue depth, active connections)
- **Histogram** — distribution of values (request latency buckets)

**Characteristics:**
- Cheap to store and query (aggregated)
- Efficient for alerting and dashboards
- Lose individual event detail
- Excellent for trends and capacity planning

**Example alerts:**
- Error rate > 5% for 5 minutes
- p99 latency > 2s for 10 minutes
- Queue depth > 10,000 messages`,
      },
      {
        title: 'Logs — What Happened to This Request',
        content: `**Logs answer:** "What exactly happened? What was the context?"

**Structured logging (JSON):**
\`\`\`json
{
  "timestamp": "2026-01-15T10:30:00Z",
  "level": "ERROR",
  "message": "Payment failed",
  "request_id": "abc-123",
  "user_id": "user-456",
  "order_id": "order-789",
  "error": "card_declined",
  "duration_ms": 1250
}
\`\`\`

**Characteristics:**
- Rich context per event
- Expensive at scale (storage, indexing)
- Essential for debugging specific failures
- Searchable by fields (user_id, request_id)

**Log levels:** ERROR (action needed) > WARN (investigate) > INFO (business events) > DEBUG (development only).`,
      },
      {
        title: 'Traces — Where Did Time Go',
        content: `**Traces answer:** "Which service caused the slowdown? What's the dependency chain?"

**Distributed tracing:**
\`\`\`
[API Gateway: 450ms]
  ├── [Auth Service: 50ms]
  ├── [Order Service: 350ms]
  │     ├── [PostgreSQL: 280ms]  ← bottleneck!
  │     └── [Inventory Service: 40ms]
  └── [Notification Service: 30ms]
\`\`\`

**Span:** Single operation within a trace (one service call).
**Trace:** Complete request journey across all services.

**OpenTelemetry:** Vendor-neutral standard for generating and exporting traces, metrics, and logs.

**Characteristics:**
- Shows cross-service latency breakdown
- Identifies slow dependencies
- Sampling required at high volume (trace 1-10% of requests)`,
      },
      {
        title: 'How the Pillars Work Together',
        content: `**Incident response workflow:**

1. **Alert fires** (metric: error rate spike)
2. **Dashboard** shows which service and endpoint (metrics)
3. **Logs** reveal specific error messages and affected users
4. **Trace** shows the slow/failing downstream dependency
5. **Fix** the root cause, deploy, verify metrics recover

**Correlation ID** links all three:
\`\`\`
request_id: "abc-123" appears in:
- Metric labels
- Log entries
- Trace spans
\`\`\`

**Interview answer:** "Metrics tell me something is wrong. Logs tell me what happened. Traces tell me where. I correlate all three with request IDs and alert on SLO burn rate, not individual log lines."`,
      },
    ],
    pitfalls: [
      'Logging everything at DEBUG in production — cost explosion',
      'Alerting on log patterns instead of metric thresholds',
      'No correlation IDs — cannot trace request across services',
      'Tracing 100% of requests at scale — use sampling',
      'Metrics without labels — can\'t drill down to specific service/endpoint',
    ],
    summary: [
      'Metrics: aggregated, cheap, for alerting and trends',
      'Logs: detailed events with context, for debugging specific failures',
      'Traces: cross-service request flow, for latency analysis',
      'Correlate all three with request/correlation IDs',
      'Alert on SLO burn rate (metrics), investigate with logs and traces',
    ],
  }),

  'observability:implementation': buildTextbookLesson({
    chapter: 'Observability Implementation',
    overview:
      'Understanding the three pillars is step one — implementing them in production is step two. This chapter covers structured logging, RED/USE metrics, OpenTelemetry tracing, and SLO-based alerting that wakes you up only when it matters.',
    objectives: [
      'Implement structured JSON logging with correlation IDs',
      'Set up RED metrics for services and USE for infrastructure',
      'Deploy distributed tracing with OpenTelemetry',
      'Design SLO-based alerting with error budgets',
    ],
    definitions: [
      { term: 'Correlation ID', definition: 'Unique identifier propagated across all services for a single request — links logs, traces, and metrics.' },
      { term: 'Error budget', definition: 'Allowed amount of SLO violation — when exhausted, focus shifts from features to reliability.' },
      { term: 'OpenTelemetry', definition: 'Vendor-neutral observability framework for generating and exporting traces, metrics, and logs.' },
    ],
    sections: [
      {
        title: 'Structured Logging Implementation',
        content: `**Every log entry includes:**
\`\`\`json
{
  "timestamp": "ISO-8601",
  "level": "INFO|WARN|ERROR",
  "message": "human-readable description",
  "request_id": "uuid-propagated-from-gateway",
  "service": "order-service",
  "user_id": "optional-context",
  "duration_ms": 123
}
\`\`\`

**Propagation middleware:**
\`\`\`python
@app.middleware("http")
async def add_request_id(request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid4()))
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response
\`\`\`

**Pass to downstream services** in outgoing HTTP headers. **Never log:** passwords, tokens, PII (mask or omit).`,
      },
      {
        title: 'RED and USE Metrics Setup',
        content: `**Service metrics (RED):**
\`\`\`python
from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter("http_requests_total", "Total requests", ["method", "endpoint", "status"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "Latency", ["method", "endpoint"])

@app.middleware("http")
async def metrics_middleware(request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
    REQUEST_LATENCY.labels(request.method, request.url.path).observe(duration)
    return response
\`\`\`

**Infrastructure metrics (USE):**
- CPU utilization, memory usage, disk I/O, network throughput
- Connection pool utilization and wait time
- Queue depth and consumer lag`,
      },
      {
        title: 'Distributed Tracing with OpenTelemetry',
        content: `\`\`\`python
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

tracer = trace.get_tracer(__name__)
FastAPIInstrumentor.instrument_app(app)

@tracer.start_as_current_span("process_order")
def process_order(order_id):
    with tracer.start_as_current_span("validate_inventory"):
        check_inventory(order_id)
    with tracer.start_as_current_span("charge_payment"):
        charge(order_id)
\`\`\`

**Auto-instrumentation** for HTTP clients, database drivers, message queues.

**Sampling strategies:**
- Head-based: decide at start (sample 10% of all requests)
- Tail-based: keep all slow/error traces, sample normal ones
- Always trace: errors, slow requests (> SLO threshold)`,
      },
      {
        title: 'SLO-Based Alerting',
        content: `**Define SLOs:**
\`\`\`
Availability SLO: 99.9% (43 min downtime/month)
Latency SLO: p99 < 500ms
Error budget: 0.1% of requests can fail
\`\`\`

**Burn rate alerting** — alert when error budget consumption rate is unsustainable:
\`\`\`
Fast burn: 2% budget consumed in 1 hour → page on-call
Slow burn: 10% budget consumed in 6 hours → ticket
\`\`\`

**Alert principles:**
- Alert on symptoms (high error rate), not causes (CPU high)
- Every alert must be actionable
- Runbooks linked to every alert
- Reduce noise — if it fires weekly with no action, delete it

**Dashboard hierarchy:** Executive (SLO status) → Service (RED metrics) → Infrastructure (USE metrics) → Debug (logs + traces).`,
      },
    ],
    pitfalls: [
      'Unstructured log strings — impossible to query at scale',
      'Missing request ID propagation to downstream services',
      'Alerting on CPU > 80% instead of error rate or latency SLO',
      'No sampling on traces — observability backend cost explosion',
      'Logging secrets or PII — compliance and security risk',
    ],
    summary: [
      'Structured JSON logs with request_id propagated everywhere',
      'RED metrics on every service; USE metrics on infrastructure',
      'OpenTelemetry for vendor-neutral tracing with smart sampling',
      'SLO-based alerting on error budget burn rate',
      'Every alert actionable with linked runbook',
    ],
  }),

  'message-queues:fundamentals': buildTextbookLesson({
    chapter: 'Message Queue Fundamentals',
    overview:
      'Message queues decouple producers from consumers, enable async processing, and absorb traffic spikes. This chapter covers delivery guarantees, queue vs pub/sub vs log architectures, and how to choose the right messaging technology.',
    objectives: [
      'Compare at-most-once, at-least-once, and exactly-once delivery',
      'Distinguish queue, pub/sub, and log-based messaging patterns',
      'Choose between Kafka, RabbitMQ, and SQS for different use cases',
      'Design reliable async pipelines with retries and dead letter queues',
    ],
    definitions: [
      { term: 'At-least-once delivery', definition: 'Messages may be delivered more than once but are never lost — requires idempotent consumers.' },
      { term: 'Dead Letter Queue (DLQ)', definition: 'Queue for messages that failed processing after maximum retries — prevents poison messages from blocking.' },
      { term: 'Backpressure', definition: 'Mechanism to slow producers when consumers cannot keep up — prevents system overload.' },
    ],
    sections: [
      {
        title: 'Delivery Guarantees',
        content: `| Guarantee | Behavior | Trade-off |
|-----------|----------|-----------|
| At-most-once | Fire and forget, may lose messages | Fastest, no duplicates |
| At-least-once | Retry until acknowledged, may duplicate | Most common, needs idempotent consumers |
| Exactly-once | Process exactly once | Hardest — requires transactional infrastructure |

**Pragmatic choice:** At-least-once delivery + idempotent consumers = effective exactly-once.

\`\`\`python
def process_message(msg):
    if already_processed(msg.id):
        return  # Skip duplicate
    do_work(msg)
    mark_processed(msg.id)  # Dedup store (Redis, DB)
\`\`\`

**Acknowledgment:** Consumer must ack only after successful processing. Premature ack = message loss on crash.`,
      },
      {
        title: 'Queue vs Pub/Sub vs Log',
        content: `**Queue (point-to-point):**
- One consumer per message
- Load balancing across workers
- Examples: SQS, RabbitMQ queues, Celery
- Use: task processing, job queues

**Pub/Sub (broadcast):**
- All subscribers receive every message
- Examples: SNS, Redis Pub/Sub
- Use: notifications, event fan-out

**Log (event streaming):**
- Durable, ordered, replayable
- Multiple consumer groups read independently
- Examples: Kafka, Kinesis
- Use: event sourcing, analytics, audit trails

| Use Case | Technology |
|----------|-----------|
| Task queue, job processing | SQS, RabbitMQ |
| Event streaming, analytics | Kafka |
| Real-time notifications | SNS, Redis Pub/Sub |
| Decouple microservices | Kafka, RabbitMQ |`,
      },
      {
        title: 'Technology Comparison',
        content: `**Kafka:**
- High throughput (millions msg/sec)
- Durable log with replay
- Ordering within partition
- Complex operations (ZooKeeper/KRaft)
- Best for: event streaming, analytics, audit

**RabbitMQ:**
- Flexible routing (exchanges, bindings)
- Lower latency
- Task queue patterns
- Best for: task distribution, complex routing

**AWS SQS:**
- Fully managed, zero ops
- At-least-once (FIFO for ordering)
- 256KB message limit
- Best for: AWS-native async, simple decoupling

**Interview answer:** "Kafka for event streams needing replay and high throughput. SQS for simple AWS-native task queues. RabbitMQ when I need flexible routing."`,
      },
      {
        title: 'Reliability Patterns',
        content: `**Retry with exponential backoff:**
\`\`\`
Attempt 1: immediate
Attempt 2: wait 1s
Attempt 3: wait 4s
Attempt 4: wait 16s
→ DLQ after max retries
\`\`\`

**Visibility timeout (SQS):** Message hidden from other consumers while being processed. Must exceed max processing time or message reappears (duplicate processing).

**Poison message:** Always fails processing. After N retries → DLQ. Alert on DLQ depth.

**Backpressure:** When queue depth grows:
1. Scale consumers (auto-scaling on queue depth)
2. Rate limit producers
3. Return 503 to clients when overwhelmed
4. Monitor: queue depth, processing rate, error rate, consumer lag`,
      },
    ],
    pitfalls: [
      'Assuming exactly-once without idempotent consumers',
      'Visibility timeout shorter than processing time — duplicate processing',
      'No DLQ — poison messages block the queue forever',
      'No monitoring of queue depth — discover backlog in production',
      'Synchronous processing when async would absorb spikes',
    ],
    summary: [
      'At-least-once + idempotent consumers is the pragmatic default',
      'Queues for tasks, pub/sub for broadcast, logs for replayable streams',
      'Kafka for streaming, SQS for simple AWS queues, RabbitMQ for routing',
      'Retry with backoff, DLQ for failures, alert on DLQ depth',
      'Scale consumers on queue depth; apply backpressure when overwhelmed',
    ],
  }),

  'message-queues:kafka': buildTextbookLesson({
    chapter: 'Apache Kafka Deep Dive',
    overview:
      'Kafka is the industry standard for event streaming at scale. This chapter covers topics, partitions, consumer groups, ordering guarantees, and operational concerns like consumer lag and rebalancing.',
    objectives: [
      'Explain Kafka topics, partitions, offsets, and consumer groups',
      'Design partitioning strategies for ordering and parallelism',
      'Monitor and resolve consumer lag',
      'Implement idempotent producers and consumers',
    ],
    definitions: [
      { term: 'Topic', definition: 'A category or feed name to which messages (records) are published in Kafka.' },
      { term: 'Partition', definition: 'An ordered, immutable sequence of records within a topic — enables parallelism.' },
      { term: 'Consumer group', definition: 'A set of consumers that jointly consume a topic — each partition assigned to one consumer in the group.' },
    ],
    sections: [
      {
        title: 'Core Architecture',
        content: `**Kafka cluster components:**
- **Broker:** Kafka server storing data
- **Topic:** Named stream of records (like a table)
- **Partition:** Ordered log within a topic
- **Offset:** Position of a record in a partition (monotonically increasing)
- **Producer:** Writes records to topics
- **Consumer:** Reads records from topics
- **ZooKeeper/KRaft:** Cluster coordination

**Data flow:**
\`\`\`
Producer → Topic (3 partitions) → Consumer Group (3 consumers)
  P0 → Consumer A
  P1 → Consumer B
  P2 → Consumer C
\`\`\`

Each partition is consumed by exactly one consumer in a group. More partitions = more parallelism.`,
      },
      {
        title: 'Partitioning and Ordering',
        content: `**Ordering guarantee: only within a partition.**

\`\`\`python
producer.send(
    'user-events',
    key=str(user_id),  # Same key → same partition
    value={'event': 'purchase', 'amount': 99.99}
)
\`\`\`

**Partition key strategies:**
- \`user_id\` — all events for a user are ordered
- \`order_id\` — all events for an order are ordered
- No key — round-robin across partitions (no ordering)

**Choosing partition count:**
- Start with: expected throughput / single consumer throughput
- Can only increase (not decrease) partitions
- Too many: overhead; too few: bottleneck

**Compaction:** Log compaction keeps only the latest record per key — useful for changelog topics.`,
      },
      {
        title: 'Consumer Groups and Lag',
        content: `**Consumer group mechanics:**
- Each partition assigned to one consumer in the group
- Rebalance when consumers join/leave
- Different groups read independently (fan-out)

**Consumer lag:**
\`\`\`
Lag = Latest offset - Consumer offset (per partition)
\`\`\`

**Investigating growing lag:**
1. Slow consumer processing? Profile handler
2. Downstream dependency slow? Check DB/API latency
3. Not enough consumers? Scale group (≤ partition count)
4. Poison message blocking partition? Check DLQ
5. Rebalancing in progress? Wait for stabilization

**Auto-commit vs manual commit:**
- Auto-commit: simple but may lose messages on crash
- Manual commit: ack after processing (at-least-once safe)`,
      },
      {
        title: 'Production Patterns',
        content: `**Idempotent producer (Kafka 0.11+):**
\`\`\`python
producer = KafkaProducer(
    enable_idempotence=True,  # Exactly-once per partition
    acks='all',               # Wait for all replicas
    retries=3,
)
\`\`\`

**Transactional producer** for exactly-once across topics:
\`\`\`python
producer.init_transactions()
producer.begin_transaction()
producer.send('topic-a', value)
producer.send('topic-b', value)
producer.commit_transaction()
\`\`\`

**Replication factor:** 3 for production (tolerate 2 broker failures).
**Retention:** Time-based (7 days) or size-based. Compacted topics for changelog.

**Monitoring:** Consumer lag, under-replicated partitions, broker disk usage, request latency.`,
      },
    ],
    pitfalls: [
      'Expecting global ordering across partitions — only per-partition',
      'More consumers than partitions — idle consumers waste resources',
      'Auto-commit before processing completes — message loss on crash',
      'Ignoring consumer lag alerts — backlog grows until system fails',
      'Single partition topic — no parallelism for high throughput',
    ],
    summary: [
      'Topics contain partitions; ordering guaranteed only within partition',
      'Partition key determines which partition — design for your ordering needs',
      'Consumer groups distribute partitions; monitor lag per partition',
      'Idempotent producer + manual commit for reliable delivery',
      'Replication factor 3, retention policies, and lag alerting for production',
    ],
  }),

  'message-queues:patterns': buildTextbookLesson({
    chapter: 'Messaging Patterns',
    overview:
      'Beyond basic publish/consume, production systems need patterns for consistency, failure handling, and distributed transactions. This chapter covers the outbox pattern, saga pattern, dead letter queues, and poison message handling.',
    objectives: [
      'Implement the transactional outbox pattern for DB + queue consistency',
      'Design saga patterns for distributed transactions',
      'Handle poison messages and dead letter queues',
      'Apply event-driven patterns for microservice decoupling',
    ],
    definitions: [
      { term: 'Outbox pattern', definition: 'Write events to an outbox table in the same DB transaction as business data, then publish asynchronously.' },
      { term: 'Saga', definition: 'A sequence of local transactions across services, with compensating transactions on failure.' },
      { term: 'Poison message', definition: 'A message that always fails processing regardless of retries — must be moved to DLQ.' },
    ],
    sections: [
      {
        title: 'Transactional Outbox Pattern',
        content: `**Problem:** Save to DB and publish to queue — if one fails, data is inconsistent.

**Solution:** Write event to outbox table in the same transaction:

\`\`\`python
def create_order(order_data):
    with db.transaction():
        order = db.insert_order(order_data)
        db.insert_outbox({
            "event": "OrderCreated",
            "payload": order.to_dict(),
            "created_at": now()
        })
    # Separate process polls outbox and publishes to Kafka
\`\`\`

**Outbox publisher:**
1. Poll outbox table for unpublished events
2. Publish to message queue
3. Mark as published (or delete)
4. Idempotent — safe to retry

**Variants:** Change Data Capture (Debezium) streams outbox table changes to Kafka automatically.`,
      },
      {
        title: 'Saga Pattern',
        content: `**Choreography saga** (event-driven):
\`\`\`
OrderCreated → ReserveInventory → PaymentProcessed → ShipOrder
                ↓ fail          ↓ fail
            ReleaseInventory  RefundPayment
\`\`\`
Each service listens for events and publishes next step or compensation.

**Orchestration saga** (central coordinator):
\`\`\`
Saga Orchestrator:
  1. Call Inventory.reserve() → success
  2. Call Payment.charge() → fail
  3. Call Inventory.release() → compensate
\`\`\`

**When to use:**
- Choreography: simple flows, few services
- Orchestration: complex flows, need visibility

**Compensating transactions** must be idempotent — may run multiple times.`,
      },
      {
        title: 'Dead Letter Queues and Poison Messages',
        content: `**DLQ flow:**
\`\`\`
Main Queue → Consumer (retry 3x) → DLQ → Alert → Manual investigation
\`\`\`

**Configuration:**
\`\`\`python
# SQS redrive policy
{
  "maxReceiveCount": 3,
  "deadLetterTargetArn": "arn:aws:sqs:...:my-dlq"
}
\`\`\`

**Poison message handling:**
1. Alert when DLQ depth > 0
2. Inspect message content and error logs
3. Fix bug or bad data
4. Replay from DLQ to main queue
5. Monitor for recurrence

**Never silently drop messages.** Every failed message must be accounted for in DLQ or audit log.`,
      },
      {
        title: 'Event-Driven Decoupling',
        content: `**Event notification** (simple):
\`\`\`
Order Service → "OrderCreated" → Email Service sends confirmation
\`\`\`

**Event-carried state transfer:**
\`\`\`
Order Service → "OrderCreated" {order details} → Analytics Service
\`\`\`
Consumer doesn't need to call back for data.

**Event sourcing** (advanced): Store events as source of truth, derive state by replay.

**Design principles:**
- Events named in past tense: \`OrderPlaced\`, not \`PlaceOrder\`
- Include event version for schema evolution
- Idempotent consumers always
- Schema registry for event contracts (Avro, Protobuf)`,
      },
    ],
    pitfalls: [
      'Publishing to queue outside DB transaction — inconsistency on failure',
      'No DLQ — poison messages block processing indefinitely',
      'Saga compensations not idempotent — double compensation causes bugs',
      'Events named as commands — confusing intent',
      'No schema versioning — breaking changes crash consumers',
    ],
    summary: [
      'Outbox pattern ensures DB and queue consistency',
      'Saga for distributed transactions with compensating actions',
      'DLQ for failed messages; alert and investigate, never silently drop',
      'Events in past tense with versioning for schema evolution',
      'Idempotent consumers are mandatory for at-least-once delivery',
    ],
  }),

  'event-driven:fundamentals': buildTextbookLesson({
    chapter: 'Event-Driven Architecture Fundamentals',
    overview:
      'Event-driven architecture (EDA) uses events as the primary communication mechanism between services. This chapter covers event design, loose coupling benefits, eventual consistency challenges, and when EDA is the right choice.',
    objectives: [
      'Distinguish event-driven from request-driven architectures',
      'Design event schemas with proper naming and versioning',
      'Handle eventual consistency in event-driven systems',
      'Decide when event-driven architecture is appropriate',
    ],
    definitions: [
      { term: 'Event', definition: 'An immutable record of something that happened in the past, named in past tense.' },
      { term: 'Event-driven architecture', definition: 'System design where services communicate by producing and consuming events asynchronously.' },
      { term: 'Eventual consistency', definition: 'System will become consistent over time, but may be temporarily inconsistent between services.' },
    ],
    sections: [
      {
        title: 'Request-Driven vs Event-Driven',
        content: `**Request-driven (synchronous):**
\`\`\`
Client → API Gateway → Order Service → Inventory Service → Payment Service
         (waits)        (waits)           (waits)
\`\`\`
- Tight coupling — caller waits for response
- Cascading failures propagate
- Simple to reason about
- Latency = sum of all service latencies

**Event-driven (asynchronous):**
\`\`\`
Order Service → OrderPlaced event → Kafka
                                    ├── Inventory Service (reserves stock)
                                    ├── Payment Service (charges card)
                                    └── Notification Service (sends email)
\`\`\`
- Loose coupling — services don't know about each other
- Resilient — one consumer failure doesn't block others
- Eventual consistency
- Harder to debug distributed flows`,
      },
      {
        title: 'Event Design Principles',
        content: `**Naming:** Past tense — \`OrderPlaced\`, \`PaymentReceived\`, \`UserRegistered\`

**Event structure:**
\`\`\`json
{
  "event_id": "uuid",
  "event_type": "OrderPlaced",
  "event_version": 2,
  "timestamp": "2026-01-15T10:30:00Z",
  "source": "order-service",
  "data": {
    "order_id": "ord-123",
    "user_id": "user-456",
    "total": 99.99
  },
  "metadata": {
    "correlation_id": "req-abc",
    "causation_id": "evt-previous"
  }
}
\`\`\`

**Schema evolution rules:**
- Add optional fields (backward compatible)
- Never remove or rename fields
- Version events when breaking changes needed
- Consumers ignore unknown fields`,
      },
      {
        title: 'Benefits and Challenges',
        content: `**Benefits:**
- Loose coupling — add consumers without changing producers
- Scalability — services scale independently
- Resilience — failures isolated per consumer
- Audit trail — events are natural log of what happened
- Flexibility — new features consume existing events

**Challenges:**
- **Eventual consistency** — data temporarily inconsistent across services
- **Debugging** — no single request/response to trace (need distributed tracing)
- **Schema evolution** — breaking changes affect all consumers
- **Ordering** — not guaranteed globally (only per partition/key)
- **Complexity** — more moving parts than monolith

**When to use EDA:**
- Multiple services need to react to same event
- Audit trail required
- Peak load buffering needed
- Services have different scaling requirements`,
      },
      {
        title: 'Consistency Patterns',
        content: `**Read your own writes:** User creates order, immediately views it — may not appear yet.
- Solution: Read from write model, or include in API response

**Causal consistency:** Related events processed in order.
- Solution: Partition by entity ID in Kafka

**Saga for multi-step workflows:**
\`\`\`
OrderPlaced → PaymentProcessed → OrderConfirmed
              ↓ fail
           PaymentFailed → OrderCancelled
\`\`\`

**Interview answer:** "I'd use events for cross-service notifications and audit. I'd keep synchronous calls for operations needing immediate confirmation, like payment authorization."`,
      },
    ],
    pitfalls: [
      'Events named as commands (PlaceOrder) instead of facts (OrderPlaced)',
      'Assuming immediate consistency across event-driven services',
      'No correlation/causation IDs — impossible to trace event chains',
      'Breaking schema changes without versioning',
      'Event-driven for simple CRUD — unnecessary complexity',
    ],
    summary: [
      'Events are immutable facts in past tense — OrderPlaced, not PlaceOrder',
      'EDA enables loose coupling, independent scaling, and natural audit trails',
      'Eventual consistency requires careful UX and read-your-writes patterns',
      'Schema versioning and backward compatibility are essential',
      'Use EDA when multiple consumers react to events; sync for immediate needs',
    ],
  }),

  'event-driven:event-sourcing': buildTextbookLesson({
    chapter: 'Event Sourcing',
    overview:
      'Event sourcing stores state changes as a sequence of events rather than current state. This chapter covers the concept, benefits for audit-heavy domains, snapshot strategies, and when the complexity is justified.',
    objectives: [
      'Explain event sourcing vs traditional CRUD storage',
      'Design event stores and snapshot strategies',
      'Handle event schema evolution in sourced systems',
      'Identify domains where event sourcing provides clear value',
    ],
    definitions: [
      { term: 'Event sourcing', definition: 'Storing all state changes as a sequence of events; current state is derived by replaying events.' },
      { term: 'Snapshot', definition: 'A cached materialization of aggregate state at a point in time — avoids replaying all events.' },
      { term: 'Aggregate', definition: 'A cluster of domain objects treated as a single unit for event sourcing — e.g., an Order with its line items.' },
    ],
    sections: [
      {
        title: 'Concept and Comparison',
        content: `**CRUD (traditional):**
\`\`\`
users table: { id: 1, name: "Alice", balance: 150 }
UPDATE users SET balance = 100 WHERE id = 1
-- History lost
\`\`\`

**Event sourcing:**
\`\`\`
events: [
  { type: "AccountCreated", balance: 0 },
  { type: "MoneyDeposited", amount: 200 },
  { type: "MoneyWithdrawn", amount: 50 }
]
-- Current balance = replay: 0 + 200 - 50 = 150
-- Full history preserved
\`\`\`

**Rebuild state at any point:**
\`\`\`python
def get_balance_at(account_id, timestamp):
    events = event_store.get_events(account_id, until=timestamp)
    return replay(events)
\`\`\``,
      },
      {
        title: 'Benefits and Use Cases',
        content: `**Benefits:**
- Complete audit trail — who did what, when
- Temporal queries — "What was the balance on Jan 1?"
- Debug by replaying events
- Natural fit for event-driven architecture
- No update anomalies (no lost updates)

**Ideal domains:**
- Financial systems (banking, trading)
- Healthcare records
- Legal/compliance-heavy systems
- Collaborative editing (Google Docs model)

**NOT ideal for:**
- Simple CRUD with no audit requirements
- Systems where event storage cost is prohibitive
- Teams without distributed systems experience`,
      },
      {
        title: 'Snapshots and Projections',
        content: `**Problem:** Replaying 1 million events to get current state is slow.

**Snapshot strategy:**
\`\`\`
Events 1-1000 → Snapshot at event 1000 (balance: 5000)
Events 1001-1050 → Replay only these 50 events
Current state = snapshot + replay since snapshot
\`\`\`

Take snapshots every N events or on timer.

**Projections (read models):**
\`\`\`
Events → Projection Worker → Materialized View (optimized for queries)
OrderPlaced, OrderShipped → orders_read_model table
\`\`\`

Separate write model (events) from read model (projections). Often paired with CQRS.`,
      },
      {
        title: 'Schema Evolution and Storage',
        content: `**Events are immutable — you cannot change stored events.**

**Evolution strategies:**
1. **Upcasters:** Transform old events to new schema on read
2. **Versioned events:** \`OrderPlacedV1\`, \`OrderPlacedV2\`
3. **Additive changes only:** New optional fields

**Storage considerations:**
- Event store grows indefinitely — plan retention/archival
- Kafka with compaction for changelog topics
- Dedicated event stores (EventStoreDB)
- PostgreSQL with events table works for moderate scale

**Interview answer:** "Event sourcing for audit-critical domains like payments. I'd use snapshots every 100 events, projections for queries, and upcasters for schema evolution."`,
      },
    ],
    pitfalls: [
      'Event sourcing for simple CRUD — massive complexity for no benefit',
      'No snapshot strategy — replay becomes slower over time',
      'Modifying stored events — breaks immutability guarantee',
      'No projection for queries — scanning all events for every read',
      'Ignoring storage growth — events accumulate forever',
    ],
    summary: [
      'Event sourcing stores changes as events; state derived by replay',
      'Complete audit trail and temporal queries are key benefits',
      'Snapshots prevent slow replay; projections optimize reads',
      'Events are immutable — evolve schema with upcasters and versioning',
      'Use for audit-heavy domains; CRUD is fine for simple cases',
    ],
  }),

  'event-driven:cqrs': buildTextbookLesson({
    chapter: 'CQRS — Command Query Responsibility Segregation',
    overview:
      'CQRS separates the models used for writing (commands) from those used for reading (queries). This chapter covers the pattern, its pairing with event sourcing, read model projections, and when the added complexity is worthwhile.',
    objectives: [
      'Explain CQRS and its separation of write and read models',
      'Design command handlers and query-optimized read models',
      'Understand CQRS + event sourcing as a combined pattern',
      'Evaluate when CQRS complexity is justified',
    ],
    definitions: [
      { term: 'CQRS', definition: 'Command Query Responsibility Segregation — separate models for writes (commands) and reads (queries).' },
      { term: 'Command', definition: 'An intent to change state — validated and processed by the write model.' },
      { term: 'Read model (projection)', definition: 'A denormalized view optimized for specific query patterns, updated from events.' },
    ],
    sections: [
      {
        title: 'CQRS Concept',
        content: `**Traditional:** Same model for reads and writes.
\`\`\`
POST /orders → Order model → PostgreSQL orders table
GET /orders  → Order model → PostgreSQL orders table (same)
\`\`\`

**CQRS:** Separate models optimized for each operation.
\`\`\`
Command side:                    Query side:
POST /orders                     GET /orders
  → Validate business rules        → orders_summary_view
  → Apply domain logic             → (denormalized, indexed)
  → Emit OrderPlaced event       → Fast reads, no joins
  → Event store
\`\`\`

**Write model:** Optimized for business rules, validation, consistency.
**Read model:** Optimized for display — denormalized, pre-joined, cached.`,
      },
      {
        title: 'Command and Query Sides',
        content: `**Command handler:**
\`\`\`python
def handle_place_order(cmd: PlaceOrder):
    # Validate
    if not inventory.available(cmd.items):
        raise InsufficientStock()
    
    # Apply business logic
    order = Order.create(cmd.user_id, cmd.items)
    
    # Persist event
    event_store.append(order.id, order.events)
    
    # Publish for read model update
    event_bus.publish(order.events)
\`\`\`

**Query handler:**
\`\`\`python
def get_user_orders(user_id: str) -> list[OrderSummary]:
    # Read from optimized projection — no domain logic
    return read_db.query(
        "SELECT * FROM order_summaries WHERE user_id = %s",
        user_id
    )
\`\`\``,
      },
      {
        title: 'CQRS with Event Sourcing',
        content: `**Combined pattern:**
\`\`\`
Command → Write Model → Events → Event Store
                                    ↓
                              Projection Workers
                                    ↓
                              Read Models (SQL, Elasticsearch, Redis)
                                    ↓
Query ← Read Model
\`\`\`

**Multiple read models** from same events:
- \`order_summaries\` table for list views
- Elasticsearch index for search
- Redis cache for dashboard stats

Each optimized for its query pattern. Updated asynchronously (eventual consistency).

**Consistency note:** After placing an order, the list view may not immediately show it. Handle with:
- Optimistic UI update
- Return created order in command response
- Poll until read model catches up`,
      },
      {
        title: 'When to Use CQRS',
        content: `**Use CQRS when:**
- Read and write patterns are very different
- Complex domain logic on write side
- Multiple query patterns need different optimizations
- High read-to-write ratio (scale reads independently)
- Event sourcing is already in use

**Don't use CQRS when:**
- Simple CRUD application
- Read and write patterns are similar
- Team lacks experience with distributed patterns
- Eventual consistency is unacceptable

**Simplified CQRS (pragmatic):**
Separate read and write database tables without full event sourcing:
\`\`\`
Write: normalized orders table
Read: denormalized order_summaries (updated by trigger or async worker)
\`\`\`

**Interview answer:** "CQRS when reads and writes have different scaling and optimization needs. I'd start with separate read models updated by events, adding event sourcing only if audit requirements demand it."`,
      },
    ],
    pitfalls: [
      'CQRS for simple CRUD — massive overhead for no benefit',
      'Single read model trying to serve all query patterns',
      'Not handling eventual consistency in the UI',
      'Full CQRS + event sourcing as default — start simpler',
      'Read model not rebuilt when projection logic changes',
    ],
    summary: [
      'CQRS separates write model (commands) from read model (queries)',
      'Write side handles validation and business rules; read side is denormalized',
      'Often paired with event sourcing — events feed read model projections',
      'Multiple read models optimized for different query patterns',
      'Use when read/write needs diverge; skip for simple CRUD',
    ],
  }),

  'behavioral:preparation': buildTextbookLesson({
    chapter: 'Behavioral Interview Preparation',
    overview:
      'Senior interviews test leadership, ownership, and impact — not just technical skills. This chapter teaches how to build a story bank, structure answers with STAR, and demonstrate the qualities hiring managers seek in senior engineers.',
    objectives: [
      'Build a story bank covering 8-10 key behavioral themes',
      'Structure every answer using the STAR method',
      'Demonstrate leadership and impact with quantified results',
      'Prepare for common senior behavioral question categories',
    ],
    definitions: [
      { term: 'STAR method', definition: 'Situation, Task, Action, Result — framework for structuring behavioral interview answers.' },
      { term: 'Story bank', definition: 'A prepared collection of 8-10 real experiences mapped to common behavioral themes.' },
      { term: 'Impact metrics', definition: 'Quantified outcomes that demonstrate the value of your actions — latency reduced 80%, saved $50k/year.' },
    ],
    sections: [
      {
        title: 'STAR Method Mastery',
        content: `**Structure every answer:**

- **Situation** (15 sec): Brief context — team, company, scale
- **Task** (15 sec): Your specific responsibility
- **Action** (60 sec): What YOU did — specific, not "we"
- **Result** (30 sec): Quantified outcome + what you learned

**Senior answer quality markers:**
- Trade-offs you considered
- What you'd do differently
- Impact with numbers: "reduced p99 latency 80%", "saved $50k/year"
- Leadership as IC: influenced, mentored, drove initiative

**Example:**
"Situation: Our API p99 latency spiked to 5s affecting 10k users. Task: I was on-call, needed to restore service. Action: Checked dashboards, identified DB connection pool exhaustion from a new deploy. Rolled back, increased pool size, added pool utilization alerting. Result: Restored in 12 minutes. Post-mortem led to canary deploys and connection pool monitoring."`,
      },
      {
        title: 'Building Your Story Bank',
        content: `**Cover these 8 themes with real stories:**

1. **Technical challenge solved** — complex problem, your approach, outcome
2. **Production incident handled** — on-call, debugging, resolution, post-mortem
3. **Conflict resolved** — disagreement with teammate/manager, how you handled it
4. **Mentoring/coaching** — helped junior grow, specific actions
5. **Failed project / mistake** — what went wrong, what you learned
6. **Cross-team collaboration** — worked across teams, influenced without authority
7. **Process improvement** — identified inefficiency, drove change
8. **Handling ambiguity** — unclear requirements, how you created clarity

**For each story, prepare:**
- 2-minute version (main answer)
- 30-second version (follow-up "tell me more briefly")
- Specific metrics and details for follow-up questions
- What you'd do differently`,
      },
      {
        title: 'Common Senior Question Categories',
        content: `**Technical leadership:**
- "Tell me about a technical decision you made that was controversial"
- "Describe a time you improved system reliability"
- "How do you handle technical debt?"

**Conflict & collaboration:**
- "Describe a disagreement with a teammate"
- "How do you handle an underperforming team member?"
- "Tell me about a failed project"

**Ownership & impact:**
- "What's the most impactful thing you've built?"
- "Describe a production incident you handled"
- "How do you prioritize when everything is urgent?"

**Growth & mentoring:**
- "How do you stay current with technology?"
- "Describe mentoring someone junior"
- "What's a mistake you made and what you learned?"

**Answering "tell me about yourself":** 2 minutes — current role, relevant experience, why this company/role. Not your life story.`,
      },
      {
        title: 'Practice and Delivery',
        content: `**Preparation checklist:**
- Write out 8-10 stories in STAR format
- Record yourself answering (check for rambling, filler words)
- Practice with a friend — get feedback on clarity and impact
- Research the company's values — align stories to their culture
- Prepare 3-5 thoughtful questions to ask the interviewer

**Delivery tips:**
- Use "I" not "we" — they want YOUR contribution
- Be specific — names, numbers, timelines
- Show vulnerability in failure stories — growth mindset
- Don't badmouth previous employers or colleagues
- Keep answers to 2-3 minutes — watch interviewer's engagement

**Red flags interviewers watch for:**
- No specific examples (hypothetical answers)
- Taking all credit or no credit
- Blaming others for failures
- Unable to articulate trade-offs
- No questions for the interviewer`,
      },
    ],
    pitfalls: [
      'Generic answers without specific examples — "I\'m a team player"',
      'Rambling 5-minute answers — practice the 2-minute version',
      'Using "we" for everything — interviewer can\'t assess YOUR contribution',
      'No quantified results — "improved performance" vs "reduced p99 by 80%"',
      'Not preparing questions for the interviewer — shows lack of interest',
    ],
    summary: [
      'STAR method: Situation, Task, Action, Result — 2 minutes max',
      'Story bank of 8-10 real experiences covering key themes',
      'Quantify impact: numbers, timelines, scale',
      'Use "I" for your actions; show trade-offs and lessons learned',
      'Practice aloud, record yourself, prepare questions for interviewer',
    ],
  }),

  'senior-engineering:mindset': buildTextbookLesson({
    chapter: 'Senior Engineering Mindset',
    overview:
      'Senior interviews test engineering reasoning, not memorization. This chapter provides a decision-making framework that demonstrates staff-level thinking — articulating trade-offs, failure modes, and measurement for every technical choice.',
    objectives: [
      'Apply a structured framework for answering senior technical questions',
      'Articulate trade-offs and alternatives for every decision',
      'Think in terms of failure modes and observability',
      'Communicate architecture decisions clearly and concisely',
    ],
    definitions: [
      { term: 'Trade-off analysis', definition: 'Explicitly comparing alternatives with their advantages and disadvantages for a given context.' },
      { term: 'Failure mode', definition: 'A way a system can fail — and the detection and mitigation strategy for each.' },
      { term: 'Blast radius', definition: 'The scope of impact when a component fails — how many users or services are affected.' },
    ],
    sections: [
      {
        title: 'The Senior Decision Framework',
        content: `For every technical decision, explain:

1. **What** you would do
2. **Why** (not just what)
3. **Alternatives** you considered
4. **Trade-offs** of your choice
5. **Failure modes** and how you'd handle them
6. **How you'd measure** success

**Template:**
"I would choose X because Y. The alternative Z has advantage A but disadvantage B. If X fails, we would detect it via metric M and respond by action N."

**Example:**
"I'd use Redis for caching because it gives us sub-millisecond reads for hot data. The alternative is in-process caching, which is faster but doesn't share across instances. If Redis fails, our cache-aside pattern falls through to the database — degraded performance but no data loss. We'd detect it via cache hit rate dropping and Redis connection errors, and respond by failing over to a replica."`,
      },
      {
        title: 'Thinking in Trade-offs',
        content: `**There are no perfect solutions — only trade-offs.**

| Decision | Option A | Option B |
|----------|----------|----------|
| Consistency | Strong (slower) | Eventual (faster) |
| Scaling | Vertical (simple) | Horizontal (complex) |
| Data store | SQL (ACID) | NoSQL (scale) |
| Communication | Sync (simple) | Async (resilient) |
| Deployment | Monolith (fast dev) | Microservices (independent scale) |

**Senior signal:** Naming the trade-off unprompted. "I'd choose PostgreSQL for transactional integrity. If we needed to scale writes beyond single-node capacity, we'd explore Citus or event sourcing — but that adds operational complexity we don't need yet."

**Avoid:** Presenting one option as universally correct. Senior engineers contextualize.`,
      },
      {
        title: 'Failure Mode Thinking',
        content: `**For every component, ask:**
- What happens when this fails?
- How do we detect the failure?
- What's the blast radius?
- What's the fallback/degradation?

**Example — Redis unavailable:**
| Use case | Impact | Mitigation |
|----------|--------|------------|
| Cache-aside | Slower reads (DB fallback) | Circuit breaker, alert |
| Session store | Users logged out | Sticky sessions or DB sessions |
| Rate limiter | Fail open (allow) or closed (block)? | Document decision |
| Distributed lock | Split brain risk | TTL + fencing tokens |

**Design for failure:** Every external dependency will fail. Circuit breakers, timeouts, bulkheads, and graceful degradation are not optional.`,
      },
      {
        title: 'Communication and Influence',
        content: `**Senior engineers communicate decisions, not just code.**

**Architecture Decision Record (ADR):**
\`\`\`markdown
# Use Redis for session storage
## Status: Accepted
## Context: Need shared sessions across 10 API instances
## Decision: Redis with 24h TTL
## Alternatives: JWT (hard to revoke), sticky sessions (uneven load)
## Consequences: New dependency, need Redis HA setup
\`\`\`

**Influencing without authority:**
- Present data, not opinions: "Benchmarks show approach A is 3x faster"
- Prototype to make abstract concrete
- Document trade-offs for the team
- Accept team decisions you disagree with — commit fully

**Interview signal:** Can you explain a complex system to a non-expert in 2 minutes?`,
      },
    ],
    pitfalls: [
      'Single-solution answers without mentioning alternatives',
      'Not discussing failure modes — "it won\'t fail" is a red flag',
      'Over-engineering for hypothetical scale — "we might need 1M users someday"',
      'Cannot explain decisions simply — complexity ≠ seniority',
      'Blaming technology instead of discussing trade-offs',
    ],
    summary: [
      'Frame every decision: what, why, alternatives, trade-offs, failure modes, metrics',
      'All engineering decisions involve trade-offs — name them explicitly',
      'Design for failure: circuit breakers, timeouts, graceful degradation',
      'Measure success with metrics, not assumptions',
      'Communicate decisions clearly — ADRs, prototypes, data-driven influence',
    ],
  }),

  'senior-engineering:scenarios': buildTextbookLesson({
    chapter: 'Core Senior Engineering Scenarios',
    overview:
      'Senior interviews present realistic production scenarios requiring structured reasoning under pressure. This chapter walks through the most common scenarios — Redis failure, DB overload, tail latency, retry storms, API versioning, and high-concurrency architecture.',
    objectives: [
      'Apply structured reasoning to production scenario questions',
      'Design architectures for high concurrency with failure tolerance',
      'Diagnose tail latency and retry amplification problems',
      'Plan API evolution for millions of users without breaking clients',
    ],
    definitions: [
      { term: 'Circuit breaker', definition: 'Pattern that stops calling a failing service after threshold failures, allowing it to recover.' },
      { term: 'Bulkhead', definition: 'Isolating resources so failure in one area does not exhaust resources for others.' },
      { term: 'Load shedding', definition: 'Intentionally dropping low-priority requests when system is overwhelmed.' },
    ],
    sections: [
      {
        title: 'Scenario: Redis Unavailable',
        content: `**Question:** "Redis goes down. What happens to your system?"

**Structured answer by use case:**

| Redis role | Impact | Detection | Response |
|-----------|--------|-----------|----------|
| Cache-aside | DB load increases, slower responses | Cache hit rate drops to 0% | Fall through to DB; scale DB reads |
| Session store | All users logged out | Auth error spike | Fail to DB sessions or JWT fallback |
| Rate limiter | No rate limiting active | Decision: fail open or closed? | Fail closed for security; open for availability |
| Distributed lock | Risk of double processing | Lock acquisition failures | TTL-based locks with fencing tokens |

**Key point:** Document fail-open vs fail-closed decisions BEFORE the incident. Circuit breaker on Redis client prevents hanging connections.`,
      },
      {
        title: 'Scenario: Database Overloaded',
        content: `**Question:** "DB is overloaded. You cannot add hardware. What do you do?"

**Prioritized response:**
1. **Identify top queries** — pg_stat_statements, slow query log
2. **Add indexes** — often 10-100x improvement, minutes to implement
3. **Cache hot data** — Redis for frequently read, rarely changed data
4. **Read replicas** — route analytics and reports to replica
5. **Connection pooling** — PgBouncer to reduce connection overhead
6. **Async processing** — queue non-critical writes (emails, analytics)
7. **Denormalize** — pre-compute for read-heavy patterns
8. **Rate limit** — expensive queries per user
9. **Archive old data** — reduce table size
10. **Materialized views** — pre-computed aggregations

**Interview signal:** Prioritize by impact and implementation speed. Indexes and caching first, architectural changes last.`,
      },
      {
        title: 'Scenario: Tail Latency and Retry Storms',
        content: `**p99=4s, p50=100ms:** Profile the p99 path specifically.
- GC pauses, lock contention, slow dependency (10% of requests)
- Connection pool exhaustion (wait for connection)
- Large payload outliers, cold cache misses

**30% downstream failure + retries = system failure:**
\`\`\`
Normal: 1000 RPS to downstream
30% failure × 3 retries = 1000 + 900 = 1900 RPS to failing service
→ Service can't recover → more failures → more retries → death spiral
\`\`\`

**Fix:**
- Circuit breaker (stop calling after N failures)
- Max 2 retries with exponential backoff + jitter
- Bulkhead isolation (separate connection pools per downstream)
- Timeout budgets (total request time capped)
- Retry only idempotent operations`,
      },
      {
        title: 'Scenario: 100k Concurrent Requests Architecture',
        content: `**Question:** "100k concurrent HTTP requests, each calls 3 downstream services. One has 2s latency and 10% failure rate."

**Architecture:**
\`\`\`
LB → N API pods
  ├── Circuit breaker per downstream
  ├── Timeouts: 500ms (fast), 2s (slow) with total budget
  ├── Retry: idempotent only, max 2, jitter
  ├── Bulkhead: separate connection pools
  ├── Redis cache for hot data
  ├── Queue for non-critical operations
  ├── Rate limit per client
  └── Load shed when queue depth high
\`\`\`

**Observability:**
- p50/p95/p99 per downstream service
- Circuit breaker state per service
- Queue depth and consumer lag
- Error rate and retry count

**API versioning (10M users):** /v1/, /v2/ paths. Backward-compatible changes in v1. Deprecation timeline with sunset headers. Monitor v1 usage, sunset when <1%. Contract tests between versions.`,
      },
    ],
    pitfalls: [
      'Jumping to solutions without clarifying requirements and constraints',
      'Not mentioning observability — how would you know there\'s a problem?',
      'Ignoring retry amplification in failure scenarios',
      'Single point of failure in proposed architecture',
      'Cannot discuss rollback plan or graceful degradation',
    ],
    summary: [
      'Redis failure: impact varies by use case — document fail-open vs fail-closed',
      'DB overload: indexes and caching first, then replicas, async, denormalization',
      'Tail latency: profile p99 path; retry storms need circuit breakers and budgets',
      'High concurrency: LB, circuit breakers, bulkheads, caching, load shedding',
      'API evolution: versioning, backward compatibility, deprecation timeline',
    ],
  }),

  'security:jwt-deep': buildTextbookLesson({
    chapter: 'JWT & OAuth2 Deep Dive',
    overview:
      'JSON Web Tokens and OAuth2 power most modern authentication. This chapter explains token structure, flows, security trade-offs, and production patterns for access and refresh tokens.',
    objectives: [
      'Decode JWT structure and choose signing algorithms (HS256 vs RS256)',
      'Design secure access and refresh token lifecycles',
      'Compare OAuth2 flows for web, mobile, and service-to-service',
      'Implement token revocation and rotation strategies',
    ],
    definitions: [
      { term: 'JWT', definition: 'JSON Web Token — compact, signed claims (header.payload.signature) used to transmit identity and authorization between parties.' },
      { term: 'OAuth2', definition: 'Authorization framework allowing third-party apps limited access to user resources without sharing passwords.' },
      { term: 'PKCE', definition: 'Proof Key for Code Exchange — prevents authorization code interception in public clients (SPAs, mobile).' },
    ],
    sections: [
      {
        title: 'JWT Structure and Verification',
        content: `A JWT has three Base64URL-encoded parts separated by dots: **Header.Payload.Signature**.

The **header** specifies algorithm (\`alg\`) and type (\`typ\`). The **payload** contains claims: \`sub\` (subject/user ID), \`exp\` (expiry), \`iat\` (issued at), custom roles. The **signature** verifies integrity — server signs with secret (HS256) or private key (RS256); verifiers use shared secret or public key.

**Never trust the payload without verifying the signature.** Client-side JWT decoding for display is fine; authorization decisions must happen server-side after cryptographic verification.`,
      },
      {
        title: 'Access vs Refresh Tokens',
        content: `**Access tokens** are short-lived (5–15 minutes), sent on every API request (Authorization header or httpOnly cookie). Compromise window is small.

**Refresh tokens** are long-lived (days/weeks), stored in **httpOnly, Secure, SameSite** cookies — not accessible to JavaScript (XSS protection). Used only to obtain new access tokens at a dedicated \`/token/refresh\` endpoint.

**Rotation:** Issue a new refresh token on each refresh; invalidate the old one. Detects token theft — if attacker and legitimate user both refresh, one fails and you revoke the family.`,
      },
      {
        title: 'OAuth2 Flows',
        content: `**Authorization Code (+ PKCE):** User redirects to identity provider, logs in, returns code to your callback. Server exchanges code for tokens. **Standard for web and mobile.**

**Client Credentials:** Service-to-service — no user involved. Client ID + secret → access token. Use for backend jobs, microservice auth.

**Implicit (deprecated):** Token returned in URL fragment — avoid for new apps.

**PKCE** adds \`code_verifier\` / \`code_challenge\` so intercepted authorization codes cannot be exchanged without the original client secret.`,
      },
    ],
    example: {
      title: 'FastAPI JWT verification',
      language: 'python',
      code: `from jose import jwt, JWTError

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid token")`,
      explanation: 'Always specify allowed algorithms explicitly — prevents "alg: none" attacks. Use RS256 when multiple services verify tokens with a public key.',
    },
    pitfalls: [
      'Storing JWT in localStorage — any XSS steals the token',
      'Long-lived access tokens without refresh rotation',
      'Not validating exp, iss, and aud claims',
    ],
    summary: [
      'JWT = signed claims; verify signature server-side on every request',
      'Short access tokens + httpOnly refresh cookies + rotation',
      'OAuth2 Authorization Code + PKCE for user-facing apps',
      'Plan revocation: short expiry, refresh rotation, or Redis blocklist for JTIs',
    ],
  }),

  'security:cors-csrf': buildTextbookLesson({
    chapter: 'CORS & CSRF',
    overview:
      'Browsers enforce the Same-Origin Policy. CORS and CSRF protections are essential for web APIs. This chapter explains how cross-origin requests work and how to prevent cross-site request forgery.',
    objectives: [
      'Explain CORS preflight and configure safe Access-Control headers',
      'Prevent CSRF with SameSite cookies, tokens, and Origin checks',
      'Distinguish CORS errors from authentication failures',
      'Design APIs safe for browser clients and SPAs',
    ],
    definitions: [
      { term: 'CORS', definition: 'Cross-Origin Resource Sharing — browser mechanism allowing servers to permit requests from different origins via response headers.' },
      { term: 'CSRF', definition: 'Cross-Site Request Forgery — attack where a malicious site triggers authenticated actions in the user\'s browser without consent.' },
      { term: 'Preflight', definition: 'OPTIONS request browsers send before "non-simple" cross-origin requests to check server permission.' },
    ],
    sections: [
      {
        title: 'How CORS Works',
        content: `Browsers block JavaScript from reading responses from a **different origin** (scheme + host + port) unless the server explicitly allows it.

Server responds with:
- \`Access-Control-Allow-Origin: https://app.example.com\` (never \`*\` when credentials are sent)
- \`Access-Control-Allow-Credentials: true\` for cookies
- \`Access-Control-Allow-Methods\` and \`Access-Control-Allow-Headers\` for preflight

**Simple requests** (GET, POST with simple content-types) skip preflight. **Preflight** OPTIONS runs first for PUT, DELETE, custom headers, or JSON content-type.`,
      },
      {
        title: 'CSRF Attack and Defense',
        content: `If your API uses **cookie-based sessions**, a malicious page can submit a form to \`https://bank.com/transfer\` — the browser automatically attaches cookies. User is authenticated; bank processes the transfer.

**Defenses:**
1. **SameSite=Strict/Lax** cookies — not sent on cross-site requests
2. **CSRF tokens** — server embeds token in page; attacker cannot read it (same-origin)
3. **Check Origin/Referer** headers on state-changing requests
4. **Use Authorization header** (Bearer token) instead of cookies — not sent automatically (but then XSS is your main threat)`,
      },
    ],
    pitfalls: [
      'Access-Control-Allow-Origin: * with credentials — browsers reject this',
      'Only checking CORS on API but forgetting CSRF for cookie auth',
      'Disabling CORS in production to "fix" frontend errors instead of whitelisting origins',
    ],
    summary: [
      'CORS is a browser security feature — configure explicit allowed origins',
      'Preflight OPTIONS must return correct headers for non-simple requests',
      'CSRF targets cookie-based auth — use SameSite, tokens, or Bearer headers',
      'CORS errors appear in browser console; fix server headers, not client hacks',
    ],
  }),
};
