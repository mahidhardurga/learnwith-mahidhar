---
title: "LLM Observability, Latency and Caching"
sidebar_label: "Observability, latency and caching"
description: What to log and trace for every LLM call, how to cut latency with streaming and smaller prompts, how exact, semantic and provider caching work, and how to handle rate limits, timeouts and retries.
keywords: [llm observability, llm latency, time to first token, llm caching, semantic cache, prompt caching, rate limit 429, retry backoff, llm monitoring, token usage logging]
sidebar_position: 2
hide_table_of_contents: true
---

# Observability, Latency and Caching

<Outcomes items={[
  "List what to record for every model call and why",
  "Reduce perceived and real latency with streaming, shorter prompts and caching",
  "Handle rate limits, timeouts and failures without making things worse",
]} />

## What to record for every call

When an answer is wrong or slow, you need to see exactly what happened. Record these for every model call:

| Field | Why |
| --- | --- |
| **Trace id** | Ties the call to the user request and to the other steps (tools, retrieval). |
| **Model and settings** | Name, temperature, max tokens. Behaviour changes with them. |
| **Prompt version** | Which prompt template produced this call. |
| **Input and output tokens** | For cost and for spotting growing prompts. |
| **Latency** | Total time, and time to the first token when streaming. |
| **Cost** | Calculated from tokens and the price in effect. |
| **Outcome** | Success, error, blocked by a guardrail, retried, served from cache. |
| **Tool calls** | Name, arguments, result and time for each step of an agent. |

Be careful with the **text** of prompts and answers: they can hold personal data. Decide what you store, mask what you must, and set a retention period.

Alert on **symptoms users feel**: error rate, slow answers, cost per user and per day, and sudden growth in tokens per call.

## Latency

LLM calls are slow compared with most APIs, because each output token is produced one after another. Two numbers matter: **time to first token** (how soon something appears) and **total time**.

Ways to improve it:

- **Stream the answer** so users see text as it is produced. Total time is the same, but it feels much faster.
- **Shorten the prompt.** Less input is processed faster and costs less.
- **Limit the output length** and ask for short answers when that is enough.
- **Use a smaller model** for simple requests (see [model choice](../foundations/fine-tuning-and-model-choice.md)).
- **Run independent calls in parallel,** such as retrieval and a permissions check.
- **Cache** repeated work (below).

## Caching

| Cache | How it works | Watch out for |
| --- | --- | --- |
| **Exact-match** | Same prompt, same stored answer. | Only helps when prompts repeat exactly. Include the model and settings in the key. |
| **Semantic** | A similar question returns a stored answer, found by embeddings. | Similar is not the same. A wrong hit gives a confident wrong answer, so set a strict threshold. |
| **Provider prompt caching** | The provider reuses work on a repeated prompt start and charges less. | Put the stable part first, and the changing part last. |

Never cache answers that depend on the user's permissions or private data without including the user or tenant in the cache key.

## Example: a cache that also records usage

This wrapper serves repeated prompts from memory and counts what the real calls used. The model is a stand-in. The milliseconds will vary on your machine.

```java
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class CacheDemo {

    interface Model {
        Answer reply(String prompt);
    }

    record Answer(String text, int inputTokens, int outputTokens) {}

    /** Wraps a model with an exact-match cache and records what each call used. */
    static class ObservedModel implements Model {
        private final Model delegate;
        private final Map<String, Answer> cache = new ConcurrentHashMap<>();
        int calls, hits, inputTokens, outputTokens;

        ObservedModel(Model delegate) { this.delegate = delegate; }

        @Override
        public Answer reply(String prompt) {
            calls++;
            Answer cached = cache.get(prompt);
            if (cached != null) {
                hits++;
                return cached;                                   // no model call, no cost
            }
            long start = System.nanoTime();
            Answer answer = delegate.reply(prompt);
            long millis = (System.nanoTime() - start) / 1_000_000;
            inputTokens += answer.inputTokens();
            outputTokens += answer.outputTokens();
            System.out.println("model call: " + answer.inputTokens() + " in, " + answer.outputTokens() + " out, " + millis + " ms");
            cache.put(prompt, answer);
            return answer;
        }
    }

    public static void main(String[] args) {
        Model fake = prompt -> new Answer("Refunds within 30 days.", prompt.length() / 4, 20);
        ObservedModel model = new ObservedModel(fake);

        model.reply("What is the refund policy?");
        model.reply("What is the refund policy?");     // same question: served from the cache
        model.reply("How long does shipping take?");

        System.out.println("calls: " + model.calls + ", cache hits: " + model.hits
                + ", tokens paid for: " + (model.inputTokens + model.outputTokens));
    }
}
```

