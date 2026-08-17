<div align="center">

#  HYDRA — Resilient Webhook Delivery Platform

**High-Throughput, Fault-Tolerant Webhook Delivery Infrastructure & Event Gateway**

<br/>

<p align="center">
  <a href="https://hydra-phi-three.vercel.app" target="_blank" style="text-decoration:none;">
    <code style="
      background: #0d1117;
      color: #58a6ff;
      padding: 10px 20px;
      border-radius: 6px;
      border: 1px solid #30363d;
      font-size: 15px;
      box-shadow: 0 0 20px rgba(88, 166, 255, 0.3);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    "><img src="./Url%20Link.svg" width="22" height="22" align="absmiddle" alt="Live Link" /> https://hydra-phi-three.vercel.app — Open Live Site</code>
  </a>
</p>

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-Distributed-231F20?style=flat-square&logo=apache-kafka&logoColor=white)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)

<br/>



<p align="center">
  <a href="#-architecture">Architecture</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-webhook-signature-verification">Webhook Signatures</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-author">Author</a>
</p>

</div>

---

## 📖 Overview

**HYDRA** is an open-source, resilient event gateway and webhook delivery engine designed for distributed systems. It guarantees **zero data loss**, sub-millisecond ingestion, multi-tenant endpoint fan-out, intelligent exponential backoff retries, and comprehensive delivery observability.

Traditional webhook dispatch mechanisms fail when downstream subscriber services experience downtime or rate limiting. HYDRA solves this by decoupling API intake from dispatch using the **Transactional Outbox Pattern**, distributed **Kafka streams**, and **BullMQ worker queues**.

---

## 🏛 Architecture

```
                                      [ Incoming API Request ]
                                                 │
                                                 ▼
                                     ┌───────────────────────┐
                                     │  Idempotency Check    │
                                     └───────────┬───────────┘
                                                 │
                                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PostgreSQL ACID Transaction                                                            │
│ ┌───────────────────────────┐                     ┌──────────────────────────────────┐ │
│ │  Event Record (Staged)    │ ◄─── Atomic ──────► │  Outbox Entry (Status: PENDING)  │ │
│ └───────────────────────────┘                     └──────────────────────────────────┘ │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │  (HTTP 202 Accepted Returned to Caller < 2ms)
                                         ▼
                             ┌───────────────────────┐
                             │  Outbox Relay Poller  │
                             └───────────┬───────────┘
                                         │
                                         ▼
                             ┌───────────────────────┐
                             │  Apache Kafka Topic   │
                             │   (webhook-events)    │
                             └───────────┬───────────┘
                                         │
                                         ▼
                             ┌───────────────────────┐
                             │  Kafka Consumer Group │
                             └───────────┬───────────┘
                                         │
                                         ▼
                             ┌───────────────────────┐
                             │ Redis Sub-ms Routing  │ (Matches Subscribed Endpoints)
                             └───────────┬───────────┘
                                         │
                                         ▼
                             ┌───────────────────────┐
                             │ BullMQ Worker Queue   │
                             └───────────┬───────────┘
                                         │
                     ┌───────────────────┴───────────────────┐
                     ▼                                       ▼
       ┌───────────────────────────┐           ┌───────────────────────────┐
       │ HTTP POST (HMAC Signed)   │           │ HTTP POST (HMAC Signed)   │
       │ Destination Endpoint A    │           │ Destination Endpoint B    │
       └─────────────┬─────────────┘           └─────────────┬─────────────┘
                     │                                       │
        ┌────────────┴────────────┐             ┌────────────┴────────────┐
        │ 2xx Success             │             │ 429/5xx Transient Error │
        │ Record Delivery Log     │             │ Exponential Backoff     │
        └─────────────────────────┘             │ Retries -> DLQ          │
                                                └─────────────────────────┘
```

### End-to-End Event Lifecycle:
1. **Intake & Idempotency**: Clients publish events with an optional `Idempotency-Key`.
2. **Transactional Outbox**: Events and Outbox entries are committed atomically in PostgreSQL. The client receives an immediate `202 Accepted` response.
3. **Kafka Streaming**: The Outbox Relay streams events into partitioned Kafka topics, buffering peak throughput without throttling the ingress API.
4. **Fan-Out & Routing**: Redis caches endpoint subscriptions and maps each event to active tenant endpoints.
5. **BullMQ Dispatch**: Workers sign payloads with HMAC SHA-256 and deliver HTTP requests with timeout enforcement.
6. **Smart Retries & DLQ**: Transient failures trigger jittered exponential backoff retries. Exhausted attempts are routed to the Dead Letter Queue for inspection and manual redrive.

