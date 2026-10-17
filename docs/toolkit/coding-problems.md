---
title: Coding Interview Problems with Java Solutions (Tested)
sidebar_label: "Coding problems"
description: Sixteen commonly asked coding problems solved in modern Java with complexity analysis and the pattern behind each - hashing, two pointers, sliding window, heaps, DP, graphs, linked lists, concurrency and streams. Every solution was compiled and run.
keywords: [java coding interview, two sum, lru cache java, sliding window, merge intervals, top k frequent, number of islands, coin change, producer consumer java, java streams interview problems, leetcode java]
sidebar_position: 6
---

# Coding Problems with Java Solutions

Every solution on this page was compiled and run against test cases (including edge cases). Before coding in an interview: **clarify** inputs and constraints, **work an example**, state the **approach and complexity**, then code, then **test with edge cases** (empty, single element, duplicates, negatives, overflow).

<Outcomes items={[
  "Match a problem to a pattern quickly",
  "State time and space complexity for each solution",
  "Explain your approach while coding"
]} />

## Pattern cheat sheet

| Signal in the problem | Pattern |
| --- | --- |
| "Find a pair/complement", "seen before" | HashMap/HashSet lookup |
| Sorted array, pair/triple sums | Two pointers |
| Longest/shortest contiguous substring/subarray with a condition | **Sliding window** |
| Top K, K-th largest/most frequent | Heap (size-K) or quickselect |
| Overlapping ranges | Sort, then sweep |
| Matching brackets, nested structures, undo | Stack |
| Shortest path in unweighted graph/grid | BFS |
| Connected components, flood fill | DFS/BFS or union-find |
| Optimisation with overlapping subproblems | Dynamic programming |
| Sorted/monotonic search space | Binary search |
| Linked list cycle/middle | Fast and slow pointers |

## 1. Two Sum (hashing)

Return indices of the two numbers adding up to `target`.

```java
static int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();              // value -> index
    for (int i = 0; i < nums.length; i++) {
        Integer j = seen.get(target - nums[i]);
        if (j != null) return new int[]{j, i};
        seen.put(nums[i], i);
    }
    throw new IllegalArgumentException("no solution");
}
```

**O(n) time, O(n) space.** Look up the complement **before** inserting the current element, so an element is never paired with itself. Tested: `[2,7,11,15], 9 → [0,1]`; `[3,2,4], 6 → [1,2]`.

## 2. Valid Parentheses (stack)

```java
static boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        switch (c) {
            case '(' -> stack.push(')');                         // push the EXPECTED closer
            case '[' -> stack.push(']');
            case '{' -> stack.push('}');
            default -> { if (stack.isEmpty() || stack.pop() != c) return false; }
        }
    }
    return stack.isEmpty();                                      // leftovers mean unclosed brackets
}
```

**O(n), O(n).** Pushing the expected closing bracket removes the need for a lookup map. Use `ArrayDeque`, not `Stack`. Edge cases tested: `""`, `"(]"`, `"(("`, `"))"`.

## 3. Longest Substring Without Repeating Characters (sliding window)

```java
static int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> lastSeen = new HashMap<>();
    int best = 0, left = 0;
    for (int right = 0; right < s.length(); right++) {
        Integer prev = lastSeen.put(s.charAt(right), right);
        if (prev != null && prev >= left) left = prev + 1;       // jump the left edge past the previous occurrence
        best = Math.max(best, right - left + 1);
    }
    return best;
}
```

**O(n), O(min(n, alphabet)).** The `prev >= left` check matters: a repeat that occurred *before* the window start must not move `left` backwards (tested on `"abba"` → 2).

## 4. Merge Intervals (sort and sweep)

```java
static int[][] merge(int[][] intervals) {
    if (intervals.length == 0) return new int[0][];
    int[][] sorted = intervals.clone();
    Arrays.sort(sorted, Comparator.comparingInt(a -> a[0]));
    List<int[]> out = new ArrayList<>();
    int[] cur = sorted[0].clone();
    for (int i = 1; i < sorted.length; i++) {
        if (sorted[i][0] <= cur[1]) cur[1] = Math.max(cur[1], sorted[i][1]);   // overlap (touching counts): extend
        else { out.add(cur); cur = sorted[i].clone(); }
    }
    out.add(cur);
    return out.toArray(new int[0][]);
}
```

