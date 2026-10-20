---
title: "Fine-Tuning and Choosing the Right LLM"
sidebar_label: "Fine-tuning and model choice"
description: What fine-tuning is and when it is worth it compared with prompting and RAG, what distillation and LoRA mean, how reasoning models differ, and how to choose and route between models by quality, cost and speed.
keywords: [fine-tuning llm, lora, distillation, choosing an llm, reasoning models, model routing, open weight models, prompt vs rag vs fine-tuning, small language models]
sidebar_position: 4
hide_table_of_contents: true
---

# Fine-Tuning and Choosing the Right LLM

<Outcomes items={[
  "Explain fine-tuning and say when prompting or RAG is the better first step",
  "Describe LoRA, distillation and reasoning models in one sentence each",
  "Choose a model by testing it on your task, and route easy requests to cheaper models",
]} />

## What fine-tuning is

**Fine-tuning** means continuing to train an existing model on your own examples, so it changes how it behaves. It is good for teaching a **style, format or narrow skill**, for example "always answer in this JSON shape" or "write in our brand voice". It is a poor way to teach **facts**, because facts change and a trained model cannot easily be corrected.

Related terms:

- **Parameter-efficient tuning (LoRA):** instead of changing all the model's weights, you train a small add-on. It is much cheaper and the add-on can be swapped.
- **Distillation:** train a small model to imitate a large one on your task, to get similar quality at a lower cost per call.
- **Open-weight model:** a model whose weights you can download and run yourself, as opposed to one you only reach through a provider's API.

## Prompt, RAG or fine-tune?

Try them in this order, and move on only when the cheaper step is not enough.

| Step | Use it when | Cost to change |
| --- | --- | --- |
| **1. Better prompt** | The model can do the task but is inconsistent or uses the wrong format. | Minutes. |
| **2. RAG** | The model lacks your facts or they change often. | Hours to days. |
| **3. Fine-tuning** | You need a consistent style, format or narrow skill that prompts cannot reach, or a small model must match a large one. | Days to weeks, and again for every new base model. |

Fine-tuning needs good training examples (often hundreds to thousands), an evaluation set to prove it helped, and a plan to redo it when a better base model appears. Poor examples teach poor behaviour.

## Reasoning models

A **reasoning model** spends extra tokens "thinking" before it answers. It is usually better at multi-step problems such as maths, planning and debugging code, but slower and more expensive per answer, because the thinking tokens are billed. For simple tasks such as classification or extraction, a normal model is usually enough and cheaper.

## How to choose a model

Do not choose by name or by a leaderboard alone. Choose by testing candidates on **your own examples** (see [Evals and testing](../production/evals-and-testing.md)).

| Factor | Question to ask |
| --- | --- |
| **Quality** | How many of my test cases does it get right? |
| **Cost** | What is the cost per call at my prompt sizes? |
| **Speed** | Is the delay acceptable for the user, including time to first token? |
| **Context window** | Does my longest realistic input fit? |
| **Features** | Does it support tool calling and structured output reliably? |
| **Data rules** | Can the data go to this provider, in this region, and how long is it kept? |
| **Control** | Do I need to self-host (open-weight) for privacy, cost at scale or offline use? |

A practical method: start with a strong model to find the best result you can get, then try smaller models and keep the cheapest one that still passes your tests.

## Example: route easy requests to a cheaper model

A router sends simple requests to a small model and hard ones to a large model. The prices are examples only.

```java
public class RouterDemo {

    record Model(String name, double inputPerMillion, double outputPerMillion) {
        double cost(int in, int out) {
            return in / 1_000_000.0 * inputPerMillion + out / 1_000_000.0 * outputPerMillion;
        }
    }

    // Example prices in dollars per million tokens, not real quotes.
    static final Model SMALL = new Model("small", 0.25, 1.25);
    static final Model LARGE = new Model("large", 3.00, 15.00);

    /** Send easy requests to the cheap model and keep the large one for hard requests. */
    static Model route(String request) {
        boolean hard = request.length() > 300 || request.contains("analyse") || request.contains("step by step");
        return hard ? LARGE : SMALL;
    }

    public static void main(String[] args) {
        int in = 1_500, out = 300;

        double allLarge = 100_000 * LARGE.cost(in, out);
        // Suppose 80% of traffic is easy and 20% is hard.
        double routed = 80_000 * SMALL.cost(in, out) + 20_000 * LARGE.cost(in, out);

        System.out.println(route("What are your opening hours?").name());
        System.out.println(route("Please analyse this contract step by step").name());
        System.out.printf("100,000 calls, all on the large model: $%.2f%n", allLarge);
        System.out.printf("100,000 calls, 80%% routed to the small model: $%.2f%n", routed);
    }
}
```

