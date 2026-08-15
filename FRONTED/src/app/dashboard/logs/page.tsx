"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollText, RefreshCw, Eye, X } from "lucide-react";

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

interface DeliveryLog {
  id: string;
  eventId: string;
  endpointId: string;
  status: "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED" | "DEAD";
  statusCode: number | null;
  errorMessage: string | null;
  attemptCount: number;
  deliveredAt: string | null;
  createdAt: string;
  endpoint: EndpointInfo;
  event: EventInfo;
}

function LogsPageContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  useEffect(() => {
    if (orgId) {
      fetchLogs(orgId, statusFilter);
    }
  }, [orgId, statusFilter]);

  const fetchLogs = async (targetOrgId: string, status: string) => {
    setLoading(true);
    try {
      const url = `http://localhost:2000/api/organizations/${targetOrgId}/logs${
        status !== "ALL" ? `?status=${status}` : ""
      }`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch delivery logs:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    if (!orgId) return;
    setIsRefreshing(true);
    fetchLogs(orgId, statusFilter);
  };

  const getStatusBadge = (status: string, statusCode: number | null) => {
    switch (status) {
      case "DELIVERED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
            DELIVERED ({statusCode || 200})
          </span>
        );
      case "FAILED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 uppercase">
            FAILED ({statusCode || "ERR"})
          </span>
        );
      case "DEAD":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 uppercase">
            DEAD (DLQ)
          </span>
        );
      case "PROCESSING":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 uppercase animate-pulse">
            PROCESSING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 uppercase">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-neutral-900 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-neutral-900" />
            Delivery Logs
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5 font-normal">
            Historical HTTP webhook attempt logs and response statuses (EventDeliveryWebhook)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs font-normal focus:outline-none focus:border-black cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="FAILED">FAILED</option>
            <option value="DEAD">DEAD (DLQ)</option>
            <option value="PENDING">PENDING</option>
          </select>

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
      ) : logs.length === 0 ? (
        <div className="text-center py-14 bg-neutral-50 border border-neutral-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-neutral-900">No delivery logs found</h3>
          <p className="text-neutral-500 text-xs mt-1 font-normal">
            Webhook delivery attempts dispatched to your endpoints will appear here.
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
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/80 transition-colors">
                    {/* Delivery ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-neutral-900 text-[11px] select-all">
                      {log.id}
                    </td>

                    {/* Event Type */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-neutral-800 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-[11px]">
                        {log.event.eventType}
                      </span>
                    </td>

                    {/* Target Endpoint */}
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-neutral-900 block">{log.endpoint.name}</span>
                      <code className="text-[10px] text-neutral-400 truncate block max-w-[200px] font-mono">
                        {log.endpoint.url}
                      </code>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(log.status, log.statusCode)}
                    </td>

                    {/* Attempt Count */}
                    <td className="py-3.5 px-4 text-neutral-600 font-mono">
                      {log.attemptCount}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    {/* Action Payload */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedPayload({
                          deliveryId: log.id,
                          eventId: log.eventId,
                          endpointUrl: log.endpoint.url,
                          statusCode: log.statusCode,
                          errorMessage: log.errorMessage,
                          attemptCount: log.attemptCount,
                          deliveredAt: log.deliveredAt,
                          payload: log.event.payload,
                        })}
                        className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded text-[11px] font-normal cursor-pointer transition-all active:scale-95 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivery Log Modal Inspector */}
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
              Delivery Webhook Details
            </h3>

            <div className="space-y-3 mb-4 text-neutral-700">
              <div className="flex justify-between border-b border-neutral-100 pb-2">
                <span className="text-neutral-400">Delivery ID:</span>
                <code className="font-mono text-neutral-900 select-all">{selectedPayload.deliveryId}</code>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-2">
                <span className="text-neutral-400">Event ID:</span>
                <code className="font-mono text-neutral-900 select-all">{selectedPayload.eventId}</code>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-2">
                <span className="text-neutral-400">Target URL:</span>
                <code className="font-mono text-neutral-900 truncate max-w-[280px]">{selectedPayload.endpointUrl}</code>
              </div>
              <div className="flex justify-between border-b border-neutral-100 pb-2">
                <span className="text-neutral-400">HTTP Status Code:</span>
                <span className="font-mono font-medium">{selectedPayload.statusCode || "N/A"}</span>
              </div>
              {selectedPayload.errorMessage && (
                <div className="border-b border-neutral-100 pb-2">
                  <span className="text-rose-600 block mb-1">Error Message:</span>
                  <code className="font-mono text-rose-700 bg-rose-50 p-2 rounded block">{selectedPayload.errorMessage}</code>
                </div>
              )}
            </div>

            <label className="font-medium text-neutral-900 block mb-1">Sent Payload Data:</label>
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

export default function LogsDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <LogsPageContent />
    </Suspense>
  );
}