Output (tested; the timing numbers vary):

```text
model call: 6 in, 20 out, 0 ms
model call: 7 in, 20 out, 0 ms
calls: 3, cache hits: 1, tokens paid for: 53
```

Three requests, but only two model calls: the repeated question cost nothing.

## Rate limits, timeouts and retries

- **Rate limits.** Providers limit requests and tokens per minute. When you exceed them you get an error (often HTTP 429). Track your own usage and queue work instead of hammering the API.
- **Timeouts.** Set a timeout on every call. A model call can hang, and a stuck call holds your threads.
- **Retries.** Retry **transient** errors (429, 5xx, timeouts) with exponential backoff and a little randomness, and a maximum number of attempts. Do not retry invalid requests.
- **Fallbacks.** If the main model is down, switch to a backup model, a cached answer or a plain message.
- **Circuit breaker.** After repeated failures, stop calling for a while instead of piling on (see [Resilience4j](../../microservices/resilience/resilience4j.md)).

## System design considerations

- **Put one gateway in front of all model calls.** It adds logging, caching, rate limits, retries, budgets and model routing in one place.
- **Track cost per user, feature and prompt version,** so a heavy user or a buggy loop is visible within minutes.
- **Set budgets and alerts.** Cap spend per day and per user, and warn before the limit.
- **Use trace ids across steps** so a slow multi-step answer can be broken down by step.
- **Plan for provider outages.** Test your fallback, because it is rarely exercised.

## Common interview questions

**1. What would you log for an LLM call?**
Trace id, model and settings, prompt version, input and output tokens, latency, cost, outcome, and any tool calls, with care for personal data in the text.

**2. How do you make an LLM feature feel faster?**
Stream the response, shorten the prompt, limit the output, use a smaller model where possible, run independent calls in parallel and cache repeated work.

**3. What are the types of caching for LLMs?**
Exact-match caching in your application, semantic caching by embedding similarity, and the provider's prompt caching for a stable prompt prefix.

**4. What is the risk of semantic caching?**
A similar but different question can return a wrong stored answer. Use a strict similarity threshold and never share cached answers across users with different permissions.

**5. How should you handle rate limit errors?**
Retry with exponential backoff and jitter, up to a limit, track your own usage to avoid hitting limits, and queue or fall back when needed.

**6. What is a model gateway?**
A single layer through which all model calls pass, handling logging, caching, limits, retries, budgets and routing.

## Pitfalls

- No token and cost logging, so the bill is a surprise.
- Logging full prompts with personal data and keeping them forever.
- No timeout on model calls.
- Retrying invalid requests, or retrying without backoff.
- Semantic caching with a loose threshold.
- Caching answers that depend on a user's permissions without the user in the key.

## Check yourself

<Checkpoint questions={[
  {
    q: "Which change makes users feel an answer arrives sooner, without changing total time?",
    options: ["A larger context window", "Streaming the response", "A higher temperature", "A longer prompt"],
    answer: 1,
    why: "Streaming shows text as it is produced, so the time to the first token is short.",
  },
  {
    q: "Why must a cache key include the user or tenant for private answers?",
    options: ["To make keys longer", "So one user cannot receive an answer built from another user's data", "Because models require it", "To increase cache hits"],
    answer: 1,
    why: "Without the user in the key, a stored answer based on private data could be served to someone else.",
  },
  {
    q: "A model call returns HTTP 429. What is the right reaction?",
    options: ["Retry immediately in a tight loop", "Retry with exponential backoff and jitter, up to a limit", "Ignore the error", "Switch off logging"],
    answer: 1,
    why: "429 means you are sending too fast. Back off, add randomness and cap the number of attempts.",
  },
]} />

## Key takeaways

- Record trace id, model, prompt version, tokens, latency, cost, outcome and tool calls for every call.
- Streaming, shorter prompts, smaller models, parallel calls and caching reduce latency.
- Exact, semantic and provider caches each have different risks. Never cache private answers without the user in the key.
- Set timeouts, retry transient errors with backoff and have a fallback.
- Put a gateway in front of model calls and track cost per user and feature.
