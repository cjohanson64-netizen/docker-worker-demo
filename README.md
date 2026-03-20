# Docker Producer–Worker Queue Demo with TryAngleTree Semantic Layer

## Overview

This project is a small, containerized system that demonstrates how asynchronous job processing works using a **producer–worker architecture**.

It was originally built to better understand how distributed systems handle workloads at scale, similar to how modern backend systems process large volumes of tasks. It has since been extended with a **TryAngleTree (TAT)** semantic layer that transforms raw page analysis into a structured graph, evaluates conditional rules, and produces a view model that is more useful for both **AI reasoning** and **UI rendering**.

---

## 🧠 Key Concepts Demonstrated

* Asynchronous job processing
* Separation of concerns (producer vs worker)
* Queue-based architecture
* Containerization with Docker
* Multi-service orchestration with Docker Compose
* Native `fetch` in Node.js (Node 18+)
* Basic content analysis (HTML parsing)
* Parallel processing with multiple workers
* Observability via structured logging
* Semantic graph modeling with TryAngleTree
* Conditional rule evaluation through a DSL runtime
* View-model transformation for AI and rendering workflows

---

## ⚙️ System Architecture

```text
Producer → Queue (file-based) → Workers → Fetch → Analyze → TAT Facts → TAT Rules Graph → View Model
```

### Components

#### Producer

* Generates jobs (URLs)
* Adds jobs to a shared queue (`queue.json`)

#### Queue

* Simple file-based queue
* Stores jobs waiting to be processed

#### Workers

* Continuously poll the queue
* Pull jobs one at a time
* Process jobs asynchronously
* Multiple workers can run in parallel using Docker Compose scaling

#### Processing Pipeline

Each job goes through the following stages:

```text
Fetch HTML → Analyze Content → Generate TAT Facts → Run TAT Rules → Build View Model
```

#### Raw Analysis Layer

The worker extracts basic page information such as:

* Page title
* Content length
* Presence of meta description

#### TAT Semantic Layer

The raw analysis is translated into a TryAngleTree facts module and executed through the real TAT runtime.

This creates a semantic graph of relationships such as:

* `sourced_from`
* `evaluated_at`
* `has_metric`
* `has`
* `signals`
* `warns`

#### Conditional Rules Layer

TAT rules evaluate the semantic graph and attach warnings only when conditions are met, such as:

* missing title
* missing meta description
* thin content

#### View Model Layer

A final transformation step converts the graph into a cleaner object intended for:

* AI summarization
* dashboard rendering
* debugging
* reporting

#### Docker

* Each service runs in its own container
* Ensures consistent runtime across environments

#### Docker Compose

* Orchestrates multiple services
* Can scale worker containers

---

## 🚀 Getting Started

### Prerequisites

* Docker Desktop installed

### Run the Project

```bash
docker compose up --build
```

### Scale Workers

```bash
docker compose up --build --scale worker=3
```

---

## 🧪 Example Output

### Raw Result

```json
{
  "jobId": 4,
  "url": "https://observepoint.com",
  "analysis": {
    "hasTitle": true,
    "title": "Home | ObservePoint",
    "contentLength": 80348,
    "hasMetaDescription": true
  },
  "processedAt": "2026-03-20T01:34:25.366Z"
}
```

### View Model

```json
{
  "page": {
    "jobId": 4,
    "url": "https://observepoint.com",
    "processedAt": "2026-03-20T01:34:25.366Z",
    "title": "Home | ObservePoint",
    "hasTitle": true,
    "hasMetaDescription": true,
    "contentLength": 80348,
    "root": "pageNode"
  },
  "warnings": [],
  "metadata": {
    "title": "Home | ObservePoint",
    "hasMetaDescription": true
  },
  "metrics": {
    "contentLength": 80348,
    "isThinContent": false
  },
  "signals": {
    "hasTitle": true,
    "hasMetaDescription": true,
    "isThinContent": false
  },
  "summary": {
    "relationCount": 7,
    "warningCount": 0,
    "hasWarnings": false,
    "historyCount": 7
  }
}
```

---

## 🔍 What This Simulates

This project models a simplified version of a real-world distributed system:

| This Project      | Real-World Equivalent                                   |
| ----------------- | ------------------------------------------------------- |
| `queue.json`      | Message queue (for example Amazon Simple Queue Service) |
| Worker containers | Scalable processing services                            |
| Producer          | Job ingestion service                                   |
| Raw analysis      | Page inspection / extraction stage                      |
| TAT graph         | Semantic interpretation layer                           |
| View model        | Reporting / rendering / AI consumption layer            |
| Console logs      | Logging / observability systems                         |

---

## 🧩 Why TryAngleTree Was Added

The raw analysis result is useful, but flat. It tells the system **what values were extracted**.

The TryAngleTree layer makes those results more useful by representing them as relationships and rule-driven findings. That provides:

* clearer structure
* explainable reasoning
* richer AI inputs
* more flexible rendering output
* a better foundation for future rule systems

In short:

```text
JavaScript handles execution.
TryAngleTree handles meaning.
The view model handles presentation.
```

---

## ⚠️ Limitations

This is a learning-focused implementation and has some limitations:

* File-based queue is not safe for concurrent access
* No persistent database yet
* No retry or failure tracking yet
* Worker polling is basic
* TAT graph projection currently emphasizes edges/history more than rich node payload serialization

---

## 🔧 Potential Improvements

* Replace file queue with a real message queue such as Redis or Amazon Simple Queue Service
* Store results in a database
* Add retry logic and failure tracking
* Add structured logging and monitoring
* Build a dashboard UI for monitoring jobs and results
* Improve TAT graph node serialization for richer downstream consumption
* Expand TAT rules to cover more SEO / web-governance checks

---

## 🎯 Key Learnings

* Parallel workers lead to **non-deterministic execution order**
* Concurrency introduces challenges in shared resources like file-based queues
* Separating ingestion and processing improves scalability
* Containerization simplifies running multi-service systems
* Modern Node.js provides built-in web APIs like `fetch`
* Semantic graph output is more useful for AI and rendering than flat analysis alone
* Conditional rules make the DSL layer meaningfully interpret results instead of only storing them

---

## 🎯 Why This Project Matters

This project demonstrates an understanding of:

* distributed job-processing systems
* asynchronous workflows
* scaling via multiple workers
* semantic modeling with a custom DSL
* rule-based interpretation layers
* transforming low-level output into AI- and UI-friendly abstractions

It reflects a systems-thinking approach to software engineering and shows how execution, semantics, and presentation can be separated into distinct layers.

---

## 👤 Author

Built as part of a transition into software engineering, with a focus on backend systems, distributed architecture, semantic modeling, and scalable application design.