**O(n log n), O(n).** `Math.max` handles a contained interval (`[1,10]` with `[2,3]`). Tested: `[[1,3],[8,10],[2,6],[15,18],[17,20]] → [[1,6],[8,10],[15,20]]`; touching `[[1,4],[4,5]] → [[1,5]]`. Clarify whether touching intervals merge.

## 5. Group Anagrams (canonical key)

```java
static List<List<String>> groupAnagrams(String[] words) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String w : words) {
        char[] c = w.toCharArray();
        Arrays.sort(c);
        groups.computeIfAbsent(new String(c), k -> new ArrayList<>()).add(w);
    }
    return new ArrayList<>(groups.values());
}
```

**O(n · k log k)** for n words of length k. Alternative key: a 26-count signature gives O(n · k).

## 6. Top K Frequent Elements (heap)

```java
static List<Integer> topKFrequent(int[] nums, int k) {
    Map<Integer, Integer> freq = new HashMap<>();
    for (int n : nums) freq.merge(n, 1, Integer::sum);
    PriorityQueue<Map.Entry<Integer, Integer>> heap = new PriorityQueue<>(Map.Entry.comparingByValue());  // min-heap of size k
    for (Map.Entry<Integer, Integer> e : freq.entrySet()) {
        heap.offer(e);
        if (heap.size() > k) heap.poll();                        // drop the least frequent
    }
    List<Integer> out = new ArrayList<>();
    while (!heap.isEmpty()) out.add(heap.poll().getKey());
    Collections.reverse(out);
    return out;
}
```

**O(n log k) time, O(n) space.** A size-K **min-heap** keeps the K largest seen; the smallest of them sits at the top and is evicted first. Alternatives: bucket sort by frequency (O(n)), quickselect (average O(n)). Tested: `[1,1,1,2,2,3], k=2 → [1,2]`.

## 7. LRU Cache in O(1) (hash map + doubly linked list)

```java
static final class LruCache<K, V> {
    private final class Node { K key; V val; Node prev, next; Node(K k, V v) { key = k; val = v; } }
    private final int capacity;
    private final Map<K, Node> map = new HashMap<>();
    private final Node head = new Node(null, null), tail = new Node(null, null);   // sentinels avoid null checks

    LruCache(int capacity) { this.capacity = capacity; head.next = tail; tail.prev = head; }

    V get(K key) {
        Node n = map.get(key);
        if (n == null) return null;
        unlink(n); addFirst(n);                                  // mark as most recently used
        return n.val;
    }

    void put(K key, V val) {
        Node n = map.get(key);
        if (n != null) { n.val = val; unlink(n); addFirst(n); return; }
        if (map.size() == capacity) { Node lru = tail.prev; unlink(lru); map.remove(lru.key); }
        n = new Node(key, val);
        map.put(key, n); addFirst(n);
    }

    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addFirst(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
}
```

**O(1) get and put.** The map gives O(1) lookup; the list gives O(1) reordering and eviction of the tail. Interview shortcut: `LinkedHashMap(16, 0.75f, true)` with `removeEldestEntry` ([HashMap internals](../java/core-java/hashmap-internals.md)); not thread-safe, so for production use Caffeine ([Caching](../spring/data/caching.md)).

## 8. Linked list: reverse and detect a cycle

```java
static final class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }

static ListNode reverse(ListNode head) {
    ListNode prev = null;
    while (head != null) {
        ListNode next = head.next;       // save
        head.next = prev;                // flip
        prev = head;                     // advance
        head = next;
    }
    return prev;
}

static boolean hasCycle(ListNode head) {          // Floyd's tortoise and hare
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}
```

Both **O(n) time, O(1) space** (iterative reversal; the hash-set approach to cycles costs O(n) space). If asked for the cycle start: after meeting, reset one pointer to the head and move both one step at a time; they meet at the entry.

## 9. Search in a Rotated Sorted Array (binary search)

```java
static int searchRotated(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) >>> 1;                               // overflow-safe midpoint
        if (a[mid] == target) return mid;
        if (a[lo] <= a[mid]) {                                   // left half is sorted
            if (a[lo] <= target && target < a[mid]) hi = mid - 1; else lo = mid + 1;
        } else {                                                 // right half is sorted
            if (a[mid] < target && target <= a[hi]) lo = mid + 1; else hi = mid - 1;
        }
    }
    return -1;
}
```

