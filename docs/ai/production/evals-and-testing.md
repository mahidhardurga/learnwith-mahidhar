---
title: "Evals: How to Test LLM Applications"
sidebar_label: "Evals and testing"
description: How to test LLM features that give different answers each time - building an evaluation set, exact checks, model-as-judge, human review, regression gates in CI, and evaluating RAG and agents.
keywords: [llm evals, evaluating llm applications, test llm, llm as a judge, evaluation dataset, regression testing prompts, rag evaluation, agent evaluation, ai testing]
sidebar_position: 1
---

# Evals: Testing LLM Applications

<Outcomes items={[
  "Explain why LLM features need evals and not only unit tests",
  "Build an evaluation set and choose how to score answers",
  "Use evals as a gate so a change cannot silently make things worse",
]} />

## Why normal tests are not enough

A unit test expects the same input to give the same output. A model gives different wording each time, and a small change to a prompt, a model version or a retrieved document can shift results across many cases. You cannot see that by trying a couple of examples. You need to run **many realistic cases** and measure. That practice is called **evals** (evaluations).

## The evaluation set

An **evaluation set** is a list of inputs, each with what a good answer looks like.

- Take **real examples**: real user questions, tickets and documents.
- Include **hard and edge cases** and past failures, not only easy ones.
- Include **attacks and refusals**: cases where the right behaviour is to say no.
- Start small (tens of cases) and grow it every time you find a bug.
- Keep a **held-out part** you do not tune against, so you can see real progress.

## How to score an answer

| Method | How it works | Best for |
| --- | --- | --- |
| **Exact check** | Compare to the expected value, or check format and rules in code. | Labels, extraction, JSON shape. Cheap and reliable. |
| **Reference-based** | Compare to a reference answer (similar facts, key points present). | Question answering with known answers. |
| **Model as judge** | A second model grades the answer against a written rubric. | Open-ended text. Check it against human ratings first. |
| **Human review** | People rate a sample. | The final word on quality, and for calibrating the judge. |
| **Online signals** | Thumbs up or down, task success, escalations. | Real-world quality after release. |

Prefer exact checks wherever you can, and use a judge model only where you must.

## What to evaluate in common designs

- **Plain prompt:** the correct label or fact, valid format, refusal when appropriate.
- **RAG:** retrieval (is the right chunk in the top results?) and generation (is the answer supported by the chunks and does it address the question?). Test them separately (see [RAG](../retrieval/rag.md)).
- **Agent:** the final result, and the path: the right tools, the number of steps and the cost (see [AI agents](../agents/ai-agents.md)).

## Example: compare two prompt versions

Both versions run on the same test cases. The second fixes the cases the first missed, and the run fails if accuracy is below a bar. The classifiers are stand-ins for "prompt plus model".

```java
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

public class EvalDemo {

    record Case(String input, String expected) {}

    record Report(double accuracy, List<String> failures) {}

    /** Run a classifier (here a stand-in for "prompt + model") over every test case. */
    static Report evaluate(Function<String, String> classifier, List<Case> cases) {
        int correct = 0;
        List<String> failures = new ArrayList<>();
        for (Case c : cases) {
            String actual = classifier.apply(c.input());
            if (actual.equals(c.expected())) {
                correct++;
            } else {
                failures.add(c.input() + " -> got " + actual + ", expected " + c.expected());
            }
        }
        return new Report((double) correct / cases.size(), failures);
    }

    public static void main(String[] args) {
        List<Case> cases = List.of(
                new Case("charged twice this month", "BILLING"),
                new Case("invoice has the wrong name", "BILLING"),
                new Case("app crashes on start", "TECHNICAL"),
                new Case("cannot log in", "TECHNICAL"),
                new Case("do you have a dark mode", "OTHER"));

        // Two "prompt versions". The second one also knows about login problems.
        Function<String, String> promptV1 = t -> t.contains("charged") ? "BILLING" : t.contains("crash") ? "TECHNICAL" : "OTHER";
        Function<String, String> promptV2 = t -> t.contains("charged") || t.contains("invoice") ? "BILLING"
                : t.contains("crash") || t.contains("log in") ? "TECHNICAL" : "OTHER";

        double bar = 0.8;
        for (var entry : List.of(Map.entry("v1", promptV1), Map.entry("v2", promptV2))) {
            Report r = evaluate(entry.getValue(), cases);
            System.out.printf("%s: accuracy %.0f%%  %s%n", entry.getKey(), r.accuracy() * 100, r.accuracy() >= bar ? "PASS" : "FAIL");
            r.failures().forEach(f -> System.out.println("   miss: " + f));
        }
    }
}
```

