---
title: "Spring AI and LangChain4j: LLMs in Java"
sidebar_label: "Spring AI and LangChain4j"
description: How to call LLMs, parse structured output, add tools and do RAG from Java using Spring AI and LangChain4j, with code compiled against the real libraries, and how to choose between them.
keywords: [spring ai, langchain4j, java llm, spring ai chatclient, spring ai tools, spring ai rag, langchain4j aiservices, java ai framework, spring boot ai, vector store spring ai]
sidebar_position: 3
hide_table_of_contents: true
---

# Spring AI and LangChain4j

<Outcomes items={[
  "Call a model from Java and read the reply as text or as a record",
  "Add a tool and a RAG step with Spring AI, and use AiServices in LangChain4j",
  "Choose between the two libraries for a project",
]} />

## Why use a library

You can call a model's HTTP API yourself, but you would then write the same code again and again: sending messages, parsing replies, describing tools, running the tool loop, storing vectors, retrying. Two Java libraries do this for you.

| | Spring AI | LangChain4j |
| --- | --- | --- |
| **Style** | Spring-style: auto-configuration, properties, beans. A fluent `ChatClient`. | Plain Java: you describe an interface and `AiServices` implements it. |
| **Fits best** | Spring Boot applications. | Any Java application (Spring Boot, Quarkus or plain Java). |
| **Models** | Many providers behind one interface. | Many providers behind one interface. |
| **Tools** | `@Tool` methods. | `@Tool` methods. |
| **RAG** | `VectorStore` and advisors such as `QuestionAnswerAdvisor`. | Retrievers, embedding stores and content injection. |
| **Also** | Chat memory, observability through Micrometer, MCP client and server starters. | Chat memory, many embedding stores, MCP support. |

Both are young and change often, so always check the reference for the version you use.

## Spring AI

Add a starter for your provider (for example `spring-ai-starter-model-openai`) and set its key in properties. Boot then creates a `ChatClient.Builder` bean for you.

```properties
# application.properties (property names for the OpenAI starter)
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=${MODEL_NAME}
```

This code compiled against Spring AI **1.1.8** (with the `spring-ai-client-chat`, `spring-ai-vector-store` and `spring-ai-advisors-vector-store` modules). It was **not run against a live model**, because that needs an API key.

```java
import java.util.List;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.vectorstore.QuestionAnswerAdvisor;
import org.springframework.ai.document.Document;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.ai.vectorstore.VectorStore;

public class SupportService {

    record Ticket(String category, String summary) {}

    static class OrderTools {
        @Tool(description = "Look up the status of an order by its id")
        String orderStatus(@ToolParam(description = "The order id") String orderId) {
            return "Order " + orderId + " has shipped";
        }
    }

    private final ChatClient chat;
    private final VectorStore vectorStore;

    SupportService(ChatClient.Builder builder, VectorStore vectorStore) {
        this.chat = builder.defaultSystem("You sort and answer customer support questions.").build();
        this.vectorStore = vectorStore;
    }

    /** Plain text answer. */
    String ask(String question) {
        return chat.prompt().user(question).call().content();
    }

    /** The reply is parsed into a Java record. */
    Ticket classify(String text) {
        return chat.prompt().user(text).call().entity(Ticket.class);
    }

    /** The model may call orderStatus(...) while answering. */
    String withTools(String question) {
        return chat.prompt().user(question).tools(new OrderTools()).call().content();
    }

    /** RAG: relevant documents are retrieved from the vector store and added to the prompt. */
    String withDocuments(String question) {
        vectorStore.add(List.of(new Document("Refunds are possible within 30 days of purchase.")));
        return chat.prompt()
                .user(question)
                .advisors(QuestionAnswerAdvisor.builder(vectorStore).build())
                .call()
                .content();
    }
}
```

What each method shows:

- `ask` sends a question and returns plain text.
- `classify` uses `.entity(Ticket.class)`: the library asks the model for JSON in the shape of the record and parses the reply (see [Structured output](../prompting/structured-output-and-tool-calling.md)).
- `withTools` registers an object whose `@Tool` methods the model may call. The library runs the tool loop for you.
- `withDocuments` adds a `QuestionAnswerAdvisor`: for each question it searches the `VectorStore`, and adds the matching documents to the prompt. That is the RAG pipeline from the [RAG page](../retrieval/rag.md), mostly configured rather than written.

**Version note.** The chat, tool, structured-output and `VectorStore` code also compiled against Spring AI **2.0.1**. The vector-store advisor lives in a different module and package there, so check the reference for your version before copying the RAG part.

## LangChain4j

With LangChain4j you write an interface, and `AiServices` creates an implementation that talks to the model. Add `dev.langchain4j:langchain4j` and a provider module such as `langchain4j-open-ai`.

This code compiled against LangChain4j **1.22.0**. It was **not run against a live model**.