**O(log n).** At every step one half is sorted: test whether the target lies in the sorted half, else go to the other. Tested on `[4,5,6,7,0,1,2]` (found 0 at 4; 3 missing), single elements and two elements. (With duplicates the problem degrades to O(n) worst case.)

## 10. Number of Islands (grid DFS)

```java
static int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { count++; sink(grid, r, c); }
    return count;
}

private static void sink(char[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
    g[r][c] = '0';                                               // mark visited by overwriting
    sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
}
```

**O(rows × cols).** Mutating the input is a design choice: copy the grid or use a `visited` array if the input must stay intact. Recursive DFS can overflow the stack on huge grids (use BFS with a queue or an explicit stack). Tested on a 4×5 grid with 3 islands.

## 11. Coin Change (dynamic programming)

Fewest coins to make `amount`.

```java
static int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);                                 // "infinity": more coins than could ever be needed
    dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int coin : coins)
            if (coin <= a) dp[a] = Math.min(dp[a], dp[a - coin] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}
```

**O(amount × coins), O(amount).** `dp[a]` = best for amount `a`. Greedy fails for general coin sets (coins `{1,3,4}`, amount 6 needs 2 coins as 3+3, greedy picks 4+1+1 = 3). Tested: `[1,2,5], 11 → 3`; `[2], 3 → -1`; amount 0 → 0. Recognise DP when the problem has **optimal substructure and overlapping subproblems**.

## 12. Longest Palindromic Substring (expand around centre)

```java
static String longestPalindrome(String s) {
    int start = 0, end = 0;
    for (int i = 0; i < s.length(); i++) {
        int len = Math.max(expand(s, i, i), expand(s, i, i + 1));    // odd and even length centres
        if (len > end - start) { start = i - (len - 1) / 2; end = i + len / 2; }
    }
    return s.substring(start, end + 1);
}

private static int expand(String s, int l, int r) {
    while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) { l--; r++; }
    return r - l - 1;
}
```

**O(n²), O(1) space.** Simple and fast in practice; Manacher's algorithm gives O(n) if required. Tested: `"babad"` (length 3), `"cbbd" → "bb"`.

## 13. Min Stack (O(1) minimum)

```java
static final class MinStack {
    private final Deque<int[]> stack = new ArrayDeque<>();           // {value, minimum so far}
    void push(int x) { stack.push(new int[]{x, stack.isEmpty() ? x : Math.min(x, stack.peek()[1])}); }
    int pop() { return stack.pop()[0]; }
    int min() { return stack.peek()[1]; }
}
```

Each entry remembers the minimum **at the time it was pushed**, so popping restores the previous minimum automatically (tested including duplicate minimums). O(1) per operation, O(n) space.

## 14. Concurrency: print odd and even numbers with two threads

```java
static void printer(Object lock, int[] next, int max, boolean oddTurn, List<Integer> out) {
    synchronized (lock) {
        while (next[0] <= max) {
            if ((next[0] % 2 == 1) == oddTurn) { out.add(next[0]++); lock.notifyAll(); }
            else {
                try { lock.wait(); }                              // wait in a loop: re-check the condition
                catch (InterruptedException e) { Thread.currentThread().interrupt(); return; }
            }
        }
        lock.notifyAll();                                        // wake the other thread so it can exit
    }
}
// start one thread with oddTurn = true and one with false; join both
```

Key points: `wait` inside a `while` loop (spurious wakeups), `notifyAll`, holding the monitor, restoring the interrupt flag, waking the partner at the end so neither thread hangs ([synchronization](../java/concurrency-jvm/synchronization-and-locks.md)). Tested: output `1..10` in order. Alternatives: `Semaphore` pair, `ReentrantLock` with two `Condition`s, `Exchanger`.

## 15. Concurrency: producer-consumer with `BlockingQueue`

```java
static int produceConsume(int items) throws Exception {
    BlockingQueue<Integer> q = new ArrayBlockingQueue<>(10);           // bounded: gives back-pressure
    final int POISON = -1;                                              // sentinel to stop the consumer
    AtomicInteger sum = new AtomicInteger();
    Thread consumer = new Thread(() -> {
        try { for (int v; (v = q.take()) != POISON; ) sum.addAndGet(v); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    });
    consumer.start();
    for (int i = 1; i <= items; i++) q.put(i);                         // blocks when the queue is full
    q.put(POISON);
    consumer.join();
    return sum.get();                                                   // 500500 for 1000 items (tested)
}
```

