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
  const [generatedKey, setGeneratedKey] = useState("");

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
          setSelectedOrgId(orgList[0].id);
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
    } catch (error) {
      console.error("Failed to load org details:", error);
    } finally {
      setLoadingEndpoints(false);
      setLoadingKeys(false);
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
        setSuccessMsg("Webhook endpoint registered successfully!");
        setEndpointName("");
        setEndpointUrl("");
        setEndpointDesc("");
        setEndpointEventsList(["payment.success"]);
        setEventInputText("");
        setShowEndpointModal(false);
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

    if (!keyName.trim()) {
      setErrorMsg("API key name is required.");
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
        setApiKeys((prev) => [data.apiKey, ...prev]);
        setGeneratedKey(data.rawKey);
        setKeyName("");
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
      <div className="flex items-center justify-center min-h-screen bg-white text-black">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 pt-24 pb-12 px-6 md:px-12 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Top bar with Select Organization dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 pb-5 mb-8">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
              Developer Console
            </h1>
            <p className="text-neutral-500 text-xs mt-1 font-normal">
              Manage webhook dispatchers and API authorization credentials.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-normal uppercase tracking-wider text-neutral-600">
              Org:
            </label>
            {loadingOrgs ? (
              <div className="w-4 h-4 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
            ) : (
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="px-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-md text-neutral-900 text-xs font-normal focus:outline-none focus:border-black cursor-pointer"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => router.push("/organizations")}
              className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-normal transition-all cursor-pointer"
            >
              + New Org
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-3.5 mb-6 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between font-normal">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="font-normal cursor-pointer">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 mb-6 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between font-normal">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="font-normal cursor-pointer">✕</button>
          </div>
        )}

        {/* Console Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          
          {/* Webhook Endpoints Panel */}
          <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 mb-5">
                <div>
                  <h2 className="text-base font-medium text-neutral-900">Webhook Endpoints</h2>
                  <p className="text-xs text-neutral-500 font-normal">Destinations receiving HTTP webhooks</p>
                </div>
                <button
                  onClick={() => setShowEndpointModal(true)}
                  disabled={!selectedOrgId}
                  className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-normal rounded-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  + Add Endpoint
                </button>
              </div>

              {loadingEndpoints ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
                </div>
              ) : endpoints.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs font-normal">
                  No endpoints configured for this organization.
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {endpoints.map((ep) => (
                    <div key={ep.id} className="p-4 bg-white border border-neutral-200/90 rounded-lg hover:border-neutral-400 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs text-neutral-900">{ep.name}</span>
                        <span className="text-[9px] font-normal text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded uppercase">
                          {ep.status}
                        </span>
                      </div>
                      <code className="text-xs text-neutral-600 font-mono break-all block mb-2 font-normal">{ep.url}</code>
                      <div className="text-[10px] text-neutral-400 flex justify-between font-normal">
                        <span>Secret: <code className="text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded font-mono">{ep.secret}</code></span>
                        <span>{new Date(ep.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* API Credentials Panel */}
          <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200/80 mb-5">
                <div>
                  <h2 className="text-base font-medium text-neutral-900">API Credentials</h2>
                  <p className="text-xs text-neutral-500 font-normal">Bearer tokens for request ingestion</p>
                </div>
                <button
                  onClick={() => setShowKeyModal(true)}
                  disabled={!selectedOrgId}
                  className="px-3 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-normal rounded-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  + Generate Key
                </button>
              </div>

              {loadingKeys ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs font-normal">
                  No active API keys found.
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="p-4 bg-white border border-neutral-200/90 rounded-lg hover:border-neutral-400 transition-all flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-neutral-900">{key.name}</span>
                          <span className="text-[9px] font-normal text-neutral-600 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded">
                            {key.environment}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-normal">
                          {new Date(key.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <code className="text-xs text-neutral-900 font-mono font-normal select-all break-all bg-neutral-50 px-2 py-1 rounded border border-neutral-200 flex-1">
                          {key.prefix}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(key.prefix)}
                          className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded text-[10px] font-normal shrink-0 cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal: Create Webhook Endpoint */}
        {showEndpointModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg p-6 relative shadow-xl">
              <button
                onClick={() => setShowEndpointModal(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer"
              >
                ✕
              </button>

              <h3 className="text-base font-medium text-neutral-900 mb-4">Register Webhook Endpoint</h3>

              <form onSubmit={handleCreateEndpoint} className="space-y-4 font-normal">
                <div>
                  <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider block mb-1">
                    Endpoint Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Primary Ingestion Webhook"
                    value={endpointName}
                    onChange={(e) => setEndpointName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black font-normal"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider block mb-1">
                    Webhook Target URL
                  </label>
                  <input
                    type="url"
                    placeholder="http://localhost:4000/webhook"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black font-normal"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider block mb-1">
                    Subscribed Events
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="payment.success"
                      value={eventInputText}
                      onChange={(e) => setEventInputText(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black font-normal"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddEventTag()}
                      className="px-3 bg-black hover:bg-neutral-800 text-white text-xs font-normal rounded-md cursor-pointer transition-all"
                    >
                      + Add
                    </button>
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
                  <button
                    type="button"
                    onClick={() => setShowEndpointModal(false)}
                    className="px-3.5 py-1.5 bg-white border border-neutral-300 text-neutral-700 text-xs font-normal rounded-md hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-black text-white text-xs font-normal rounded-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Save Endpoint"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Generate API Key */}
        {showKeyModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6 relative shadow-xl font-normal">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setGeneratedKey("");
                }}
                className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer"
              >
                ✕
              </button>

              <h3 className="text-base font-medium text-neutral-900 mb-4">Generate API Key</h3>

              {generatedKey ? (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-600 font-normal">
                    Here is your newly generated API Key. Copy it now:
                  </p>
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-neutral-900 select-all break-all font-normal">{generatedKey}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedKey)}
                      className="px-2.5 py-1 bg-black text-white rounded text-xs font-normal cursor-pointer shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowKeyModal(false);
                      setGeneratedKey("");
                    }}
                    className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-normal rounded-md text-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateApiKey} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider block mb-1">
                      Key Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Backend Production Ingestion"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black font-normal"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider block mb-1">
                      Environment
                    </label>
                    <select
                      value={keyEnv}
                      onChange={(e) => setKeyEnv(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs font-normal focus:outline-none focus:border-black cursor-pointer"
                    >
                      <option value="TEST">TEST</option>
                      <option value="LIVE">LIVE</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowKeyModal(false)}
                      className="px-3.5 py-1.5 bg-white border border-neutral-300 text-neutral-700 text-xs font-normal rounded-md hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-normal rounded-md cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? "Generating..." : "Generate Key"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
