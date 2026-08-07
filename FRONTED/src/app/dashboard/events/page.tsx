"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface WebhookDelivery {
  id: string;
  status: string;
  endpoint: {
    id: string;
    name: string;
    url: string;
  };
}

interface RawEvent {
  id: string;
  eventType: string;
  status: string;
  createdAt: string;
  idempotencyKey: string | null;
  payload: any;
  webhookDeliveries: WebhookDelivery[];
}

function EventsPageContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);

  useEffect(() => {
    if (orgId) {
      fetchEvents(orgId);
    }
  }, [orgId]);

  const fetchEvents = async (targetOrgId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:2000/v1/events?organizationId=${targetOrgId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch raw events:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
            📦 Ingested Raw Events
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5 font-normal">
            Raw event log and destination endpoint delivery status
          </p>
        </div>
        <button
          onClick={() => orgId && fetchEvents(orgId)}
          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 rounded-md text-xs font-normal transition-all cursor-pointer flex items-center gap-1"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-14 bg-neutral-50 border border-neutral-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-neutral-900">No raw events found</h3>
          <p className="text-neutral-500 text-xs mt-1 font-normal">
            Ingest events via POST /v1/events using your API Key to see them here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-normal">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/70 text-neutral-500 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Event ID</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Target Endpoints Used</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-neutral-50/80 transition-colors">
                    
                    {/* Event ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-neutral-900 text-[11px] select-all">
                      {ev.id}
                    </td>

                    {/* Event Type */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-semibold text-neutral-800 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded text-[11px]">
                        {ev.eventType}
                      </span>
                    </td>

                    {/* Event Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[9px] font-semibold px-2 py-0.5 rounded border uppercase ${
                          ev.status === "DELIVERED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ev.status === "FAILED" || ev.status === "DEAD"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ev.status}
                      </span>
                    </td>

                    {/* Endpoints Used */}
                    <td className="py-3.5 px-4">
                      {ev.webhookDeliveries.length === 0 ? (
                        <span className="text-neutral-400 text-[11px]">None (0 Subscribed)</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ev.webhookDeliveries.map((del) => (
                            <span
                              key={del.id}
                              className="inline-flex items-center gap-1 bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] px-2 py-0.5 rounded"
                              title={`Target: ${del.endpoint.url}`}
                            >
                              <span className="font-medium">{del.endpoint.name}</span>
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  del.status === "DELIVERED"
                                    ? "bg-emerald-500"
                                    : del.status === "FAILED" || del.status === "DEAD"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                                }`}
                              />
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-neutral-500 font-mono text-[11px]">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>

                    {/* Payload Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedPayload(ev.payload)}
                        className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded text-[11px] font-normal cursor-pointer transition-all active:scale-95"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg p-6 relative shadow-xl font-normal">
            <button
              onClick={() => setSelectedPayload(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-base font-medium text-neutral-900 mb-3">Event Payload Data</h3>
            <pre className="p-4 bg-neutral-900 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto max-h-96">
              {JSON.stringify(selectedPayload, null, 2)}
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

export default function RawEventsDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <EventsPageContent />
    </Suspense>
  );
}