---

## ✨ Key Features

- 🛡 **Transactional Outbox Pattern**: Eliminates dual-write vulnerabilities. Events are guaranteed to be queued if the database transaction commits.
- ⚡ **Asynchronous Stream Buffering**: Built on Apache Kafka to smoothly ingest high-volume spikes without overwhelming downstream endpoints.
- 🔀 **Dynamic Multi-Tenant Fan-Out**: Automatically routes single events to multiple subscriber endpoints subscribed to matching topics/types.
- 🔁 **Smart Exponential Backoff Retries**: Distinguishes between non-retriable client errors (4xx) and retriable network/server faults (5xx, 429).
- 🔐 **HMAC SHA-256 Cryptographic Signatures**: Downstream receivers can verify payload authenticity and prevent replay attacks via signature timestamps.
- 🪦 **Dead Letter Queue (DLQ)**: Full audit trail of failed deliveries with payload introspection and one-click manual batch re-drives.
- ⏸ **Endpoint Soft-Delete & Circuit Controls**: Pause or soft-delete endpoints without losing historical delivery records.
- 📊 **Developer Console**: Real-time dashboard for monitoring events, endpoints, delivery latencies, and API keys.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Core** | Node.js, Express.js (v5), TypeScript, `tsx` |
| **Database & ORM** | Neon PostgreSQL (ACID), Prisma ORM |
| **Streaming & Queue** | Aiven Cloud Kafka (`kafkajs` SASL SSL), Upstash Cloud Redis (`ioredis`), BullMQ |
| **Authentication** | JWT (HTTP-only cookies), API Key Bearer Tokens, `bcryptjs` |
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons |

---

## 🚀 Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or later)
- Cloud Infrastructure (Neon PostgreSQL, Upstash Redis, Aiven Apache Kafka)

### 2. Clone the Repository
```bash
git clone https://github.com/rajatmaurya/HYDRA.git
cd HYDRA
```

### 3. Configure & Run Backend

Navigate to `/BACKEND`:
```bash
cd BACKEND
npm install
```

Configure your environment file `.env`:
```env
PORT=2000
DATABASE_URL="postgresql://neondb_owner:...@ep-curly-unit-ao7jvirt.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Upstash Cloud Redis
APP_REDIS_URL="rediss://default:...@adequate-eagle-111442.upstash.io:6379"
QUEUE_REDIS_URL="rediss://default:...@positive-ant-102900.upstash.io:6379"

# Aiven Cloud Kafka
KAFKA_BOOTSTRAP_SERVERS="kafka-36ff9958-rajatmaurya176-f4bc.j.aivencloud.com:11133"
KAFKA_SASL_USERNAME="avnadmin"
KAFKA_SASL_PASSWORD="your_aiven_password"
KAFKA_SASL_MECHANISM="scram-sha-256"

WORKER_CONCURRENCY=50
```

Initialize the database schema:
```bash
npx prisma db push
```

Start the backend server & background workers:
```bash
npm run dev
```
> Server will start on `http://localhost:2000` with Outbox Relay and BullMQ workers running.

---

### 5. Configure & Run Frontend

Open a new terminal and navigate to `/FRONTED`:
```bash
cd FRONTED
npm install
npm run dev
```
> Open [http://localhost:3000](http://localhost:3000) in your browser to access the Developer Console.

---

## 📡 API Reference

### Publish an Event

Publishes an event to all subscribed webhook endpoints belonging to your organization.

`POST /v1/events`

#### Headers
| Header | Type | Description |
| :--- | :--- | :--- |
| `Authorization` | `string` | **Required**. `Bearer <HYDRA_API_KEY>` |
| `Idempotency-Key` | `string` | Optional. Unique key to prevent duplicate processing |
| `Content-Type` | `string` | `application/json` |

#### Request Body
```json
{
  "event": "payment.succeeded",
  "data": {
    "orderId": "ord_88190",
    "amount": 4900,
    "currency": "USD",
    "customer": "alex@example.com"
  }
}
```

#### Code Examples

#### cURL
```bash
curl -X POST http://localhost:2000/v1/events \
  -H "Authorization: Bearer hdr_live_9b4e8...7f2" \
  -H "Idempotency-Key: evt_order_998124" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.succeeded",
    "data": {
      "orderId": "ord_88190",
      "amount": 4900,
      "currency": "USD",
      "customer": "alex@example.com"
    }
  }'
```

#### Node.js / TypeScript
```typescript
const response = await fetch("http://localhost:2000/v1/events", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.HYDRA_API_KEY}`,
    "Idempotency-Key": "evt_order_998124",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event: "payment.succeeded",
    data: {
      orderId: "ord_88190",
      amount: 4900,
      currency: "USD",
      customer: "alex@example.com",
    },
  }),
});

