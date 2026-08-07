"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface FailedJob {
  id: string;
  statusCode: number | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: string;
  endpoint: {
    name: string;
    url: string;
  };
  event: {
    eventType: string;
    idempotencyKey: string | null;
  };
}

interface Metrics {
  totalEvents: number;
  totalSuccessfulEvents: number;
  totalFailedEvents: number;
  successRate: number;
  recentFailedJobs: FailedJob[];
}

function OverviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgId) {
      fetchMetrics(orgId);
    }
  }, [orgId]);

  const fetchMetrics = async (targetOrgId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:2000/api/organizations/${targetOrgId}/metrics`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-neutral-200 pb-4 mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
          🏠 Overview
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5 font-normal">
          Real-time metrics and system delivery health
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Total Events
          </span>
          <span className="text-2xl font-bold text-neutral-900">{metrics.totalEvents}</span>
        </div>

        <div className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Successful Events
          </span>
          <span className="text-2xl font-bold text-emerald-600">{metrics.totalSuccessfulEvents}</span>
        </div>

        <div className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Failed Events
          </span>
          <span className="text-2xl font-bold text-rose-600">{metrics.totalFailedEvents}</span>
        </div>

        <div className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
            Success Rate
          </span>
          <span className="text-2xl font-bold text-neutral-900">{metrics.successRate}%</span>
        </div>
      </div>

      {/* Recent 10 Failed Deliveries Table */}
      <div className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Recent Failed Deliveries (Top 10)</h3>
            <p className="text-xs text-neutral-400 font-normal mt-0.5">Most recent delivery attempts that encountered errors</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/failed?orgId=${orgId}`)}
            className="text-xs text-neutral-500 hover:text-black font-normal cursor-pointer"
          >
            View All Failed →
          </button>
        </div>

        {metrics.recentFailedJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 font-normal">
            🎉 No failed deliveries found for this organization!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-normal">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Target Endpoint</th>
                  <th className="py-2.5 px-3">Status Code</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Error Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {metrics.recentFailedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-3 text-neutral-500 font-mono text-[11px]">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-neutral-800">
                      {job.event.eventType}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-neutral-900 block">{job.endpoint.name}</span>
                      <code className="text-[10px] text-neutral-400 truncate block max-w-[180px] font-mono">
                        {job.endpoint.url}
                      </code>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        {job.statusCode || "N/A"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-neutral-600 font-mono">{job.attemptCount}</td>
                    <td className="py-3 px-3 text-rose-600 font-mono text-[11px] max-w-[220px] truncate">
                      {job.errorMessage || "Delivery Error"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <OverviewPageContent />
    </Suspense>
  );
}
