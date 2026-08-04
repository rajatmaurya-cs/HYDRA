"use client";

import React, { useState, useEffect, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface EndpointDetail {
  id: string;
  name: string;
  url: string;
  description?: string;
  secret: string;
  status: string;
  isPaused: boolean;
  subscribedEvents: string[];
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function EndpointDetailPage({ params }: { params: Promise<{ endpointId: string }> }) {
  const { endpointId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [endpoint, setEndpoint] = useState<EndpointDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && endpointId) {
      fetchEndpoint();
    }
  }, [user, endpointId]);

  const fetchEndpoint = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:2000/api/endpoints/${endpointId}`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setEndpoint(data.endpoint);
      } else {
        router.push("/organizations");
      }
    } catch (error) {
      console.error("Failed to load endpoint details:", error);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (endpoint?.secret) {
      navigator.clipboard.writeText(endpoint.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-black">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!endpoint) return null;

  return (
    <div className="min-h-screen bg-white text-neutral-900 pt-24 pb-12 px-6 md:px-12 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Link to Organization */}
        <button
          onClick={() => router.push(`/organizations/${endpoint.organization.id}`)}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors mb-5 text-xs cursor-pointer font-normal"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to {endpoint.organization.name}
        </button>

        {/* Endpoint Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 pb-5 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {endpoint.organization.name}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-[10px] font-normal text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded uppercase">
                {endpoint.status}
              </span>
              {endpoint.isPaused && (
                <span className="text-[10px] font-normal text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase">
                  PAUSED
                </span>
              )}
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-neutral-900">
              {endpoint.name}
            </h1>
            {endpoint.description && (
              <p className="text-neutral-500 text-xs mt-1 font-normal">
                {endpoint.description}
              </p>
            )}
          </div>
        </div>

        {/* Detailed Information Cards */}
        <div className="space-y-6">

          {/* Webhook URL Card */}
          <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-2xs">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Webhook Target URL
            </h2>
            <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
              <code className="text-xs text-neutral-900 font-mono font-normal break-all select-all">
                {endpoint.url}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(endpoint.url)}
                className="ml-3 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal shrink-0 cursor-pointer active:scale-95 transition-all"
              >
                Copy URL
              </button>
            </div>
          </div>

          {/* Webhook Secret Card */}
          <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-2xs">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Signing Secret
            </h2>
            <p className="text-neutral-500 text-xs mb-3 font-normal">
              This secret is used to generate the <code className="text-neutral-800 bg-neutral-100 px-1 py-0.5 rounded font-mono">Hydra-Signature</code> header for verifying webhook authenticity.
            </p>
            <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
              <code className="text-xs text-neutral-900 font-mono font-normal break-all select-all">
                {endpoint.secret}
              </code>
              <button
                onClick={copySecret}
                className="ml-3 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal shrink-0 cursor-pointer active:scale-95 transition-all"
              >
                {copiedSecret ? "Copied!" : "Copy Secret"}
              </button>
            </div>
          </div>

          {/* Subscribed Events Card */}
          <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Subscribed Events ({endpoint.subscribedEvents.length})
              </h2>
            </div>

            {endpoint.subscribedEvents.length === 0 ? (
              <p className="text-neutral-400 text-xs italic">No event subscriptions configured for this endpoint.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {endpoint.subscribedEvents.map((ev) => (
                  <div
                    key={ev}
                    className="flex items-center gap-2 bg-neutral-50 border border-neutral-200/90 px-3 py-2 rounded-lg"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <code className="text-xs text-neutral-800 font-mono font-normal truncate">{ev}</code>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata Info */}
          <div className="p-4 bg-neutral-50/50 border border-neutral-200/80 rounded-xl flex items-center justify-between text-xs text-neutral-500 font-normal">
            <span>Endpoint ID: <code className="font-mono text-neutral-700">{endpoint.id}</code></span>
            <span>Created {new Date(endpoint.createdAt).toLocaleString()}</span>
          </div>

        </div>

      </div>
    </div>
  );
}
