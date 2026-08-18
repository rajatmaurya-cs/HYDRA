"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertOctagon, RotateCcw, RefreshCw, CheckCircle2, Eye, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface EndpointInfo {
  id: string;
  name: string;
  url: string;
}

interface EventInfo {
  id: string;
  eventType: string;
  payload: any;
  idempotencyKey: string | null;
  createdAt: string;
}

interface FailedDelivery {
  id: string;
  eventId: string;
  endpointId: string;
  status: "FAILED" | "DEAD" | "PENDING";
  statusCode: number | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: string;
  endpoint: EndpointInfo;
  event: EventInfo;
}

function FailedPageContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [failedDeliveries, setFailedDeliveries] = useState<FailedDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  useEffect(() => {
    if (orgId) {
      fetchFailedDeliveries(orgId);
    } else {
      setLoading(false);
    }
  }, [orgId]);

  const fetchFailedDeliveries = async (targetOrgId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/organizations/${targetOrgId}/logs?status=DEAD`);
      if (res.ok) {
        const data = await res.json();
        setFailedDeliveries(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch failed deliveries:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    if (!orgId) return;
    setIsRefreshing(true);
    fetchFailedDeliveries(orgId);
  };

  const handleRetrySingle = async (deliveryId: string) => {
    if (!orgId) return;
    setRetryingId(deliveryId);

    setFailedDeliveries((prev) =>
      prev.map((item) =>
        item.id === deliveryId ? { ...item, status: "PENDING" } : item
      )
    );

    try {
      const res = await apiFetch(`/api/organizations/${orgId}/logs/${deliveryId}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        
        setTimeout(() => {
          fetchFailedDeliveries(orgId);
        }, 1500);
      } else {
        const errData = await res.json();
        alert(`Retry failed: ${errData.message}`);
        fetchFailedDeliveries(orgId);
      }
    } catch (error) {
      console.error("Error retrying dead job:", error);
      fetchFailedDeliveries(orgId);
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryAll = async () => {
    if (!orgId) return;
    if (!confirm("Are you sure you want to retry all DEAD jobs for this organization?")) return;

    setRetryingAll(true);

    setFailedDeliveries((prev) =>
      prev.map((item) => ({ ...item, status: "PENDING" }))
    );

    try {
      const res = await apiFetch(`/api/organizations/${orgId}/logs/retry-all`, {
        method: "POST",
      });
      if (res.ok) {
        
        setTimeout(() => {
          fetchFailedDeliveries(orgId);
        }, 2000);
      } else {
        const errData = await res.json();
        alert(`Retry All failed: ${errData.message}`);
        fetchFailedDeliveries(orgId);
      }
    } catch (error) {
      console.error("Error retrying all dead jobs:", error);
      fetchFailedDeliveries(orgId);
    } finally {
      setRetryingAll(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-neutral-900 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-rose-600" />
            Dead Letter Queue (DLQ)
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5 font-normal">
            Exhausted webhook deliveries requiring manual re-drive or retry
          </p>
        </div>

        <div className="flex items-center gap-2">
          {failedDeliveries.length > 0 && (
            <button
              onClick={handleRetryAll}
              disabled={retryingAll}
              className="px-3 py-1.5 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-md text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${retryingAll ? "animate-spin" : ""}`} />
              <span>{retryingAll ? "Retrying All..." : "Retry All Dead Jobs"}</span>
            </button>
          )}

          <button
            onClick={handleManualRefresh}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 rounded-md text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : failedDeliveries.length === 0 ? (
        <div className="text-center py-14 bg-neutral-50 border border-neutral-200 rounded-xl p-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-neutral-900">No dead deliveries</h3>
          <p className="text-neutral-500 text-xs mt-1 font-normal">
            All webhook events for this organization have been delivered successfully.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-normal">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-500 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Delivery ID</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Target Endpoint</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Error Message</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {failedDeliveries.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                    
                    <td className="py-3.5 px-4 font-mono font-medium text-neutral-900 text-[11px] select-all">
                      {item.id}
                    </td>

                    
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-neutral-800 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-[11px]">
                        {item.event.eventType}
                      </span>
                    </td>

                    
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-neutral-900 block">{item.endpoint.name}</span>
                      <code className="text-[10px] text-neutral-400 truncate block max-w-[180px] font-mono">
                        {item.endpoint.url}
                      </code>
                    </td>

                    
                    <td className="py-3.5 px-4">
                      {item.status === "PENDING" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 uppercase animate-pulse">
                          RE-QUEUED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                          DEAD (DLQ)
                        </span>
                      )}
                    </td>

                    
                    <td className="py-3.5 px-4 text-neutral-600 font-mono">
                      {item.attemptCount}
                    </td>

                    
                    <td className="py-3.5 px-4 text-rose-600 font-mono text-[11px] max-w-[200px] truncate">
                      {item.errorMessage || "Delivery Error"}
                    </td>

                    
                    <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>

                    
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRetrySingle(item.id)}
                          disabled={retryingId === item.id || item.status === "PENDING"}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded text-[11px] font-normal cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingId === item.id ? "animate-spin" : ""}`} />
                          <span>{retryingId === item.id || item.status === "PENDING" ? "Queued" : "Retry"}</span>
                        </button>
                        <button
                          onClick={() => setSelectedPayload({
                            deliveryId: item.id,
                            eventId: item.eventId,
                            endpointUrl: item.endpoint.url,
                            statusCode: item.statusCode,
                            errorMessage: item.errorMessage,
                            attemptCount: item.attemptCount,
                            payload: item.event.payload,
                          })}
                          className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-[11px] font-normal cursor-pointer transition-all active:scale-95 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {selectedPayload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg p-6 relative shadow-xl font-normal text-xs">
            <button
              onClick={() => setSelectedPayload(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-medium text-neutral-900 mb-3 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-neutral-900" />
              Dead Delivery Details
            </h3>

            <div className="space-y-2.5 mb-4 text-neutral-700">
              <div className="flex justify-between border-b border-neutral-100 pb-2">
                <span className="text-neutral-400">Delivery ID:</span>
                <code className="font-mono text-neutral-900 select-all">{selectedPayload.deliveryId}</code>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-2">
                <span className="text-neutral-400">Event ID:</span>
                <code className="font-mono text-neutral-900 select-all">{selectedPayload.eventId}</code>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-2">
                <span className="text-neutral-400">Target Endpoint:</span>
                <code className="font-mono text-neutral-900 truncate max-w-[280px]">{selectedPayload.endpointUrl}</code>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-2">
                <span className="text-neutral-400">Status Code:</span>
                <span className="font-mono font-medium text-rose-700">{selectedPayload.statusCode || "N/A"}</span>
              </div>
              <div className="border-b border-neutral-100 pb-2">
                <span className="text-rose-600 block mb-1">Error Failure Reason:</span>
                <code className="font-mono text-rose-700 bg-rose-50 p-2 rounded block">{selectedPayload.errorMessage || "Delivery failed"}</code>
              </div>
            </div>

            <label className="font-medium text-neutral-900 block mb-1">Payload Data:</label>
            <pre className="p-3 bg-neutral-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-56">
              {JSON.stringify(selectedPayload.payload, null, 2)}
            </pre>

            <button
              onClick={() => setSelectedPayload(null)}
              className="w-full mt-4 py-1.5 bg-black text-white rounded-md text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function FailedDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <FailedPageContent />
    </Suspense>
  );
}
