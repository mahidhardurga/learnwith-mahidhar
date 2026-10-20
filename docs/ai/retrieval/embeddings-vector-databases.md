---
title: "Embeddings and Vector Databases Explained"
sidebar_label: "Embeddings and vector databases"
description: What embeddings are, how cosine similarity finds text with similar meaning, what a vector database stores, how approximate search works, and when to use pgvector or a dedicated engine.
keywords: [embeddings, vector database, cosine similarity, semantic search, pgvector, hnsw, approximate nearest neighbour, hybrid search, vector search, embedding model]
sidebar_position: 1
hide_table_of_contents: true
---

# Embeddings and Vector Databases

<Outcomes items={[
  "Explain what an embedding is and why similar meanings end up close together",
  "Compute cosine similarity and rank results by it",
  "Say what a vector database stores and when approximate search is used",
]} />

## What an embedding is

An **embedding** is a list of numbers that represents the meaning of a piece of text (or an image or audio). An embedding model turns the text into this list, called a **vector**. Texts with similar meaning get vectors that point in a similar direction, even when they use different words.

```text
"How do I get a refund?"     ->  [0.91, 0.12, 0.03, ...]
"Can I get my money back?"   ->  [0.88, 0.15, 0.05, ...]   (close: same meaning)
"Shipping takes 3 days"      ->  [0.10, 0.90, 0.11, ...]   (far: different meaning)
```

Real vectors have hundreds or thousands of numbers. This is what lets you search by meaning rather than by exact words.

## Measuring "close": cosine similarity

The usual measure is **cosine similarity**. It compares the direction of two vectors: 1 means the same direction (very similar), 0 means unrelated. Higher is more similar. Search then becomes: embed the question, compare with every stored vector, and return the highest scores.

## What a vector database does

A **vector database** (or a vector index inside a normal database) stores three things for each item and finds the nearest ones to a query quickly.

| Stored | Purpose |
| --- | --- |
| **Vector** | The embedding used for the similarity search. |
| **Original text** | What you give back or place into a prompt. |
| **Metadata** | Source, date, owner, category. Used for filters such as "only this customer's documents". |

Comparing a query with millions of vectors one by one is too slow, so most systems use **approximate nearest neighbour** search (for example the HNSW index). It finds results that are very likely the closest, much faster, and may occasionally miss one.

## Example: rank by cosine similarity

The 3-number vectors are made up for the demo. A real embedding model returns far more numbers, but the ranking works the same way.

```java
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public class SimilarityDemo {

    /** 1.0 means the same direction (same meaning), 0 means unrelated. */
    static double cosine(double[] a, double[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    record Hit(String text, double score) {}

    static List<Hit> topK(double[] query, Map<String, double[]> store, int k) {
        return store.entrySet().stream()
                .map(e -> new Hit(e.getKey(), cosine(query, e.getValue())))
                .sorted(Comparator.comparingDouble(Hit::score).reversed())
                .limit(k)
                .toList();
    }

    public static void main(String[] args) {
        // Toy 3-number "embeddings". A real model returns hundreds or thousands of numbers.
        Map<String, double[]> store = Map.of(
                "How to get a refund", new double[]{0.9, 0.1, 0.0},
                "Shipping times",      new double[]{0.1, 0.9, 0.1},
                "Return an item",      new double[]{0.6, 0.4, 0.1});

        double[] question = {0.85, 0.15, 0.05};   // "Can I get my money back?"
        for (Hit hit : topK(question, store, 3)) {
            System.out.printf("%.3f  %s%n", hit.score(), hit.text());
        }
    }
}
```

Output (tested):

```text
0.996  How to get a refund
0.914  Return an item
0.286  Shipping times
```

"Can I get my money back?" shares no words with "How to get a refund", yet it ranks first because the vectors point the same way.

## When to use which store

| Option | Good when |
| --- | --- |
| **pgvector** (an extension for PostgreSQL) | You already use PostgreSQL and have up to a few million vectors. One database, simple operations, and SQL filters. |
| **A dedicated vector engine** (for example Qdrant, Milvus, Weaviate or Pinecone) | Very large data, heavy search traffic, or advanced search features. |
| **A search engine with vectors** (Elasticsearch or OpenSearch) | You already run one and want keyword and vector search together. |

## System design considerations

- **Use the same embedding model for indexing and for queries.** Vectors from different models cannot be compared.
- **Changing the model means re-embedding everything.** Plan for it, and store the model name with each vector.
- **Combine keyword and vector search (hybrid search).** Exact terms such as product codes and names are found better by keywords, and meaning by vectors.
- **Use metadata filters for access control.** Filter by tenant or owner in the query, so users never see other people's documents.
- **Keep the index in sync.** Updated or deleted source documents must update or delete their vectors.
- **Accept approximate results.** Measure recall on your own data before tuning index settings for speed.

## Common interview questions

**1. What is an embedding?**
A vector of numbers that represents the meaning of text, produced by an embedding model, so that similar meanings are close together.

**2. What is cosine similarity?**
A measure of how closely two vectors point in the same direction. 1 means identical direction and values near 0 mean unrelated.

**3. What does a vector database store?**
The vector, the original text (or a reference to it), and metadata for filtering, with an index for fast nearest-neighbour search.

**4. Why is approximate nearest neighbour search used?**
Exact comparison with every vector is too slow at scale. Approximate indexes like HNSW are much faster and return the closest results with high probability.

**5. When would you choose pgvector?**
When you already use PostgreSQL and your data is of moderate size, because it keeps one system and supports SQL filters.

**6. Why can you not mix embeddings from two models?**
Each model has its own vector space. Numbers from one model have no meaning in another, so you must use the same model for the stored vectors and the query.

## Pitfalls

- Using different embedding models for indexing and querying.
- Never updating vectors when the source documents change.
- Skipping metadata filters and leaking one user's data to another.
- Relying only on vector search for exact names, ids or codes.
- Choosing a dedicated vector database before measuring whether pgvector is enough.

## Check yourself

<Checkpoint questions={[
  {
    q: "Two questions use different words but mean the same thing. What do their embeddings look like?",
    options: ["Completely unrelated", "Close to each other, with high cosine similarity", "Identical numbers", "Both zero"],
    answer: 1,
    why: "Embeddings capture meaning, so similar meanings end up with vectors pointing in a similar direction.",
  },
  {
    q: "You switch to a new embedding model. What must you do?",
    options: ["Nothing, vectors are interchangeable", "Re-embed all stored documents with the new model", "Delete the metadata", "Increase the context window"],
    answer: 1,
    why: "Vectors from different models live in different spaces and cannot be compared.",
  },
  {
    q: "A user must only see their own documents. How do you enforce that in vector search?",
    options: ["Ask the model to be careful", "Apply a metadata filter on the owner in the query", "Use a higher temperature", "Store fewer vectors"],
    answer: 1,
    why: "Filter by owner or tenant in the query itself, so other users' documents are never returned.",
  },
]} />

## Key takeaways

- An embedding is a vector that captures meaning, so you can search by meaning.
- Cosine similarity ranks how close two vectors are.
- A vector database stores vector, text and metadata, and uses approximate search for speed.
- Use one embedding model for both indexing and queries, and re-embed when you change it.
- Combine vector and keyword search, and enforce access with metadata filters.
