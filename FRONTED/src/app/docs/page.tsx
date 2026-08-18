"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Send,
  Link2,
  XCircle,
  KeyRound,
  ScrollText,
  Building2,
  Copy,
  Check,
  Shield,
  Zap,
  RotateCcw,
  ArrowRight,
  Terminal,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import Footer from "@/components/Footer";

interface DocSection {
  id: string;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const SECTIONS: DocSection[] = [
  {
    id: "ingress",
    title: "Event Ingress & Delivery",
    badge: "POST /v1/events",
    icon: Send,
    description:
      "Sub-millisecond event intake, idempotency deduplication, and transactional outbox persistence.",
  },
  {
    id: "endpoints",
    title: "Webhook Endpoints",
    badge: "HMAC SHA-256",
    icon: Link2,
    description:
      "Registering webhook URLs, subscribing to event topics, and cryptographic signature verification.",
  },
  {
    id: "dlq",
    title: "Dead Letter Queues (DLQ)",
    badge: "Fault Recovery",
    icon: XCircle,
    description:
      "Automatic exponential backoff retries, dead letter status, and 1-click manual replay.",
  },
  {
    id: "keys",
    title: "API Key Management",
    badge: "Security",
    icon: KeyRound,
    description:
      "Environment isolation (Test vs Live), SHA-256 key hashing, and zero plain-text storage.",
  },
  {
    id: "logs",
    title: "Observability & Logs",
    badge: "Telemetry",
    icon: ScrollText,
    description:
      "Granular delivery attempt logs, HTTP status codes, latency timings, and payload inspection.",
  },
  {
    id: "workspaces",
    title: "Multi-tenant Workspaces",
    badge: "Isolation",
    icon: Building2,
    description:
      "Isolated organizations, workspace-scoped endpoints, credentials, and telemetry streams.",
  },
];

function DocsContent() {
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");

  const [activeTopic, setActiveTopic] = useState("ingress");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    setActiveTopic(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/docs?topic=${id}`);
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const target = topicParam || (typeof window !== "undefined" && window.location.hash ? window.location.hash.replace("#", "") : null);
    if (target && SECTIONS.some((s) => s.id === target)) {
      setActiveTopic(target);
      const timer = setTimeout(() => {
        const element = document.getElementById(target);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [topicParam]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans pt-20">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8">
        
        {/* Header */}
        <div className="border-b border-neutral-200 pb-6 mb-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 mb-3">
            <Terminal className="w-3 h-3 text-neutral-500" />
            <span>Developer Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            HYDRA Documentation & Feature Guide
          </h1>
          <p className="text-neutral-500 text-sm mt-2 max-w-2xl font-normal leading-relaxed">
            Essential reference guides, API specifications, and architectural mechanisms powering the HYDRA Webhook Gateway.
          </p>
        </div>

        {/* Layout: Sidebar + Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Sticky Navigation Sidebar */}
          <aside className="lg:col-span-4 space-y-1 self-start lg:sticky lg:top-24">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2 px-3">
              Platform Topics
            </span>
            <nav className="space-y-1">
              {SECTIONS.map((section) => {
                const isActive = activeTopic === section.id;
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? "bg-black text-white font-medium shadow-2xs"
                        : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 font-normal"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-neutral-400"}`} />
                      <span className="truncate">{section.title}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isActive ? "bg-neutral-800 text-neutral-300" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {section.badge}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-8 p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <span className="text-xs font-semibold text-neutral-900 block">Quick Integration</span>
              <p className="text-[11px] text-neutral-500 leading-relaxed font-normal">
                Ready to send live webhooks? Open the dashboard to configure your API keys and endpoints.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-black hover:underline pt-1"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-8 space-y-12">
            
            {/* 1. Event Ingress & Delivery */}
            <section id="ingress" className="scroll-mt-24 p-6 md:p-8 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Event Ingress & Delivery</h2>
                    <p className="text-xs text-neutral-500 font-normal">Ingest raw events via HTTP API in sub-5ms</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-neutral-100 text-neutral-800 font-medium">
                  POST /v1/events
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Publish events to HYDRA using an authorized HTTP POST request. Events are saved into an <strong>ACID Transactional Outbox</strong> and immediately acknowledged with <code className="text-xs bg-neutral-100 px-1.5 py-0.5 rounded font-mono">202 ACCEPTED</code>, decoupling client ingestion from downstream delivery latency.
              </p>

              {/* Code Snippet */}
              <div className="rounded-xl bg-neutral-950 text-white p-4 font-mono text-xs space-y-2 relative">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800 pb-2">
                  <span>cURL Event Request</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        "ingress-curl",
                        `curl -X POST https://hydra-66dk.onrender.com/v1/events \\\n  -H "Authorization: Bearer hdr_live_9b4e8...7f2" \\\n  -H "Idempotency-Key: evt_order_998124" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "event": "payment.succeeded",\n    "data": {\n      "orderId": "ord_88192",\n      "amount": 4900,\n      "currency": "USD"\n    }\n  }'`
                      )
                    }
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedCode === "ingress-curl" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === "ingress-curl" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="text-neutral-300 overflow-x-auto text-[11px] leading-relaxed pt-1">
{`curl -X POST https://hydra-66dk.onrender.com/v1/events \\
  -H "Authorization: Bearer hdr_live_9b4e8...7f2" \\
  -H "Idempotency-Key: evt_order_998124" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "payment.succeeded",
    "data": {
      "orderId": "ord_88192",
      "amount": 4900,
      "currency": "USD"
    }
  }'`}
                </pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-900 block mb-1">Idempotency Guard</span>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    Duplicate <code className="font-mono">Idempotency-Key</code> headers return the cached response without duplicate dispatch.
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-900 block mb-1">Zero Message Loss</span>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    The Outbox Poller continuously streams pending rows to Kafka every 250ms with row-level locks.
                  </p>
                </div>
              </div>
            </section>

            {/* 2. Webhook Endpoints & Signatures */}
            <section id="endpoints" className="scroll-mt-24 p-6 md:p-8 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Webhook Endpoints & Security</h2>
                    <p className="text-xs text-neutral-500 font-normal">Cryptographic HMAC SHA-256 payload verification</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  HMAC SHA-256
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Every endpoint receives an individual signing secret (<code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">whsec_...</code>). HYDRA computes an HMAC signature across the timestamp and JSON payload to prevent tampering and replay attacks.
              </p>

              {/* Signature Verification Code */}
              <div className="rounded-xl bg-neutral-950 text-white p-4 font-mono text-xs space-y-2 relative">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800 pb-2">
                  <span>Node.js Verification Handler</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        "hmac-code",
                        `const crypto = require('crypto');\n\nfunction verifyHydraSignature(payload, signatureHeader, secret) {\n  const [timestampPart, sigPart] = signatureHeader.split(',');\n  const timestamp = timestampPart.split('=')[1];\n  const expectedSig = sigPart.split('=')[1];\n\n  const signedPayload = \`\${timestamp}.\${JSON.stringify(payload)}\`;\n  const computedSig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');\n\n  return crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(expectedSig));\n}`
                      )
                    }
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedCode === "hmac-code" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === "hmac-code" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="text-neutral-300 overflow-x-auto text-[11px] leading-relaxed pt-1">
{`const crypto = require('crypto');

function verifyHydraSignature(payload, signatureHeader, secret) {
  // Header format: Hydra-Signature: t=1771349000,v1=9b4e8c1d5f...
  const [tPart, sigPart] = signatureHeader.split(',');
  const timestamp = tPart.split('=')[1];
  const signature = sigPart.split('=')[1];

  const payloadToSign = \`\${timestamp}.\${JSON.stringify(payload)}\`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadToSign)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}`}
                </pre>
              </div>

              <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg flex items-start gap-2.5 text-xs text-neutral-600 font-normal">
                <Shield className="w-4 h-4 text-neutral-800 shrink-0 mt-0.5" />
                <span>
                  <strong>Replay Protection:</strong> Downstream subscribers should reject any webhook where timestamp <code className="font-mono">t</code> differs from server time by more than 5 minutes.
                </span>
              </div>
            </section>

            {/* 3. Dead Letter Queues (DLQ) */}
            <section id="dlq" className="scroll-mt-24 p-6 md:p-8 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Dead Letter Queues (DLQ)</h2>
                    <p className="text-xs text-neutral-500 font-normal">Fault recovery, circuit breaking & manual replay</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                  5 Retries Max
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                When a downstream endpoint fails or returns a 5xx error, HYDRA performs <strong>5 automated retries with exponential backoff</strong> (5s, 10s, 20s, 40s, 80s). If all attempts fail or the endpoint returns a non-retriable 4xx client error, the delivery transitions to <code className="text-xs bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono">DEAD</code> status.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                  <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Circuit Breaker</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    Opens after 5 consecutive failures for 60s cooldown to protect downstreams from cascading outages.
                  </p>
                </div>
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                  <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5 mb-1">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>1-Click Replay</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    Re-enqueue individual failed deliveries or trigger organization-wide bulk retries from the dashboard.
                  </p>
                </div>
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-1">
                  <span className="text-xs font-semibold text-neutral-900 flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>State Sync</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 font-normal">
                    Replaying a dead delivery automatically recalculates the parent event status (Delivered vs Partial).
                  </p>
                </div>
              </div>
            </section>

            {/* 4. API Key Management */}
            <section id="keys" className="scroll-mt-24 p-6 md:p-8 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">API Key Management</h2>
                    <p className="text-xs text-neutral-500 font-normal">High-entropy cryptographic keys & hashing</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-neutral-100 text-neutral-800 font-medium">
                  256-bit Entropy
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                HYDRA generates 64-character random hexadecimal keys (<code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">hdr_live_...</code> or <code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">hdr_test_...</code>). The raw key is shown only once; the database stores only the <strong>SHA-256 hash</strong> for sub-millisecond authentication and total database leak resistance.
              </p>

              <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-neutral-900 block">Key Lifecycle Operations:</span>
                <ul className="space-y-1.5 text-neutral-600 font-normal list-disc pl-4 text-[11px]">
                  <li><strong>Create:</strong> Generates a new environment-scoped API Key.</li>
                  <li><strong>Rotate:</strong> Revokes the old key atomically and provisions a new replacement token.</li>
                  <li><strong>Revoke:</strong> Instantly blocks incoming event ingestion using the compromised key.</li>
                </ul>
              </div>
            </section>

            {/* 5. Observability & Logs */}
            <section id="logs" className="scroll-mt-24 p-6 md:p-8 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                    <ScrollText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Observability & Logs</h2>
                    <p className="text-xs text-neutral-500 font-normal">End-to-end telemetry and granular delivery logs</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-neutral-100 text-neutral-800 font-medium">
                  Telemetry
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Every webhook dispatch records detailed telemetry metrics: HTTP response status code, exact execution latency in milliseconds (<code className="text-xs bg-neutral-100 px-1 py-0.5 rounded font-mono">completedAt - startedAt</code>), attempt count, error messages, and original request payload.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-900 block">HTTP Code</span>
                  <span className="text-[11px] text-neutral-500 font-mono">200, 404, 500, etc.</span>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-900 block">Latency</span>
                  <span className="text-[11px] text-neutral-500 font-mono">Captured in ms</span>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-900 block">Attempts</span>
                  <span className="text-[11px] text-neutral-500 font-mono">1 to 5</span>
                </div>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <span className="text-xs font-semibold text-neutral-900 block">Status</span>
                  <span className="text-[11px] text-neutral-500 font-mono">Delivered / Dead</span>
                </div>
              </div>
            </section>

            {/* 6. Multi-tenant Workspaces */}
            <section id="workspaces" className="scroll-mt-24 p-6 md:p-8 bg-white border border-neutral-200 rounded-2xl shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Multi-tenant Workspaces</h2>
                    <p className="text-xs text-neutral-500 font-normal">Organizational boundary and resource isolation</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-neutral-100 text-neutral-800 font-medium">
                  Multi-Tenant
                </span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Organizations act as independent tenancy boundaries. All webhook endpoints, API credentials, event streams, and dead-letter queues are strictly isolated per organization, allowing teams and SaaS products to manage multiple environments with zero cross-tenant contamination.
              </p>

              <div className="pt-2">
                <Link
                  href="/organizations"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-normal transition-all shadow-2xs cursor-pointer"
                >
                  <span>Manage Your Organizations</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>

          </main>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
        </div>
      }
    >
      <DocsContent />
    </Suspense>
  );
}
