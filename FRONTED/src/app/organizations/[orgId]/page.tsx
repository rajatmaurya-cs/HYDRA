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

export default function OrganizationDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [org, setOrg] = useState<Organization | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [eventsText, setEventsText] = useState("payment.success");
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
      // 1. Fetch organization details
      const orgResponse = await fetch(`http://localhost:2000/api/organizations/${orgId}`, {
        method: "GET",
        credentials: "include",
      });

      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrg(orgData.organization);

        // 2. Fetch endpoints
        const endResponse = await fetch(`http://localhost:2000/api/endpoints?organizationId=${orgId}`, {
          method: "GET",
          credentials: "include",
        });

        if (endResponse.ok) {
          const endData = await endResponse.json();
          setEndpoints(endData.endpoints || []);
        }
      } else {
        router.push("/organizations"); // Redirect if org not found or forbidden
      }
    } catch (error) {
      console.error("Failed to load details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim() || !url.trim()) {
      setFormError("Name and Webhook URL are required.");
      return;
    }

    const parsedEvents = eventsText
      .split(",")
      .map((ev) => ev.trim())
      .filter((ev) => ev.length > 0);

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
          subscribedEvents: parsedEvents,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEndpoints((prev) => [...prev, data.endpoint]);
        setName("");
        setUrl("");
        setDescription("");
        setEventsText("payment.success");
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!org) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black text-white pt-24 pb-12 px-6 md:px-12 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Link & Header */}
        <button
          onClick={() => router.push("/organizations")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Organizations
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              {org.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure and manage Webhooks endpoints for <code>/{org.slug}</code>
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Endpoint
            </button>
          )}
        </div>

        {/* Add Endpoint Form Card */}
        {showForm && (
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 md:p-8 mb-8 animate-fade-in relative">
            <button
              onClick={() => {
                setShowForm(false);
                setFormError("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold mb-4">Add Webhook Endpoint</h2>

            {formError && (
              <div className="p-4 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEndpoint} className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Endpoint Name
                </label>
                <input
                  type="text"
                  placeholder="Production Webhook Receiver"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://api.yourdomain.com/webhooks"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Subscribed Events (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="payment.success, user.created"
                  value={eventsText}
                  onChange={(e) => setEventsText(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Explain what this webhook receiver is used for."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError("");
                  }}
                  className="px-5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/10 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Endpoint"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Endpoints List */}
        {endpoints.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.01] border border-white/[0.05] rounded-2xl p-8">
            <svg className="w-12 h-12 text-slate-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="text-lg font-bold">No webhook endpoints found</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              You haven't configured any endpoints for this organization.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer"
            >
              Add Your First Endpoint
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                className="bg-white/[0.02] border border-white/[0.08] hover:border-indigo-500/30 p-6 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-base text-white">{ep.name}</h3>
                    <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {ep.status}
                    </span>
                  </div>
                  <code className="text-xs text-indigo-300 font-mono break-all">{ep.url}</code>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-slate-500">
                    <span>Secret: <code className="text-slate-400 bg-white/5 px-2 py-0.5 rounded font-mono">{ep.secret}</code></span>
                    <span>Created {new Date(ep.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
