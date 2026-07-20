"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
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
  expiresAt?: string;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Organizations
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Endpoints list & creation
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [endpointName, setEndpointName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [endpointDesc, setEndpointDesc] = useState("");
  const [endpointEventsList, setEndpointEventsList] = useState<string[]>(["payment.success"]);
  const [eventInputText, setEventInputText] = useState("");

  // API Keys list & creation
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyEnv, setKeyEnv] = useState("TEST");
  const [generatedKey, setGeneratedKey] = useState(""); // Plain text key shown exactly once

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // 1. Fetch user's organizations
  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  // 2. Fetch endpoints and API Keys when selected organization changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgDetails(selectedOrgId);
    } else {
      setEndpoints([]);
      setApiKeys([]);
    }
  }, [selectedOrgId]);

  const fetchOrganizations = async () => {
    try {
      setLoadingOrgs(true);
      const response = await fetch("http://localhost:2000/api/organizations", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        const orgList = data.organizations || [];
        setOrganizations(orgList);
        if (orgList.length > 0) {
          setSelectedOrgId(orgList[0].id); // Auto-select first org
        }
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchOrgDetails = async (orgId: string) => {
    setLoadingEndpoints(true);
    setLoadingKeys(true);
    try {
      // Fetch Endpoints
      const endResponse = await fetch(`http://localhost:2000/api/endpoints?organizationId=${orgId}`, {
        method: "GET",
        credentials: "include",
      });
      if (endResponse.ok) {
        const endData = await endResponse.json();
        setEndpoints(endData.endpoints || []);
      }

      // Fetch API Keys
      const keyResponse = await fetch(`http://localhost:2000/api/api-keys?organizationId=${orgId}`, {
        method: "GET",
        credentials: "include",
      });
      if (keyResponse.ok) {
        const keyData = await keyResponse.json();
        setApiKeys(keyData.apiKeys || []);
      }
    } catch (error) {
      console.error("Failed to load org details:", error);
    } finally {
      setLoadingEndpoints(false);
      setLoadingKeys(false);
    }
  };

  const handleAddEvent = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const cleanEvent = eventInputText.trim();
    if (!cleanEvent) return;
    if (endpointEventsList.includes(cleanEvent)) {
      setEventInputText("");
      return;
    }
    setEndpointEventsList((prev) => [...prev, cleanEvent]);
    setEventInputText("");
  };

  const handleRemoveEvent = (eventToRemove: string) => {
    setEndpointEventsList((prev) => prev.filter((ev) => ev !== eventToRemove));
  };

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (!selectedOrgId) {
      setErrorMsg("Please select an organization.");
      return;
    }

    if (endpointEventsList.length === 0) {
      setErrorMsg("At least one subscribed event is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:2000/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: selectedOrgId,
          name: endpointName,
          url: endpointUrl,
          description: endpointDesc || undefined,
          subscribedEvents: endpointEventsList,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setEndpoints((prev) => [...prev, data.endpoint]);
        setEndpointName("");
        setEndpointUrl("");
        setEndpointDesc("");
        setEndpointEventsList(["payment.success"]);
        setEventInputText("");
        setShowEndpointModal(false);
        setSuccessMsg("Endpoint created successfully!");
      } else {
        setErrorMsg(data.message || "Failed to create endpoint.");
      }
    } catch (error) {
      setErrorMsg("Failed to connect to the backend server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setGeneratedKey("");
    if (!selectedOrgId) {
      setErrorMsg("Please select an organization.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:2000/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: selectedOrgId,
          name: keyName,
          environment: keyEnv,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setApiKeys((prev) => [...prev, data.apiKey]);
        setGeneratedKey(data.rawKey); // Store plain text raw key to display once
        setKeyName("");
        // Keep keyModal open to show the raw API key!
      } else {
        setErrorMsg(data.message || "Failed to generate API Key.");
      }
    } catch (error) {
      setErrorMsg("Failed to connect to the backend server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black text-white pt-24 pb-12 px-6 md:px-12 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Top bar with Select Organization dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Developer Console
            </h1>
            <p className="text-slate-400 text-sm mt-1">Manage endpoints and credentials.</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Org:</label>
            {loadingOrgs ? (
              <div className="w-24 h-8 bg-white/5 rounded-lg animate-pulse" />
            ) : organizations.length === 0 ? (
              <button
                onClick={() => router.push("/organizations")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold"
              >
                Create an Org First
              </button>
            ) : (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Global Alerts */}
        {successMsg && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Main Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Endpoints Panel */}
          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">Webhooks Endpoints</h2>
                {selectedOrgId && (
                  <button
                    onClick={() => setShowEndpointModal(true)}
                    className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    + Add Endpoint
                  </button>
                )}
              </div>

              {loadingEndpoints ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : endpoints.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No endpoints configured. Webhooks events will have nowhere to deliver.
                </div>
              ) : (
                <div className="space-y-4">
                  {endpoints.map((ep) => (
                    <div key={ep.id} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{ep.name}</span>
                        <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                          {ep.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono break-all">{ep.url}</p>
                      <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between">
                        <span>Secret: <code className="text-slate-400 font-mono">{ep.secret.substring(0, 12)}...</code></span>
                        <span>Added {new Date(ep.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* API Keys Panel */}
          <div className="bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold">API Credentials</h2>
                {selectedOrgId && (
                  <button
                    onClick={() => {
                      setGeneratedKey("");
                      setShowKeyModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    + Generate Key
                  </button>
                )}
              </div>

              {loadingKeys ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No active API Keys. Create a key to access the Hydra developer APIs.
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-all flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-sm">{key.name}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md ${
                            key.environment === 'LIVE' 
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                              : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                          }`}>
                            {key.environment}
                          </span>
                        </div>
                        <code className="text-xs text-slate-400 font-mono">{key.prefix}••••••••••••</code>
                      </div>
                      <span className="text-[10px] text-slate-500 self-end">
                        Issued {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ─── CREATE ENDPOINT MODAL ─── */}
      {showEndpointModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-fade-in">
            <button
              onClick={() => {
                setShowEndpointModal(false);
                setErrorMsg("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-lg font-bold mb-4">Add Webhook Endpoint</h3>
            <form onSubmit={handleCreateEndpoint} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Endpoint Name</label>
                <input
                  type="text"
                  required
                  placeholder="Production Webhook Receiver"
                  value={endpointName}
                  onChange={(e) => setEndpointName(e.target.value)}
                  className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Endpoint URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/webhooks"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Subscribed Events</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. payment.success"
                    value={eventInputText}
                    onChange={(e) => setEventInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEvent();
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEvent()}
                    className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                {/* Event tag pills */}
                {endpointEventsList.length > 0 && (
                  <div className="flex flex-col gap-1.5 items-start mt-1">
                    {endpointEventsList.map((ev) => (
                      <span
                        key={ev}
                        className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] pl-2.5 pr-1.5 py-0.5 rounded-full flex items-center gap-1"
                      >
                        {ev}
                        <button
                          type="button"
                          onClick={() => handleRemoveEvent(ev)}
                          className="hover:text-rose-400 text-indigo-400/60 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Description (Optional)</label>
                <textarea
                  placeholder="Receiver for transaction state change webhooks."
                  value={endpointDesc}
                  onChange={(e) => setEndpointDesc(e.target.value)}
                  rows={2}
                  className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Adding..." : "Add Endpoint"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATE API KEY MODAL ─── */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-fade-in">
            <button
              onClick={() => {
                setShowKeyModal(false);
                setGeneratedKey("");
                setErrorMsg("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-lg font-bold mb-4">Generate API Key</h3>

            {generatedKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs leading-relaxed">
                  ⚠️ <strong>Save this key now!</strong> For security reasons, you cannot retrieve it again once this modal is closed.
                </div>
                <div className="p-3 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-between">
                  <code className="text-xs font-mono text-white select-all break-all">{generatedKey}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedKey)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Copy to Clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowKeyModal(false);
                    setGeneratedKey("");
                  }}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-semibold cursor-pointer"
                >
                  I've saved it
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Backend Server Key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Environment</label>
                  <select
                    value={keyEnv}
                    onChange={(e) => setKeyEnv(e.target.value)}
                    className="px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white cursor-pointer"
                  >
                    <option value="TEST">TEST</option>
                    <option value="LIVE">LIVE</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-bold text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Generating..." : "Generate Key"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
