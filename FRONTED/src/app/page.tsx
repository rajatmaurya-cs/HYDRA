import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  RefreshCw,
  AlertOctagon,
  Lock,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans pt-24 pb-24 overflow-hidden">
      
      {/* Background Subtle Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10 pointer-events-none" />

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 md:px-12 text-center space-y-7 pt-8">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-neutral-100/80 border border-neutral-200/90 rounded-full text-xs font-normal text-neutral-700 backdrop-blur-sm shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Enterprise Webhook Infrastructure & Gateway
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-medium tracking-tight text-neutral-900 leading-[1.12]">
          Never Lose a Webhook Event Again.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-neutral-500 max-w-2xl mx-auto font-normal leading-relaxed">
          HYDRA is the enterprise event gateway built for zero data loss, instant sub-millisecond intake, automated client retries, and total visibility over your webhook pipeline.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
          <Link
            href="/register"
            className="w-full sm:w-auto px-7 py-3 bg-black hover:bg-neutral-800 text-white font-normal rounded-lg transition-all text-xs tracking-wide shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-7 py-3 bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-800 font-normal rounded-lg transition-all text-xs tracking-wide active:scale-98 cursor-pointer flex items-center justify-center"
          >
            Open Developer Console
          </Link>
        </div>

        {/* Live Metrics Stat Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-10 border-t border-neutral-100">
          <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-xl">
            <div className="text-2xl font-semibold text-neutral-900">99.999%</div>
            <div className="text-xs text-neutral-500 mt-0.5">Ingestion Uptime SLA</div>
          </div>
          <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-xl">
            <div className="text-2xl font-semibold text-neutral-900">&lt; 2ms</div>
            <div className="text-xs text-neutral-500 mt-0.5">API Ingestion Latency</div>
          </div>
          <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-xl">
            <div className="text-2xl font-semibold text-neutral-900">Zero</div>
            <div className="text-xs text-neutral-500 mt-0.5">Event Loss Guarantee</div>
          </div>
          <div className="p-4 bg-neutral-50/50 border border-neutral-100 rounded-xl">
            <div className="text-2xl font-semibold text-neutral-900">Sub-Second</div>
            <div className="text-xs text-neutral-500 mt-0.5">Delivery Latency</div>
          </div>
        </div>

      </section>

      {/* System Architecture Flow Diagram Section */}
      <section className="max-w-5xl mx-auto px-6 md:px-12 pt-20">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">How HYDRA Protects Your Data</h2>
          <p className="text-2xl font-medium text-neutral-900 mt-2">End-to-end resilient webhook delivery</p>
        </div>

        <div className="p-6 md:p-8 bg-neutral-900 text-white rounded-2xl border border-neutral-800 shadow-xl overflow-x-auto">
          <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 min-w-[640px]">
            
            {/* Step 1 */}
            <div className="flex-1 p-4 bg-neutral-800/80 rounded-xl border border-neutral-700/50 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Step 1 • Ingestion</span>
                <h4 className="text-sm font-medium text-white mt-1">Transactional Dual-Write</h4>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  Events are persisted to outbox storage inside an ACID transaction before responding 202 Accepted.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-neutral-700/40 text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero-loss ingest</span>
              </div>
            </div>

            {/* Connector */}
            <div className="hidden md:flex items-center text-neutral-600 font-mono text-xs">→</div>

            {/* Step 2 */}
            <div className="flex-1 p-4 bg-neutral-800/80 rounded-xl border border-neutral-700/50 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Step 2 • Fan-Out</span>
                <h4 className="text-sm font-medium text-white mt-1">Smart Deduplication</h4>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  Automated routing to target endpoints with unique constraint checks preventing duplicate jobs.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-neutral-700/40 text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Idempotent Routing</span>
              </div>
            </div>

            {/* Connector */}
            <div className="hidden md:flex items-center text-neutral-600 font-mono text-xs">→</div>

            {/* Step 3 */}
            <div className="flex-1 p-4 bg-neutral-800/80 rounded-xl border border-neutral-700/50 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Step 3 • Dispatch</span>
                <h4 className="text-sm font-medium text-white mt-1">Adaptive Circuit Breaker</h4>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  Protects target servers from overload with sliding-window cooldowns and atomic probe leases.
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-neutral-700/40 text-[10px] text-neutral-400 font-mono flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>HMAC Signed</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Enterprise Value Features Grid */}
      <section className="max-w-5xl mx-auto px-6 md:px-12 pt-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Enterprise Platform Features</h2>
          <p className="text-2xl font-medium text-neutral-900 mt-2">Built for teams that demand reliable event delivery</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Feature 1 */}
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-base text-neutral-900">Guaranteed Event Retention</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Every incoming event is durably staged before client response. If destination endpoints go offline, your events remain completely safe and ready for automatic or manual replay.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-base text-neutral-900">Automated Smart Retries</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Intelligent error classification distinguishes between 4xx client errors and 5xx server downtime. Retriable errors use exponential backoff to recover automatically.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <AlertOctagon className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-base text-neutral-900">Dead Letter Queue & Re-Drive</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Exhausted or un-deliverable webhooks are captured in a dedicated DLQ. Inspect failed payloads, fix endpoint issues, and trigger one-click manual batch re-drives from the console.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-base text-neutral-900">Cryptographic Signing Security</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              All outgoing webhooks are signed using HMAC SHA-256 signatures and timestamped headers, allowing downstream receivers to verify payload integrity and prevent replay attacks.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-base text-neutral-900">Downstream Protection</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Automated circuit breakers temporarily halt traffic to failing endpoints to prevent thundering-herd incidents during downstream maintenance or outages.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-6 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl hover:border-neutral-300 transition-all hover:shadow-xs">
            <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-base text-neutral-900">Real-Time Latency Observability</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed font-normal">
              Monitor average response times, P95 latency distributions, delivery success rates, and live audit logs per tenant endpoint directly from your dashboard.
            </p>
          </div>

        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-6 md:px-12 pt-20">
        <div className="p-8 md:p-12 bg-neutral-900 text-white rounded-3xl text-center space-y-5 border border-neutral-800">
          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight">Ready to scale your webhook pipeline?</h2>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-lg mx-auto font-normal leading-relaxed">
            Create an organization, configure your webhook endpoints, and start ingesting high-throughput events in under two minutes.
          </p>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white hover:bg-neutral-100 text-neutral-900 font-normal rounded-lg text-xs transition-all active:scale-98 cursor-pointer"
            >
              Get Started for Free
              <ArrowRight className="w-3.5 h-3.5 text-neutral-900" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}


