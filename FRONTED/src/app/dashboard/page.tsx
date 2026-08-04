"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";

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
  revoked?: boolean;
  createdAt: string;
}

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

type TabType = "overview" | "endpoints" | "events" | "logs" | "failed" | "keys" | "settings";

function DashboardContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgIdFromQuery = searchParams.get("orgId");

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Organizations
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Data State
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalEvents: 0,
    totalSuccessfulEvents: 0,
    totalFailedEvents: 0,
    successRate: 100,
    recentFailedJobs: [],
  });
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modals & Forms State
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [endpointName, setEndpointName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [endpointDesc, setEndpointDesc] = useState("");
  const [endpointEventsList, setEndpointEventsList] = useState<string[]>(["payment.success"]);
  const [eventInputText, setEventInputText] = useState("");

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

  // 2. Set initial organization from URL query param if present
  useEffect(() => {
    if (orgIdFromQuery && organizations.some((o) => o.id === orgIdFromQuery)) {
      setSelectedOrgId(orgIdFromQuery);
    }
  }, [orgIdFromQuery, organizations]);

  // 3. Fetch details whenever selected organization changes
  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgDetails(selectedOrgId);
    } else {
      setEndpoints([]);
      setApiKeys([]);
      setMetrics({
        totalEvents: 0,
        totalSuccessfulEvents: 0,
        totalFailedEvents: 0,
        successRate: 100,
        recentFailedJobs: [],
      });
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
        if (orgList.length > 0 && !orgIdFromQuery) {
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
    setLoadingDetails(true);
    try {
      const [endRes, keyRes, metricRes] = await Promise.all([
        fetch(`http://localhost:2000/api/endpoints?organizationId=${orgId}`, { credentials: "include" }),
        fetch(`http://localhost:2000/api/api-keys?organizationId=${orgId}`, { credentials: "include" }),
        fetch(`http://localhost:2000/api/organizations/${orgId}/metrics`, { credentials: "include" }),
      ]);

      if (endRes.ok) {
        const endData = await endRes.json();
        setEndpoints(endData.endpoints || []);
      }
      if (keyRes.ok) {
        const keyData = await keyRes.json();
        setApiKeys(keyData.apiKeys || []);
      }
      if (metricRes.ok) {
        const metricData = await metricRes.json();
        if (metricData.metrics) {
          setMetrics(metricData.metrics);
        }
      }
    } catch (error) {
      console.error("Failed to load org details:", error);
    } finally {
      setLoadingDetails(false);
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
      setErrorMsg("Failed to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentOrg = organizations.find((o) => o.id === selectedOrgId);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-black">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const navItems: { id: TabType; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "endpoints", label: "Endpoints", icon: "🔗" },
    { id: "events", label: "Events", icon: "📦" },
    { id: "logs", label: "Delivery Logs", icon: "📜" },
    { id: "failed", label: "Failed Deliveries", icon: "❌" },
    { id: "keys", label: "API Credentials", icon: "🔑" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex font-sans pt-16">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-neutral-200 bg-neutral-50/50 flex flex-col justify-between shrink-0 fixed left-0 top-16 bottom-0 z-10">
        <div className="p-5">
          
          {/* HYDRA Logo & Org Selector */}
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-black text-white rounded flex items-center justify-center text-xs">H</span>
              HYDRA
            </h2>

            {/* Organization Selector */}
            <div className="mt-4">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Organization
              </label>
              {loadingOrgs ? (
                <div className="w-4 h-4 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
              ) : (
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-neutral-900 text-xs font-medium focus:outline-none focus:border-black cursor-pointer shadow-2xs"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.slug})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-normal transition-all cursor-pointer ${
                    isActive
                      ? "bg-black text-white font-medium"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-neutral-200/80 text-[11px] text-neutral-400 font-normal">
          HYDRA Webhook Relay v1.0
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 max-w-6xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-neutral-900 capitalize">
              {navItems.find((n) => n.id === activeTab)?.icon} {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
            <p className="text-neutral-500 text-xs mt-0.5 font-normal">
              Managing webhook infrastructure for <strong className="text-neutral-900">{currentOrg?.name || "Organization"}</strong>
            </p>
          </div>

          {activeTab === "endpoints" && (
            <button
              onClick={() => setShowEndpointModal(true)}
              className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs rounded-md transition-all cursor-pointer"
            >
              + Add Endpoint
            </button>
          )}

          {activeTab === "keys" && (
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs rounded-md transition-all cursor-pointer"
            >
              + Generate Key
            </button>
          )}
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

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
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
                <button onClick={() => setActiveTab("failed")} className="text-xs text-neutral-500 hover:text-black font-normal cursor-pointer">
                  View All Failed →
                </button>
              </div>

              {loadingDetails ? (
                <div className="py-8 text-center text-xs text-neutral-400">Loading metrics...</div>
              ) : metrics.recentFailedJobs.length === 0 ? (
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
        )}

        {/* TAB 2: ENDPOINTS */}
        {activeTab === "endpoints" && (
          <div className="space-y-4">
            {endpoints.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-xs text-neutral-500 mb-4">No webhook endpoints registered yet.</p>
                <button
                  onClick={() => setShowEndpointModal(true)}
                  className="px-4 py-2 bg-black text-white text-xs font-normal rounded-md"
                >
                  Create Endpoint
                </button>
              </div>
            ) : (
              endpoints.map((ep) => (
                <div key={ep.id} className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3 className="font-semibold text-sm text-neutral-900">{ep.name}</h3>
                      <span className="text-[9px] font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded uppercase">
                        {ep.status}
                      </span>
                    </div>
                    <code className="text-xs text-neutral-600 font-mono break-all">{ep.url}</code>
                    <div className="mt-2 text-[11px] text-neutral-400">
                      Secret: <code className="text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded font-mono">{ep.secret}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/endpoints/${ep.id}`)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-xs rounded-md self-start sm:self-auto cursor-pointer"
                  >
                    Details →
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: EVENTS */}
        {activeTab === "events" && (
          <div className="p-8 bg-neutral-50 border border-neutral-200 rounded-xl text-center text-xs text-neutral-500">
            📦 Ingested Events Stream will be displayed here in real-time.
          </div>
        )}

        {/* TAB 4: DELIVERY LOGS */}
        {activeTab === "logs" && (
          <div className="p-8 bg-neutral-50 border border-neutral-200 rounded-xl text-center text-xs text-neutral-500">
            📜 Historical Delivery Attempt Logs will be listed here.
          </div>
        )}

        {/* TAB 5: FAILED DELIVERIES */}
        {activeTab === "failed" && (
          <div className="p-8 bg-neutral-50 border border-neutral-200 rounded-xl text-center text-xs text-neutral-500">
            ❌ Failed Webhook Deliveries and Dead Letter Queue (DLQ) re-drive controls.
          </div>
        )}

        {/* TAB 6: API CREDENTIALS */}
        {activeTab === "keys" && (
          <div className="space-y-4">
            {apiKeys.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-xl">
                <p className="text-xs text-neutral-500 mb-4">No active API keys found.</p>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="px-4 py-2 bg-black text-white text-xs font-normal rounded-md"
                >
                  Generate Key
                </button>
              </div>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-neutral-900">{key.name}</span>
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700">
                        {key.environment}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 mt-1">
                    <code className="text-xs text-neutral-900 font-mono select-all break-all bg-neutral-50 px-2.5 py-2 rounded border border-neutral-200 w-full block">
                      {key.prefix}
                    </code>
                    <div className="flex items-center justify-between">
                      {key.revoked ? (
                        <span className="text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded uppercase">
                          REVOKED
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                          ACTIVE
                        </span>
                      )}
                      <button
                        onClick={() => navigator.clipboard.writeText(key.prefix)}
                        className="px-2.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === "settings" && (
          <div className="p-6 bg-white border border-neutral-200 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900">Organization Settings</h3>
            <p className="text-xs text-neutral-500 font-normal">
              Manage organization slug, billing tier, and webhook signing secret.
            </p>
          </div>
        )}

      </main>

      {/* Endpoint Modal */}
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
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEndpointModal(false)} className="px-3 py-1.5 border border-neutral-300 rounded-md">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-black text-white rounded-md">{isSubmitting ? "Saving..." : "Save Endpoint"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6 relative shadow-xl text-xs font-normal">
            <button onClick={() => setShowKeyModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-black">✕</button>
            <h3 className="text-base font-medium text-neutral-900 mb-4">Generate API Key</h3>
            {generatedKey ? (
              <div className="space-y-4">
                <code className="p-3 bg-neutral-50 border border-neutral-200 rounded-md block select-all break-all">{generatedKey}</code>
                <button onClick={() => setShowKeyModal(false)} className="w-full py-2 bg-black text-white rounded-md">Done</button>
              </div>
            ) : (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">Key Name</label>
                  <input
                    type="text"
                    placeholder="Backend Ingestion"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 border border-neutral-300 rounded-md"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowKeyModal(false)} className="px-3 py-1.5 border border-neutral-300 rounded-md">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-black text-white rounded-md">{isSubmitting ? "Generating..." : "Generate"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
