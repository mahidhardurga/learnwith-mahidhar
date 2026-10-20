---
title: "LLM Pricing, Credits and Cost Control"
sidebar_label: "Credits, pricing and cost"
description: How LLM APIs charge per token, what credits are, what drives your bill, and practical ways to control cost such as smaller models, caching, shorter prompts and budgets.
keywords: [llm pricing, llm cost, api credits, token pricing, prompt caching, reduce llm cost, ai budget, input and output tokens, cost control]
sidebar_position: 3
hide_table_of_contents: true
---

# LLM Pricing, Credits and Cost Control

<Outcomes items={[
  "Work out the cost of an LLM call from its token counts",
  "Explain what credits are and where cost really comes from",
  "Name practical ways to keep an AI feature affordable",
]} />

## How you are charged

Most LLM providers charge **per token**, quoted as a price per million tokens. Input and output have separate prices, and output usually costs more than input.

```text
cost of one call = input tokens x input price + output tokens x output price
```

Other things that often appear on a bill:

- **Cached input:** many providers charge less for a prompt prefix they have seen recently (prompt caching).
- **Reasoning tokens:** models that "think" before answering may bill their hidden thinking tokens as output.
- **Batch discounts:** requests that can wait (processed within hours) are often cheaper.
- **Other features:** images, audio, search tools or storing files can have their own prices.

Prices differ by provider and model and change often. Always read the current price page, and never hard-code a price in your design.

## What credits are

**Credits** are a prepaid balance. You add money, and every call spends from it. Some products also use "credits" as their own made-up unit (for example, one credit per task), so check how a provider defines them. Two practical points:

- When credits run out, calls fail until you top up, so set a low-balance alert.
- A credit is only a way of paying. What actually consumes it is tokens (or whatever unit that product uses).

## What drives your bill

| Driver | Why it matters |
| --- | --- |
| **Prompt size** | Every call pays for all input tokens, including instructions and retrieved documents. |
| **Number of calls** | Cost is per call, so traffic multiplies it. |
| **Output length** | Output tokens cost more and are slower. |
| **Model choice** | Larger models cost many times more per token than small ones. |
| **Chat history** | The whole history is resent, so cost grows with every turn. |
| **Agent loops** | An agent may call the model many times for one task. |
| **Retries** | A failed or repeated call pays again. |

## Example: estimate the cost

Prices below are examples only, not a real quote.

```java
public class CostDemo {

    record Usage(long inputTokens, long outputTokens) {}

    /** Prices are dollars per one million tokens. */
    record Price(double inputPerMillion, double outputPerMillion) {}

    static double cost(Usage usage, Price price) {
        return usage.inputTokens() / 1_000_000.0 * price.inputPerMillion()
             + usage.outputTokens() / 1_000_000.0 * price.outputPerMillion();
    }

    public static void main(String[] args) {
        Price price = new Price(3.00, 15.00);      // example prices, not a real quote
        Usage oneCall = new Usage(2_000, 500);

        double perCall = cost(oneCall, price);
        System.out.printf("one call: $%.4f%n", perCall);
        System.out.printf("100,000 calls a month: $%.2f%n", perCall * 100_000);

        // The same call, but the prompt grows to 20,000 tokens (more context, more cost)
        Usage bigPrompt = new Usage(20_000, 500);
        System.out.printf("one call with a 20,000 token prompt: $%.4f%n", cost(bigPrompt, price));
    }
}
```

Output (tested):

```text
one call: $0.0135
100,000 calls a month: $1350.00
one call with a 20,000 token prompt: $0.0675
```

A fraction of a cent per call becomes a real bill at scale, and a bigger prompt makes each call five times more expensive.

## Ways to control cost

1. **Use the smallest model that does the job.** Send easy tasks to a cheap model and only hard ones to a large model (routing).
2. **Shorten prompts.** Remove unused instructions, retrieve fewer chunks, trim or summarise history.
3. **Cap the output** with a max token limit, and ask for short answers when that is enough.
4. **Use prompt caching.** Put the stable part (instructions, tool definitions) first so it can be cached.
5. **Cache answers** for repeated questions in your own application.
6. **Batch** work that does not need an instant answer.
7. **Set limits:** a budget per user, per day and per feature, plus alerts.
8. **Measure.** Log input and output tokens and the cost for every call, so you see where money goes.

## System design considerations

- **Track usage per user and feature.** Without it, one heavy user or one buggy loop can empty your credits.
- **Put hard caps on agents:** a maximum number of steps and a maximum token budget per task.
- **Plan for failure of billing:** a depleted balance or a rate limit should show a clear message, not a crash.
- **Estimate before you build.** Multiply tokens per call by expected calls to see the monthly cost early.

## Common interview questions

**1. How are LLM APIs priced?**
Per token, usually as a price per million tokens, with different prices for input and output. Output tokens generally cost more.

**2. What are credits?**
A prepaid balance that is spent as you use the API or product. They are a payment method, and tokens are what actually use them up.

**3. Why does the cost of a chat grow with every message?**
The whole history is sent again on each turn, so the number of input tokens keeps growing.

**4. How would you cut the cost of an AI feature by half?**
Measure first, then: use a smaller model for easy requests, shorten prompts, trim history, cap output length, use prompt caching, and cache repeated answers.

**5. What is prompt caching?**
The provider reuses the work for a prompt prefix it has seen recently and charges less for it. It works best when the stable part of the prompt comes first.

**6. How do you stop an agent from costing too much?**
Limit the number of steps and tokens per task, set a budget per user, alert on unusual usage, and stop with a clear message when a limit is hit.

## Pitfalls

- Looking at the price per token and ignoring how many tokens each call really uses.
- Sending the full history and every document on every call.
- Using the largest model for everything.
- No usage logging, so you cannot explain the bill.
- No caps on agent loops or on spending per user.

## Check yourself

<Checkpoint questions={[
  {
    q: "A call uses 2,000 input tokens at $3 per million and 500 output tokens at $15 per million. What is the cost?",
    options: ["$0.0135", "$0.135", "$1.35", "$0.00135"],
    answer: 0,
    why: "Input: 2,000 / 1,000,000 x 3 = $0.006. Output: 500 / 1,000,000 x 15 = $0.0075. Total $0.0135.",
  },
  {
    q: "Which change reduces cost the most for a simple question-answering feature?",
    options: ["Using the largest model for everything", "Routing easy questions to a smaller model and trimming the prompt", "Increasing max output tokens", "Resending the full history every time"],
    answer: 1,
    why: "A smaller model costs less per token and a shorter prompt means fewer tokens per call.",
  },
  {
    q: "What do credits actually pay for?",
    options: ["A monthly licence to the model", "The tokens (or product units) you use", "Access to the context window", "Faster response time only"],
    answer: 1,
    why: "Credits are a prepaid balance. Usage, normally measured in tokens, is what spends them.",
  },
]} />

## Key takeaways

- Cost per call is input tokens times the input price plus output tokens times the output price.
- Credits are a prepaid balance, and tokens are what spend them.
- Prompt size, call volume, model size, chat history and agent loops drive the bill.
- Use small models where possible, trim prompts, cap output, cache, and set budgets.
- Log tokens and cost for every call.