With several consumers, send one poison pill **per consumer**. Always use a **bounded** queue ([Executors](../java/concurrency-jvm/executors.md)).

## 16. Streams: the usual suspects

```java
record Employee(String name, String dept, double salary) { }

// Second highest distinct salary
Optional<Double> second = emps.stream().map(Employee::salary).distinct()
        .sorted(Comparator.reverseOrder()).skip(1).findFirst();

// Average salary per department
Map<String, Double> avg = emps.stream()
        .collect(Collectors.groupingBy(Employee::dept, Collectors.averagingDouble(Employee::salary)));

// Highest paid employee per department
Map<String, Employee> top = emps.stream()
        .collect(Collectors.toMap(Employee::dept, e -> e,
                 BinaryOperator.maxBy(Comparator.comparingDouble(Employee::salary))));   // import java.util.function.BinaryOperator

// Top 2 most frequent words (ties broken alphabetically)
List<String> top2 = Arrays.stream(text.split("\\s+"))
        .collect(Collectors.groupingBy(w -> w, Collectors.counting()))
        .entrySet().stream()
        .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
        .limit(2).map(Map.Entry::getKey).toList();

// First non-repeating character (LinkedHashMap preserves encounter order)
Optional<Character> firstUnique = "swiss".chars().mapToObj(ch -> (char) ch)
        .collect(Collectors.groupingBy(ch -> ch, LinkedHashMap::new, Collectors.counting()))
        .entrySet().stream().filter(e -> e.getValue() == 1).map(Map.Entry::getKey).findFirst();   // 'w'
```

All tested. Mention that `toMap` needs a merge function for duplicate keys ([Streams](../java/core-java/streams-and-lambdas.md)).

## How to practise

1. Do problems **by pattern**, not randomly: five sliding-window problems in a row teach the pattern.
2. **Talk while coding**; practise explaining complexity and trade-offs aloud.
3. After solving, ask: can I do it in less space/time? what breaks on empty/huge input?
4. For Java specifics know `Deque`/`ArrayDeque`, `PriorityQueue` with comparators, `Arrays.sort` with lambdas, `StringBuilder`, `Integer.compare` (never subtract), `Math.floorMod`, integer overflow (`long`, `Math.addExact`).
5. Re-solve problems you failed a week later.

## Common interview questions about coding rounds

**1. How do you approach an unfamiliar problem?**
Restate it, clarify constraints, try a brute force, find the bottleneck, map to a pattern (hashing, two pointers, heap, DP), then optimise and test.

**2. How do you pick between a heap and sorting for top-K?**
A size-K heap is O(n log k) and streams data; sorting is O(n log n). Use quickselect for O(n) average when you can mutate the array.

**3. How do you detect that a problem needs dynamic programming?**
Choices at each step, optimal substructure, repeated subproblems; try recursion with memoisation first, then convert to a table.

**4. What edge cases do you always check?**
Empty/null input, single element, duplicates, negative numbers, very large values (overflow), sorted or reverse-sorted data.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Which structure gives O(1) average lookups in Two Sum?",
    "options": [
      "A hash map of seen values",
      "A sorted list searched linearly",
      "A linked list",
      "A stack"
    ],
    "answer": 0,
    "why": "For each number check whether target minus number was already seen."
  },
  {
    "q": "Which structure checks balanced brackets?",
    "options": [
      "A queue",
      "A stack",
      "A hash set",
      "A heap"
    ],
    "answer": 1,
    "why": "Push openers; pop and match on each closer."
  },
  {
    "q": "Which two structures give an O(1) LRU cache?",
    "options": [
      "An array and a stack",
      "Two queues",
      "A hash map and a doubly linked list",
      "A tree and a set"
    ],
    "answer": 2,
    "why": "The map finds nodes; the list orders them by recency."
  }
]} />

## Key takeaways

- Learn the ~12 patterns; most problems are variations.
- State complexity and handle edge cases explicitly; show tests.
- For concurrency problems, justify wait/notify, bounded queues and shutdown handling.
- Prefer clear code first, optimise with evidence.
