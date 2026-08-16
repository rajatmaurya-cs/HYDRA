"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Inbox,
  Send,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

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
  eventsIngested: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeadDeliveries: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
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
      const res = await apiFetch(`/api/organizations/${targetOrgId}/metrics`);
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
    <div className="space-y-6 font-sans">
      
      <div className="border-b border-neutral-200 pb-4 mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
          Overview
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5 font-normal">
          Real-time webhook delivery metrics, processing latency, and performance overview
        </p>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Events Ingested
            </span>
            <Inbox className="w-4 h-4 text-neutral-400" />
          </div>
          <span className="text-2xl font-bold text-neutral-900 block">{metrics.eventsIngested}</span>
          <span className="text-[10px] text-neutral-400 font-normal mt-0.5 block">Raw events received by HYDRA</span>
        </div>

        
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Deliveries
            </span>
            <Send className="w-4 h-4 text-neutral-400" />
          </div>
          <span className="text-2xl font-bold text-neutral-900 block">{metrics.totalDeliveries}</span>
          <span className="text-[10px] text-neutral-400 font-normal mt-0.5 block">Total endpoint deliveries created</span>
        </div>

        
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Successful
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 block">{metrics.successfulDeliveries}</span>
          <span className="text-[10px] text-neutral-400 font-normal mt-0.5 block">Deliveries that succeeded</span>
        </div>

        
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Failed / Dead
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-2xl font-bold text-rose-600 block">{metrics.failedDeadDeliveries}</span>
          <span className="text-[10px] text-neutral-400 font-normal mt-0.5 block">Exhausted retry limit</span>
        </div>

        
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Success Rate
            </span>
            <TrendingUp className="w-4 h-4 text-neutral-400" />
          </div>
          <span className="text-2xl font-bold text-neutral-900 block">{metrics.successRate}%</span>
          <span className="text-[10px] text-neutral-400 font-normal mt-0.5 block">Successful / Total deliveries</span>
        </div>

        
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Avg Latency
            </span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-neutral-900 block">{metrics.avgLatencyMs} <span className="text-xs font-normal text-neutral-500">ms</span></span>
          <span className="text-[10px] text-neutral-400 font-normal mt-0.5 block">Mean HTTP dispatch response time</span>
        </div>

        
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              P95 Latency
            </span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-neutral-900 block">{metrics.p95LatencyMs} <span className="text-xs font-normal text-neutral-500">ms</span></span>
          <span className="text-[10px] text-neutral-400 font-normal mt-0.5 block">95th percentile response time</span>
        </div>
      </div>

      
      <div className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Recent Failed Deliveries (Top 10)</h3>
            <p className="text-xs text-neutral-400 font-normal mt-0.5">Most recent delivery attempts that encountered errors</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/failed?orgId=${orgId}`)}
            className="text-xs text-neutral-500 hover:text-black font-normal cursor-pointer flex items-center gap-1"
          >
            <span>View All Failed</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {metrics.recentFailedJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 font-normal">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            No failed deliveries found for this organization!
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
                      <code className="text-[10px] text-neutral-400 font-mono block max-w-[150px] truncate">
                        {job.endpoint.url}
                      </code>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-rose-600">
                      {job.statusCode || "N/A"}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-600">
                      {job.attemptCount}
                    </td>
                    <td className="py-3 px-3 text-rose-600 font-mono text-[11px] max-w-[200px] truncate">
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

export default function OverviewPage() {
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
