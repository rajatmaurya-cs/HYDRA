import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans pt-28 pb-20 px-6 md:px-12">
      <div className="max-w-3xl mx-auto text-center space-y-7">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-xs font-normal text-neutral-700">
          <span className="w-1.5 h-1.5 rounded-full bg-black" />
          Enterprise Webhooks Ingestion Platform
        </div>

        {/* Hero Title - Font Normal / Medium */}
        <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-neutral-900 leading-tight">
          High-throughput, reliable event delivery for modern apps.
        </h1>

        {/* Subtitle */}
        <p className="text-base text-neutral-500 max-w-xl mx-auto font-normal leading-relaxed">
          Sub-millisecond stateless ingestion powered by Kafka, Redis rate limiting, and BullMQ retries. Build, verify, and monitor your webhooks with ease.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 py-2.5 bg-black hover:bg-neutral-800 text-white font-normal rounded-md transition-all text-xs cursor-pointer"
          >
            Get Started Free
          </Link>
          <Link
            href="/organizations"
            className="w-full sm:w-auto px-6 py-2.5 bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-800 font-normal rounded-md transition-all text-xs cursor-pointer"
          >
            Go to Console
          </Link>
        </div>

        {/* Features Minimalist Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-12 text-left">
          <div className="p-5 bg-neutral-50/60 border border-neutral-200/80 rounded-xl">
            <div className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center font-normal text-xs mb-3">
              ⚡
            </div>
            <h3 className="font-medium text-sm text-neutral-900">Stateless Ingestion</h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed font-normal">
              Instant 202 Accepted return using Kafka topic partitions with zero database blocking.
            </p>
          </div>

          <div className="p-5 bg-neutral-50/60 border border-neutral-200/80 rounded-xl">
            <div className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center font-normal text-xs mb-3">
              🛡️
            </div>
            <h3 className="font-medium text-sm text-neutral-900">Redis Idempotency</h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed font-normal">
              Atomic SET-NX locks prevent duplicate event processing across high-concurrency requests.
            </p>
          </div>

          <div className="p-5 bg-neutral-50/60 border border-neutral-200/80 rounded-xl">
            <div className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center font-normal text-xs mb-3">
              🔒
            </div>
            <h3 className="font-medium text-sm text-neutral-900">HMAC Signatures</h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed font-normal">
              Standard SHA-256 HMAC payload signatures generated per endpoint to ensure target security.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
