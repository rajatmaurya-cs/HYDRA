"use client";

import React, { useState, useEffect, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  Play,
  Pause,
  Trash2,
  AlertTriangle,
  X,
  ArrowLeft,
  Link2,
  Lock,
} from "lucide-react";

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
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Pause & Delete Action States
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

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

  const copyUrl = () => {
    if (endpoint?.url) {
      navigator.clipboard.writeText(endpoint.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleTogglePause = async () => {
    if (!endpoint) return;
    setIsTogglingPause(true);
    setActionError("");

    try {
      const response = await fetch(`http://localhost:2000/api/endpoints/${endpoint.id}/toggle-pause`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok) {
        setEndpoint((prev) => (prev ? { ...prev, isPaused: data.endpoint.isPaused } : null));
      } else {
        setActionError(data.message || "Failed to toggle pause status.");
      }
    } catch (error) {
      setActionError("Failed to connect to server.");
    } finally {
      setIsTogglingPause(false);
    }
  };

  const handleDeleteEndpoint = async () => {
    if (!endpoint) return;
    setIsDeleting(true);
    setActionError("");

    try {
      const response = await fetch(`http://localhost:2000/api/endpoints/${endpoint.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setEndpoint((prev) => (prev ? { ...prev, status: "DELETED", isPaused: true } : null));
        setShowDeleteModal(false);
      } else {
        const data = await response.json();
        setActionError(data.message || "Failed to delete endpoint.");
        setShowDeleteModal(false);
      }
    } catch (error) {
      setActionError("Failed to delete endpoint. Server connection error.");
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
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

  const isDeleted = endpoint.status === "DELETED";

  return (
    <div className="min-h-screen bg-white text-neutral-900 pt-24 pb-12 px-6 md:px-12 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Link to Dashboard Endpoints */}
        <button
          onClick={() => router.push(`/dashboard/endpoints?orgId=${endpoint.organization.id}`)}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors mb-5 text-xs cursor-pointer font-normal"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Webhook Endpoints</span>
        </button>

        {/* Action Notifications */}
        {actionError && (
          <div className="p-3 mb-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between font-normal">
            <span>{actionError}</span>
            <button onClick={() => setActionError("")} className="cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Deleted Endpoint Alert Banner */}
        {isDeleted && (
          <div className="p-4 mb-6 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-normal flex items-center gap-2.5 shadow-2xs">
            <AlertTriangle className="w-4 h-4 text-neutral-600 shrink-0" />
            <span>
              <strong>Endpoint Deleted:</strong> New webhook events will not be delivered to this URL. All historical delivery logs and metrics remain preserved.
            </span>
          </div>
        )}

        {/* Endpoint Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 pb-5 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {endpoint.organization.name}
              </span>
              <span className="text-neutral-300">•</span>
              <span
                className={`text-[10px] font-normal px-2 py-0.5 rounded uppercase ${
                  isDeleted
                    ? "text-rose-700 bg-rose-50 border border-rose-200"
                    : "text-neutral-600 bg-neutral-100 border border-neutral-200"
                }`}
              >
                {endpoint.status}
              </span>
              {endpoint.isPaused && !isDeleted && (
                <span className="text-[10px] font-normal text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase">
                  PAUSED
                </span>
              )}
            </div>
            <h1 className={`text-3xl font-medium tracking-tight ${isDeleted ? "text-neutral-500 line-through" : "text-neutral-900"}`}>
              {endpoint.name}
            </h1>
            {endpoint.description && (
              <p className="text-neutral-500 text-xs mt-1 font-normal">
                {endpoint.description}
              </p>
            )}
          </div>

          {/* Quick Header Actions */}
          {!isDeleted ? (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleTogglePause}
                disabled={isTogglingPause}
                className={`px-3.5 py-1.5 rounded-md text-xs font-normal transition-all cursor-pointer border flex items-center gap-1.5 ${
                  endpoint.isPaused
                    ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600"
                    : "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-300"
                }`}
              >
                {isTogglingPause ? (
                  "Updating..."
                ) : endpoint.isPaused ? (
                  <>
                    <Play className="w-3 h-3" />
                    <span>Resume Endpoint</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3" />
                    <span>Pause Endpoint</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Endpoint</span>
              </button>
            </div>
          ) : (
            <span className="px-3 py-1 bg-neutral-100 border border-neutral-200 text-neutral-500 rounded-md text-xs font-normal self-start sm:self-auto">
              Deleted
            </span>
          )}
        </div>

        {/* Detailed Information Cards */}
        <div className="space-y-6">

          {/* Webhook URL Card */}
          <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-2xs">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-neutral-500" />
              Webhook Target URL
            </h2>
            <div className="flex items-center justify-between bg-neutral-50 border border-neutral-200 p-3 rounded-lg">
              <code className="text-xs text-neutral-900 font-mono font-normal break-all select-all">
                {endpoint.url}
              </code>
              <button
                onClick={copyUrl}
                className="ml-3 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
              >
                {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUrl ? "Copied" : "Copy URL"}</span>
              </button>
            </div>
          </div>

          {/* Webhook Secret Card */}
          <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-2xs">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-neutral-500" />
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
                className="ml-3 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
              >
                {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSecret ? "Copied" : "Copy Secret"}</span>
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

          {/* Danger Zone Card */}
          {!isDeleted && (
            <div className="p-6 bg-rose-50/30 border border-rose-200 rounded-xl">
              <h2 className="text-xs font-semibold text-rose-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Danger Zone
              </h2>
              <p className="text-xs text-neutral-600 mb-4 font-normal">
                Delete this webhook endpoint and stop all future event deliveries to this URL. Historical delivery logs are preserved.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-normal transition-all active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Webhook Endpoint</span>
              </button>
            </div>
          )}

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-neutral-900">Delete Webhook Endpoint?</h3>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-neutral-800">{endpoint.name}</strong>? HYDRA will immediately stop delivering new events to this destination. All historical logs and delivery metrics will remain intact.
              </p>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-neutral-300 rounded-lg text-xs font-normal text-neutral-700 hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEndpoint}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-normal transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

