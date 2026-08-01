"use client";

import React, { useState, useEffect, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Endpoint {
  id: string;
  name: string;
  url: string;
  secret: string;
  status: string;
  createdAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  createdAt: string;
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [org, setOrg] = useState<Organization | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [subscribedEvents, setSubscribedEvents] = useState<string[]>(["payment.success"]);
  const [eventInput, setEventInput] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to login if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load details
  useEffect(() => {
    if (user && orgId) {
      fetchDetails();
    }
  }, [user, orgId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const orgResponse = await fetch(`http://localhost:2000/api/organizations/${orgId}`, {
        method: "GET",
        credentials: "include",
      });

      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrg(orgData.organization);

        const endResponse = await fetch(`http://localhost:2000/api/endpoints?organizationId=${orgId}`, {
          method: "GET",
          credentials: "include",
        });

        if (endResponse.ok) {
          const endData = await endResponse.json();
          setEndpoints(endData.endpoints || []);
        }

        const keyResponse = await fetch(`http://localhost:2000/api/api-keys?organizationId=${orgId}`, {
          method: "GET",
          credentials: "include",
        });

        if (keyResponse.ok) {
          const keyData = await keyResponse.json();
          setApiKeys(keyData.apiKeys || []);
        }
      } else {
        router.push("/organizations");
      }
    } catch (error) {
      console.error("Failed to load details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const cleanEvent = eventInput.trim();
    if (!cleanEvent) return;
    if (subscribedEvents.includes(cleanEvent)) {
      setEventInput("");
      return;
    }
    setSubscribedEvents((prev) => [...prev, cleanEvent]);
    setEventInput("");
  };

  const handleRemoveEvent = (eventToRemove: string) => {
    setSubscribedEvents((prev) => prev.filter((ev) => ev !== eventToRemove));
  };

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim() || !url.trim()) {
      setFormError("Name and Webhook URL are required.");
      return;
    }

    if (subscribedEvents.length === 0) {
      setFormError("At least one subscribed event is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:2000/api/endpoints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organizationId: orgId,
          name,
          url,
          description: description || undefined,
          subscribedEvents: subscribedEvents,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEndpoints((prev) => [...prev, data.endpoint]);
        setName("");
        setUrl("");
        setDescription("");
        setSubscribedEvents(["payment.success"]);
        setEventInput("");
        setShowForm(false);
      } else {
        setFormError(data.message || "Failed to create endpoint.");
      }
    } catch (error) {
      setFormError("Failed to connect to the backend server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-black">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="min-h-screen bg-white text-neutral-900 pt-24 pb-12 px-6 md:px-12 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Link & Header */}
        <button
          onClick={() => router.push("/organizations")}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors mb-5 text-xs cursor-pointer font-normal"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Organizations
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 pb-5 mb-8">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
              {org.name}
            </h1>
            <p className="text-neutral-500 text-xs mt-1 font-normal">
              Configure endpoints and credentials for <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono">/{org.slug}</code>
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-normal transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Endpoint
            </button>
          )}
        </div>

        {/* Add Endpoint Form Card */}
        {showForm && (
          <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-6 mb-8 relative">
            <button
              onClick={() => {
                setShowForm(false);
                setFormError("");
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-base font-medium text-neutral-900 mb-4">Add Webhook Endpoint</h2>

            {formError && (
              <div className="p-3 mb-5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-normal">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateEndpoint} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider">
                  Endpoint Name
                </label>
                <input
                  type="text"
                  placeholder="Production Webhook Receiver"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black font-normal"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://api.yourdomain.com/webhooks"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black font-normal"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider">
                  Subscribed Events
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. payment.success"
                    value={eventInput}
                    onChange={(e) => setEventInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEvent();
                      }
                    }}
                    className="flex-1 px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black font-normal"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEvent()}
                    className="px-3 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-normal flex items-center justify-center cursor-pointer transition-all"
                  >
                    + Add
                  </button>
                </div>
                {/* Event tag pills */}
                {subscribedEvents.length > 0 && (
                  <div className="mt-2 bg-white border border-neutral-200/90 rounded-lg p-3 space-y-2 w-fit min-w-[240px]">
                    <span className="text-[10px] font-normal text-neutral-400 uppercase tracking-wider block mb-1">
                      Active Subscriptions ({subscribedEvents.length})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {subscribedEvents.map((ev) => (
                        <div
                          key={ev}
                          className="flex items-center justify-between bg-neutral-50 border border-neutral-200/80 px-2.5 py-1 rounded transition-all gap-3"
                        >
                          <code className="text-xs text-neutral-800 font-mono font-normal">{ev}</code>
                          <button
                            type="button"
                            onClick={() => handleRemoveEvent(ev)}
                            className="text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title={`Remove ${ev}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Explain what this webhook receiver is used for."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black resize-none font-normal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError("");
                  }}
                  className="px-3.5 py-1.5 bg-white border border-neutral-300 rounded-md text-xs font-normal text-neutral-700 hover:text-black hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-normal transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? "Adding..." : "Add Endpoint"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Endpoints List */}
        {endpoints.length === 0 ? (
          <div className="text-center py-14 bg-neutral-50/50 border border-neutral-200/80 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-900">No webhook endpoints found</h3>
            <p className="text-neutral-500 text-xs mt-1 mb-5 font-normal">
              You haven't configured any endpoints for this organization.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-normal transition-all cursor-pointer"
            >
              Add Your First Endpoint
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                className="bg-white border border-neutral-200 hover:border-neutral-400 p-5 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-medium text-sm text-neutral-900">{ep.name}</h3>
                    <span className="text-[9px] font-normal text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded uppercase">
                      {ep.status}
                    </span>
                  </div>
                  <code className="text-xs text-neutral-600 font-mono break-all font-normal">{ep.url}</code>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-neutral-400 font-normal">
                    <span>Secret: <code className="text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded font-mono">{ep.secret}</code></span>
                    <span>Created {new Date(ep.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Credentials Section */}
        <div className="mt-12 pt-7 border-t border-neutral-200/80">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-medium text-neutral-900">API Credentials</h2>
              <p className="text-neutral-500 text-xs mt-0.5 font-normal">API keys configured for this organization.</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 rounded-md text-xs font-normal text-neutral-800 transition-all cursor-pointer"
            >
              Manage in Console →
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="text-center py-7 bg-neutral-50/50 border border-neutral-200/80 rounded-lg text-neutral-500 text-xs font-normal">
              No active API keys found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="p-4 bg-white border border-neutral-200 rounded-lg flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-neutral-900">{key.name}</span>
                      <span className="text-[9px] font-normal px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700">
                        {key.environment}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <code className="text-xs text-neutral-900 font-mono font-normal select-all break-all bg-neutral-50 px-2 py-1.5 rounded border border-neutral-200 flex-1">
                      {key.prefix}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(key.prefix)}
                      className="px-2.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal shrink-0 cursor-pointer"
                    >
                      Copy Key
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
