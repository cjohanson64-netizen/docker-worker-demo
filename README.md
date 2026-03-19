# Docker Producer–Worker Queue Demo

## Overview

This project is a small, containerized system that demonstrates how asynchronous job processing works using a **producer–worker architecture**.

It was built to better understand how distributed systems handle workloads at scale, similar to how modern backend systems process large volumes of tasks.

---

## 🧠 Key Concepts Demonstrated

* Asynchronous job processing
* Separation of concerns (producer vs worker)
* Queue-based architecture
* Containerization with Docker
* Multi-service orchestration with Docker Compose

---

## ⚙️ System Architecture

```
Producer → Queue (file-based) → Worker → Processing
```

### Components

#### Producer

* Generates jobs (URLs)
* Adds jobs to a shared queue (`queue.json`)

#### Queue

* Simple file-based queue
* Stores jobs waiting to be processed

#### Worker

* Continuously polls the queue
* Pulls jobs one at a time
* Processes each job asynchronously
* Fetches web pages and extracts basic information (e.g., page title)

#### Docker

* Each service runs in its own container
* Ensures consistent runtime across environments

#### Docker Compose

* Orchestrates multiple services
* Runs producer and worker together

---

## 🚀 Getting Started

### Prerequisites

* Docker Desktop installed

### Run the Project

```bash
docker compose up --build
```

---

## 🧪 Example Output

```
[Producer] Added 4 jobs to the queue.
[Worker] Worker started. Polling for jobs...

[Worker] Starting job 1
[Worker] Fetching URL: https://example.com
[Worker] Page title: Example Domain
[Worker] Finished job 1
```

---

## 🔍 What This Simulates

This project models a simplified version of a real-world distributed system:

| This Project      | Real-World Equivalent             |
| ----------------- | --------------------------------- |
| queue.json        | Message queue (e.g., AWS SQS)     |
| Worker process    | Containerized worker service      |
| Producer          | Job scheduler / ingestion service |
| Docker containers | Scalable compute units            |

---

## ⚠️ Limitations

This is a learning-focused implementation and has some limitations:

* File-based queue is not safe for concurrent access
* No retry or failure handling
* No distributed scaling of workers
* No persistent database

---

## 🔧 Potential Improvements

* Replace file queue with a real message queue system
* Add retry logic and error handling
* Store results in a database
* Run multiple worker containers to simulate scaling
* Add monitoring/logging

---

## 🎯 Why This Project Matters

This project demonstrates an understanding of:

* How systems scale using queues and workers
* How to separate responsibilities across services
* How containerization enables consistent and portable environments

It reflects a systems-thinking approach to software engineering and an ability to learn new technologies through hands-on implementation.

---

## 👤 Author

Built as part of a transition into software engineering, focusing on backend systems, distributed architecture, and scalable application design.