```java
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.SystemMessage;

public class SupportApp {

    record Ticket(String category, String summary) {}

    interface Assistant {
        @SystemMessage("You sort and answer customer support questions.")
        String ask(String question);

        Ticket classify(String text);          // the reply is parsed into a Java record
    }

    static class OrderTools {
        @Tool("Look up the status of an order by its id")
        String orderStatus(String orderId) {
            return "Order " + orderId + " has shipped";
        }
    }

    public static void main(String[] args) {
        ChatModel model = OpenAiChatModel.builder()
                .apiKey(System.getenv("OPENAI_API_KEY"))
                .modelName(System.getenv("MODEL_NAME"))
                .build();

        Assistant assistant = AiServices.builder(Assistant.class)
                .chatModel(model)
                .tools(new OrderTools())           // the model may call orderStatus(...)
                .build();

        System.out.println(assistant.ask("Where is order 42?"));
    }
}
```

- `@SystemMessage` sets the instructions for a method.
- A method that returns a record (`classify`) makes the library ask for, and parse, structured output.
- `.tools(new OrderTools())` registers `@Tool` methods that the model may call.
- The model is created from a builder. The model name comes from an environment variable here so the example does not name a specific model.

## Choosing

- **Spring Boot application:** start with Spring AI. Its starters, properties and Micrometer integration match how you already build services.
- **Not Spring, or you want a framework-neutral library:** LangChain4j.
- **Either way:** keep model calls behind your own interface (a small service class), so you can change the library or the provider later.

## System design considerations

- **Wrap the library.** Business code should depend on your own `SupportAssistant` interface, not on `ChatClient` or `AiServices` types.
- **Keys and settings from the environment,** never in source control.
- **Add your own limits.** Libraries run tool loops for you, so make sure a maximum number of steps, a timeout and a budget exist (see [AI agents](../agents/ai-agents.md)).
- **Observe every call.** Turn on the library's metrics and tracing, and log tokens and cost (see [Observability](observability-latency-caching.md)).
- **Test without a live model.** Put the model behind an interface so unit tests use a stub, and run a smaller set of real-model evals separately (see [Evals](evals-and-testing.md)).
- **Pin versions.** APIs change between releases, so upgrade on purpose and re-run your tests.

## Common interview questions

**1. Why use Spring AI or LangChain4j instead of calling the API directly?**
They handle the repeated work: messages, parsing, structured output, the tool-calling loop, vector stores, memory and many providers behind one interface.

**2. How does Spring AI return structured output?**
With `.entity(SomeRecord.class)` on the call. It asks the model for JSON in that shape and converts the reply into the record.

**3. How do you add RAG with Spring AI?**
Store documents in a `VectorStore` and add a retrieval advisor such as `QuestionAnswerAdvisor` to the `ChatClient` call, which searches the store and adds matches to the prompt.

**4. What is `AiServices` in LangChain4j?**
A factory that implements an interface you write, turning method calls into model calls, with support for system messages, tools, memory and structured return types.

**5. How do you choose between them?**
Spring AI for Spring Boot applications because it follows Spring conventions. LangChain4j when you are outside Spring or want a framework-neutral library.

**6. How do you test code that calls a model?**
Hide the model behind your own interface and use a stub in unit tests, then run a smaller set of evals against a real model to check quality.

## Pitfalls

- Spreading library types through all your business code.
- Copying code from an old tutorial for a different library version.
- Letting the tool loop run with no step, time or cost limit.
- Keeping API keys in properties files that are committed.
- Having no tests that run without a live model.
- Not logging token usage, so cost is unknown.

## Check yourself

<Checkpoint questions={[
  {
    q: "In Spring AI, which call parses the model's reply into a Java record?",
    options: [".content()", ".entity(Ticket.class)", ".tools(...)", ".advisors(...)"],
    answer: 1,
    why: ".entity(...) asks for JSON in the record's shape and converts the reply. .content() returns plain text.",
  },
  {
    q: "You build a Quarkus service. Which library is the more natural fit?",
    options: ["Spring AI", "LangChain4j", "Neither can work outside Spring", "Both require Spring Boot"],
    answer: 1,
    why: "LangChain4j is framework-neutral. Spring AI is designed around Spring.",
  },
  {
    q: "How do you unit test business code that uses a model?",
    options: ["Always call the real model", "Put the model behind your own interface and use a stub", "Skip tests", "Use a larger model"],
    answer: 1,
    why: "A stub makes tests fast and repeatable. Quality against a real model is checked separately with evals.",
  },
]} />

## Key takeaways

- Spring AI and LangChain4j handle messages, structured output, tools, RAG and memory for Java.
- Spring AI fits Spring Boot. LangChain4j fits any Java application.
- Both use `@Tool` methods and parse replies into records.
- Keep the library behind your own interface, add limits and logging, and pin versions.
- The code on this page compiled against Spring AI 1.1.8 and LangChain4j 1.22.0 but was not run against a live model.