Output (tested):

```text
small
large
100,000 calls, all on the large model: $900.00
100,000 calls, 80% routed to the small model: $240.00
```

If four out of five requests really are easy, routing cuts this example bill from $900 to $240. The risk is a wrong route, so measure quality on both paths.

## System design considerations

- **Put the model behind your own interface.** Then you can change model or provider without touching business code.
- **Plan for model changes.** Providers retire and update models, and behaviour shifts. Keep an evaluation set and re-run it before switching.
- **Route by difficulty, with a fallback.** If the small model is unsure or fails a check, retry on the larger one.
- **Keep fine-tuning data clean and private.** Remove personal data, record where examples came from, and keep a held-out test set.
- **Know your exit.** If you depend on one provider's tuned model, you cannot move easily. Prefer prompts and RAG where they are enough.

## Common interview questions

**1. What is fine-tuning, and when would you use it?**
Continuing to train a model on your examples to change its behaviour, style or format. Use it when prompting and RAG are not enough, not for adding changing facts.

**2. Prompting, RAG or fine-tuning?**
Prompting first for behaviour and format. RAG for private or changing knowledge. Fine-tuning for a consistent style or a narrow skill, or to make a small model match a large one.

**3. What is LoRA?**
A parameter-efficient method: you train a small set of extra weights instead of the whole model, which is cheaper and keeps the base model unchanged.

**4. What is distillation?**
Training a smaller model to copy the outputs of a larger one on a task, to get similar quality at lower cost and delay.

**5. When is a reasoning model worth it?**
For multi-step problems where accuracy matters more than speed and cost. For simple tasks a standard model is cheaper and fast enough.

**6. How do you pick between two models?**
Run both on a fixed set of your own test cases, compare quality, cost and latency, and choose the cheapest model that meets your quality bar.

## Pitfalls

- Fine-tuning to teach facts that will change.
- Fine-tuning before trying a better prompt or RAG.
- Choosing a model from a benchmark without testing your own task.
- No evaluation set, so nobody knows whether the tuned model is better.
- Locking the whole application to one provider's model name.

## Check yourself

<Checkpoint questions={[
  {
    q: "Your support bot must answer from policies that change every month. What should you use?",
    options: ["Fine-tune the model each month", "RAG over the policy documents", "A reasoning model", "A longer temperature"],
    answer: 1,
    why: "RAG supplies current facts at question time. Fine-tuning is poor for facts that change.",
  },
  {
    q: "Which is the best way to pick a model for your feature?",
    options: ["Take the one at the top of a leaderboard", "Test candidates on your own examples and compare quality, cost and speed", "Always use the largest model", "Use the newest release"],
    answer: 1,
    why: "Only your own test cases show how a model behaves on your task and at your prompt sizes.",
  },
  {
    q: "What does LoRA let you do?",
    options: ["Retrain every weight cheaply", "Train a small add-on instead of the whole model", "Remove the context window", "Skip evaluation"],
    answer: 1,
    why: "LoRA trains a small set of extra weights, so tuning is cheaper and the base model stays the same.",
  },
]} />

## Key takeaways

- Try a better prompt first, then RAG, then fine-tuning.
- Fine-tuning changes behaviour, style and format. It is a poor way to teach changing facts.
- Reasoning models think before answering: better for hard problems, slower and costlier.
- Choose models by testing on your own examples, and keep the cheapest one that passes.
- Route easy requests to small models, and keep model names behind your own interface.