const result = await response.json();
console.log(result); // { status: "ACCEPTED", eventId: "evt_..." }
```

#### Python
```python
import requests
import os

response = requests.post(
    "http://localhost:2000/v1/events",
    headers={
        "Authorization": f"Bearer {os.environ.get('HYDRA_API_KEY')}",
        "Idempotency-Key": "evt_order_998124",
        "Content-Type": "application/json",
    },
    json={
        "event": "payment.succeeded",
        "data": {
            "orderId": "ord_88190",
            "amount": 4900,
            "currency": "USD",
            "customer": "alex@example.com",
        },
    },
)

print(response.json())
```

---

## 🔒 Webhook Signature Verification

HYDRA signs every outbound webhook delivery with an HMAC SHA-256 signature using the endpoint's unique secret.

### Headers Sent to Destination:
- `X-Hydra-Signature`: Hex-encoded HMAC-SHA256 signature of `<timestamp>.<payload>`
- `X-Hydra-Timestamp`: Unix epoch timestamp (seconds) when the delivery was dispatched

### Verification Example (Node.js):
```typescript
import crypto from "crypto";

export function verifyWebhookSignature({
  payload,
  signature,
  timestamp,
  secret,
  toleranceSeconds = 300,
}: {
  payload: string;
  signature: string;
  timestamp: string;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  // 1. Prevent replay attacks by checking timestamp age
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > toleranceSeconds) {
    return false;
  }

  // 2. Compute expected HMAC
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  // 3. Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 📁 Project Structure

```
HYDRA/
├── BACKEND/
│   ├── prisma/
│   │   ├── models/                 # Modular Prisma schemas
│   │   │   ├── ApiKey.prisma
│   │   │   ├── Endpoints.prisma
│   │   │   ├── Event.prisma
│   │   │   ├── EventDeliveryWebhook.prisma
│   │   │   ├── IdempotencyKey.prisma
│   │   │   ├── Organization.prisma
│   │   │   └── Outbox.prisma
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controller/             # Request controllers
│   │   ├── middleware/             # Auth & API Key validation
│   │   ├── routes/                 # Express API routes
│   │   ├── services/
│   │   │   ├── outbox.service.ts   # Outbox Poller & Kafka Producer
│   │   │   └── worker.service.ts   # Kafka Consumer & BullMQ Dispatcher
│   │   ├── lib/                    # Kafka, Redis, & Prisma clients
│   │   ├── index.ts                # Express application setup
│   │   └── server.ts               # Server entry point
│   └── package.json
│
├── FRONTED/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/             # Login & Register views
│   │   │   ├── dashboard/          # Metrics, Endpoints, Events, Logs, DLQ
│   │   │   ├── organizations/      # Multi-tenant Organization manager
│   │   │   ├── layout.tsx          # Root Layout
│   │   │   └── page.tsx            # Landing Page & Documentation
│   │   ├── components/             # Reusable UI components (Navbar, etc.)
│   │   └── context/                # AuthContext provider
│   └── package.json
│
└── README.md
```

---

## 👨‍💻 Author
**Rajat Maurya**
- **Live App**: [https://hydra-phi-three.vercel.app](https://hydra-phi-three.vercel.app)
- **Email**: [rajatmaurya.dev@gmail.com](mailto:rajatmaurya.dev@gmail.com)
- **GitHub**: [@rajatmaurya-cs](https://github.com/rajatmaurya-cs)
- **LinkedIn**: [Rajat Maurya](https://www.linkedin.com/in/rajat-maurya-3a172331b/)

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">
  <sub>Engineered with precision by <strong>Rajat Maurya</strong> for mission-critical webhook reliability.</sub>
</div>
