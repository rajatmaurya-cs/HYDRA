"use client";

import React, { useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import {
  ShieldCheck,
  RefreshCw,
  AlertOctagon,
  Lock,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Copy,
  Check,
  Cpu,
  Layers,
  Activity,
  Server,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"curl" | "node" | "python">("curl");
  const [copiedCode, setCopiedCode] = useState(false);

  const codeSnippets = {
    curl: `curl -X POST https://hydra-66dk.onrender.com/v1/events \\
  -H "Authorization: Bearer hdr_live_9b4e8...7f2" \\
  -H "Idempotency-Key: evt_order_998124" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "payment.succeeded",
    "data": {
      "orderId": "ord_88190",
      "amount": 4900,
      "currency": "USD",
      "customer": "rajat@example.com"
    }
  }'`,
    node: `// Direct native fetch (Node.js 18+ / TypeScript / Next.js)
const response = await fetch("https://hydra-66dk.onrender.com/v1/events", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${process.env.HYDRA_API_KEY}\`,
    "Idempotency-Key": "evt_order_998124",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    event: "payment.succeeded",
    data: {
      orderId: "ord_88190",
      amount: 4900,
      currency: "USD",
      customer: "rajat@example.com",
    },
  }),
});

const result = await response.json();
console.log(result); // { status: "ACCEPTED", eventId: "evt_..." }`,
    python: `# Python (requests library)
import requests
import os

response = requests.post(
    "https://hydra-66dk.onrender.com/v1/events",
    headers={
        "Authorization": f"Bearer {os.environ.get('HYDRA_API_KEY')}",
        "Idempotency-Key": "evt_order_998124",
        "Content-Type": "application/json",
    },
    json={
        "event": "payment.succeeded",
        "data": {
            "order_id": "ord_88190",
            "amount": 4900,
            "currency": "USD",
            "customer": "rajat@example.com",
        },
    },
)

print(response.json()) # {"status": "ACCEPTED", "eventId": "evt_..."}`,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans pt-24 pb-0 overflow-hidden">
      
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10 pointer-events-none" />

      
      <section className="max-w-5xl mx-auto px-6 md:px-12 text-center space-y-7 pt-6">
        
        
        <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-neutral-900 leading-[1.12]">
          Never Miss an Event Again.
        </h1>

        
        <p className="text-base sm:text-lg text-neutral-500 max-w-2xl mx-auto font-normal leading-relaxed">
          Reliable webhook delivery infrastructure with automatic retries, failure handling, and durable event processing.
        </p>

        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3 bg-black hover:bg-neutral-800 text-white font-normal rounded-lg transition-all text-xs tracking-wide shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          </Link>
          <a
            href="https://github.com/rajatmaurya-cs/HYDRA"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-7 py-3 bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-800 font-normal rounded-lg transition-all text-xs tracking-wide active:scale-98 cursor-pointer flex items-center justify-center"
          >
            <span>View Documentation</span>
          </a>
        </div>

        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10 border-t border-neutral-100">
          <div className="p-4 bg-neutral-50/60 border border-neutral-200/80 rounded-xl text-left">
            <div className="text-xl font-semibold text-neutral-900 tracking-tight">PostgreSQL</div>
            <div className="text-xs text-neutral-500 mt-0.5">Transactional Outbox</div>
          </div>
          <div className="p-4 bg-neutral-50/60 border border-neutral-200/80 rounded-xl text-left">
            <div className="text-xl font-semibold text-neutral-900 tracking-tight">Apache Kafka</div>
            <div className="text-xs text-neutral-500 mt-0.5">Event Stream Buffering</div>
          </div>
          <div className="p-4 bg-neutral-50/60 border border-neutral-200/80 rounded-xl text-left">
            <div className="text-xl font-semibold text-neutral-900 tracking-tight">Redis</div>
            <div className="text-xs text-neutral-500 mt-0.5">Sub-ms Cache Routing</div>
          </div>
          <div className="p-4 bg-neutral-50/60 border border-neutral-200/80 rounded-xl text-left">
            <div className="text-xl font-semibold text-neutral-900 tracking-tight">BullMQ</div>
            <div className="text-xs text-neutral-500 mt-0.5">Reliable Task Dispatch</div>
          </div>
        </div>

      </section>

      
      <section className="max-w-5xl mx-auto px-6 md:px-12 pt-20">
        <div className="p-6 md:p-8 bg-neutral-950 text-white rounded-2xl border border-neutral-800 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono text-neutral-300">Publish Events via REST API</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800 text-xs">
                {(["curl", "node", "python"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer uppercase ${
                      activeTab === tab
                        ? "bg-neutral-800 text-white font-medium shadow-xs"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 transition-all flex items-center gap-1 cursor-pointer"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
                <span className="text-[11px]">{copiedCode ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <pre className="text-xs font-mono text-neutral-200 leading-relaxed overflow-x-auto p-2 bg-neutral-900/50 rounded-lg border border-neutral-800/60">
            <code>{codeSnippets[activeTab]}</code>
          </pre>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-neutral-400 border-t border-neutral-800/80 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>HTTP 202 Accepted • Latency: 1.4ms</span>
            </div>
            <span className="text-neutral-500">Atomic Outbox Commit &amp; Kafka Broadcast</span>
          </div>
        </div>
      </section>

      
      <section className="max-w-5xl mx-auto px-6 md:px-12 pt-24">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Architectural Guarantees</h2>
          <p className="text-2xl font-medium text-neutral-900 mt-2">How HYDRA protects your event pipeline</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500 uppercase font-semibold">01 • Ingestion</span>
                <Layers className="w-4 h-4 text-neutral-700" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-900 mt-2">Transactional Outbox</h4>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed font-normal">
                Events are committed to relational outbox storage in an ACID transaction, preventing data loss during network hiccups.
              </p>
            </div>
            <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1.5 pt-2 border-t border-neutral-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-loss persistence</span>
            </div>
          </div>

          
          <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500 uppercase font-semibold">02 • Streaming</span>
                <Cpu className="w-4 h-4 text-neutral-700" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-900 mt-2">Kafka Distributed Queue</h4>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed font-normal">
                Outbox poller streams events into partitioned Kafka topics, buffering peak throughput without throttling your API.
              </p>
            </div>
            <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1.5 pt-2 border-t border-neutral-200">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>High throughput streaming</span>
            </div>
          </div>

          
          <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500 uppercase font-semibold">03 • Fan-Out</span>
                <Server className="w-4 h-4 text-neutral-700" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-900 mt-2">Cached Endpoint Routing</h4>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed font-normal">
                Redis sub-millisecond cache matches event types against active endpoints, creating isolated delivery records per destination.
              </p>
            </div>
            <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1.5 pt-2 border-t border-neutral-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-tenant fan-out</span>
            </div>
          </div>

          
          <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-500 uppercase font-semibold">04 • Delivery</span>
                <Activity className="w-4 h-4 text-neutral-700" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-900 mt-2">Worker Dispatch &amp; DLQ</h4>
              <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed font-normal">
                BullMQ dispatches signed HTTP POST requests with circuit breakers, auto-retries, and dead-letter queues for un-deliverable payloads.
              </p>
            </div>
            <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1.5 pt-2 border-t border-neutral-200">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>HMAC signed &amp; verified</span>
            </div>
          </div>

        </div>
      </section>

      
      <section className="max-w-5xl mx-auto px-6 md:px-12 pt-24">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">System Architecture</h2>
          <p className="text-2xl font-medium text-neutral-900 mt-2">Built for scalable and reliable event distribution</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Transactional Outbox Pattern</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              API requests durably persist events to Postgres before acknowledging the client request, ensuring zero data loss even during severe network partitions.
            </p>
          </div>

          
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Configurable Exponential Backoff</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Robust handling of downstream failures (e.g., HTTP 429, 5xx) with jittered exponential backoff and maximum retry thresholds powered by BullMQ.
            </p>
          </div>

          
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <AlertOctagon className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Dead Letter Queues (DLQ)</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Un-deliverable webhooks that exhaust retry limits are routed to a dedicated DLQ for inspection. Support for manual redriving of failed payloads.
            </p>
          </div>

          
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Cryptographic Payload Signatures</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              All outbound webhook payloads are signed with a unique endpoint secret using HMAC SHA-256, allowing downstream consumers to cryptographically verify authenticity.
            </p>
          </div>

          
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Redis-Backed Event Fan-Out</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Sub-millisecond topic-to-endpoint routing utilizing Redis sets, enabling scalable multi-tenant webhook fan-out from a single unified event stream.
            </p>
          </div>

          
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-neutral-900">Detailed Delivery Logging</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Granular visibility into every delivery attempt, exposing HTTP status codes, precise response times, payload bodies, and failure reasons for easy debugging.
            </p>
          </div>

        </div>
      </section>

      
      <section className="max-w-5xl mx-auto px-6 md:px-12 pt-24 pb-20">
        <div className="p-8 md:p-12 bg-neutral-900 text-white rounded-3xl text-center space-y-5 border border-neutral-800 shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight">Deploy your event infrastructure</h2>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-lg mx-auto font-normal leading-relaxed">
            Configure your webhook endpoints, generate API keys, and integrate your backend seamlessly using the Hydra API.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-normal rounded-lg text-xs transition-all active:scale-98 cursor-pointer"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-900" />
            </Link>
          </div>
        </div>
      </section>

      
      <Footer />

    </div>
  );
}



