"use client";

import React from "react";

export default function FailedPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4 mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
          ❌ Failed Deliveries & DLQ
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5 font-normal">
          Failed webhook delivery attempts and Dead Letter Queue re-drive controls
        </p>
      </div>
      <div className="p-12 bg-neutral-50 border border-neutral-200 rounded-xl text-center text-xs text-neutral-500 font-normal">
        ❌ Failed Webhook Deliveries and Dead Letter Queue (DLQ) re-drive controls.
      </div>
    </div>
  );
}