Output (tested):

```text
v1: accuracy 60%  FAIL
   miss: invoice has the wrong name -> got OTHER, expected BILLING
   miss: cannot log in -> got OTHER, expected TECHNICAL
v2: accuracy 100%  PASS
```

The report names the failing cases, so you know what to fix. In a real project this check runs in your build, and a change that drops below the bar does not ship.

## System design considerations

- **Run evals in CI,** and before changing a prompt, model or retrieval setting. Treat a drop as a failing build.
- **Version everything:** prompt, model name, settings and evaluation set, so results can be compared.
- **Watch cost and time.** Evals call a model many times. Run a small fast set on every change and the full set on a schedule.
- **Allow for randomness.** For borderline cases, run several times, or use a low temperature, and look at pass rates instead of single results.
- **Calibrate model judges.** Compare the judge's scores with human ratings on a sample before trusting it, and do not let a model grade its own output with the same prompt that produced it.
- **Feed production back.** Add real failures, thumbs-down answers and escalations to the evaluation set.

## Common interview questions

**1. What are evals?**
Repeatable tests that run an LLM feature over many realistic cases and score the results, so you can measure quality and catch regressions.

**2. Why can't normal unit tests cover LLM features?**
Outputs vary in wording, and small changes shift results across many cases. You need many cases and a measure of the overall pass rate.

**3. How do you build an evaluation set?**
Collect real inputs, add hard cases, past failures and adversarial cases, define what a good answer is for each, and keep a held-out portion.

**4. What is model-as-judge?**
Using one model to grade another's answers against a rubric. It scales well for open text, but must be calibrated against human ratings.

**5. How do you evaluate a RAG system?**
Evaluate retrieval (is the right chunk found?) and generation (is the answer grounded in the chunks and relevant?) separately, using questions with known answers.

**6. How do evals fit into releases?**
Run a fast set on every change in CI with a pass threshold, a larger set on a schedule, and add production failures to the set.

## Pitfalls

- Judging a change from two or three examples.
- An evaluation set of only easy cases.
- Tuning on the same cases you use to measure.
- Trusting a model judge without checking it against humans.
- No version of the prompt and model next to the results.
- Never adding real failures to the set.

## Check yourself

<Checkpoint questions={[
  {
    q: "Why are evals needed for LLM features?",
    options: ["Models give identical output every time", "Outputs vary and small changes shift results across many cases, so you must measure", "They replace the need for a model", "They make the model faster"],
    answer: 1,
    why: "Variation and wide effects mean a few examples prove little. You need many cases and an overall measure.",
  },
  {
    q: "Which scoring method is cheapest and most reliable for a classification label?",
    options: ["Model as judge", "An exact check against the expected label", "Human review of every case", "Online thumbs up"],
    answer: 1,
    why: "When the right answer is known, compare in code. Use judges only where an exact check is impossible.",
  },
  {
    q: "What should happen when a prompt change drops accuracy below the agreed bar?",
    options: ["Ship it anyway", "The check fails and the change is not released until fixed", "Lower the bar silently", "Raise the temperature"],
    answer: 1,
    why: "Evals act as a gate, like failing tests: a regression should block the release.",
  },
]} />

## Key takeaways

- Evals run many realistic cases and score them, because one-off tries prove little.
- Build the set from real, hard and adversarial cases, and keep a held-out part.
- Prefer exact checks, and calibrate any model judge against humans.
- Evaluate RAG retrieval and generation separately, and agents by result and path.
- Run evals in CI as a gate, and feed production failures back into the set.
