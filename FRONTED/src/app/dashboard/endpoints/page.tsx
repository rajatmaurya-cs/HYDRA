"use client";

import React, { useState, useEffect, Suspense } from "react";

import { useSearchParams, useRouter } from "next/navigation";

interface Endpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  status: string;
  createdAt: string;
}

function EndpointsPageContent() {

  const router = useRouter();

  const searchParams = useSearchParams();
  
  const orgId = searchParams.get("orgId");

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [endpointName, setEndpointName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [endpointDesc, setEndpointDesc] = useState("");
  const [endpointEventsList, setEndpointEventsList] = useState<string[]>(["payment.success"]);
  const [eventInputText, setEventInputText] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (orgId) {
      fetchEndpoints(orgId);
    }
  }, [orgId]);

  const fetchEndpoints = async (targetOrgId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:2000/api/endpoints?organizationId=${targetOrgId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data.endpoints || []);
      }
    } catch (error) {
      console.error("Failed to fetch endpoints:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEventTag = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const clean = eventInputText.trim();
    if (!clean) return;
    if (endpointEventsList.includes(clean)) {
      setEventInputText("");
      return;
    }
    setEndpointEventsList((prev) => [...prev, clean]);
    setEventInputText("");
  };

  const handleRemoveEventTag = (eventToRemove: string) => {
    setEndpointEventsList((prev) => prev.filter((ev) => ev !== eventToRemove));
  };

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!endpointName.trim() || !endpointUrl.trim()) {
      setErrorMsg("Name and Webhook URL are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:2000/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: orgId,
          name: endpointName,
          url: endpointUrl,
          description: endpointDesc || undefined,
          subscribedEvents: endpointEventsList,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setEndpoints((prev) => [...prev, data.endpoint]);
        setSuccessMsg("Webhook endpoint created successfully!");
        setEndpointName("");
        setEndpointUrl("");
        setEndpointDesc("");
        setShowEndpointModal(false);
      } else {
        setErrorMsg(data.message || "Failed to create endpoint.");
      }
    } catch (error) {
      setErrorMsg("Failed to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
            🔗 Webhook Endpoints
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5 font-normal">
            Destinations receiving HTTP webhook events
          </p>
        </div>
        <button
          onClick={() => setShowEndpointModal(true)}
          className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs rounded-md transition-all cursor-pointer"
        >
          + Add Endpoint
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 mb-6 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between font-normal">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="cursor-pointer">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 mb-6 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-normal">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="cursor-pointer">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : endpoints.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-xl">
          <p className="text-xs text-neutral-500 mb-4 font-normal">No webhook endpoints registered yet.</p>
          <button
            onClick={() => setShowEndpointModal(true)}
            className="px-4 py-2 bg-black text-white text-xs font-normal rounded-md cursor-pointer"
          >
            Create Endpoint
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <div key={ep.id} className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="font-semibold text-sm text-neutral-900">{ep.name}</h3>
                  <span className="text-[9px] font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded uppercase">
                    {ep.status}
                  </span>
                </div>
                <code className="text-xs text-neutral-600 font-mono break-all font-normal">{ep.url}</code>
                <div className="mt-2 text-[11px] text-neutral-400 font-normal">
                  Secret: <code className="text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded font-mono">{ep.secret}</code>
                </div>
              </div>
              <button
                onClick={() => router.push(`/endpoints/${ep.id}`)}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-xs rounded-md self-start sm:self-auto cursor-pointer font-normal"
              >
                Details →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Register Endpoint Modal */}
      {showEndpointModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg p-6 relative shadow-xl">
            <button onClick={() => setShowEndpointModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-black">✕</button>
            <h3 className="text-base font-medium text-neutral-900 mb-4">Register Webhook Endpoint</h3>
            <form onSubmit={handleCreateEndpoint} className="space-y-4 font-normal text-xs">
              <div>
                <label className="font-medium text-neutral-700 block mb-1">Endpoint Name</label>
                <input
                  type="text"
                  placeholder="Primary Receiver"
                  value={endpointName}
                  onChange={(e) => setEndpointName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-md"
                />
              </div>
              <div>
                <label className="font-medium text-neutral-700 block mb-1">Webhook Target URL</label>
                <input
                  type="url"
                  placeholder="https://api.domain.com/webhook"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-neutral-300 rounded-md"
                />
              </div>
              <div>
                <label className="font-medium text-neutral-700 block mb-1">Subscribed Events</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="payment.success"
                    value={eventInputText}
                    onChange={(e) => setEventInputText(e.target.value)}
                    className="flex-1 px-3 py-2 border border-neutral-300 rounded-md"
                  />
                  <button type="button" onClick={() => handleAddEventTag()} className="px-3 bg-black text-white rounded-md">+ Add</button>
                </div>
                {endpointEventsList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {endpointEventsList.map((ev) => (
                      <span key={ev} className="inline-flex items-center gap-1.5 bg-neutral-100 border border-neutral-200 text-neutral-800 font-mono text-xs px-2.5 py-0.5 rounded">
                        {ev}
                        <button type="button" onClick={() => handleRemoveEventTag(ev)} className="hover:text-rose-600">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEndpointModal(false)} className="px-3 py-1.5 border border-neutral-300 rounded-md">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-black text-white rounded-md">{isSubmitting ? "Saving..." : "Save Endpoint"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function EndpointsDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <EndpointsPageContent />
    </Suspense>
  );
}
