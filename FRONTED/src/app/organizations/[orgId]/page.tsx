"use client";

import React, { useState, useEffect, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  KeyRound,
  Copy,
  Check,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  revoked?: boolean;
  createdAt: string;
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [org, setOrg] = useState<Organization | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && orgId) {
      fetchDetails();
    }
  }, [user, orgId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const orgResponse = await apiFetch(`/api/organizations/${orgId}`, {
        method: "GET",
      });

      if (orgResponse.ok) {
        const data = await orgResponse.json();
        const orgData = data.organization;
        setOrg(orgData);
        setApiKeys(orgData.apiKeys || []);
      } else {
        router.push("/organizations");
      }
    } catch (error) {
      console.error("Failed to load details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API Key? Any application using this key will lose access immediately.")) {
      return;
    }
    try {
      const response = await apiFetch(`/api/api-keys/${keyId}/revoke`, {
        method: "PATCH",
      });
      if (response.ok) {
        setApiKeys((prev) =>
          prev.map((k) => (k.id === keyId ? { ...k, revoked: true } : k))
        );
      } else {
        alert("Failed to revoke API key.");
      }
    } catch (error) {
      console.error("Revoke API key error:", error);
    }
  };

  const handleRotateKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to rotate this API Key? The current key will be revoked and a new key will be generated.")) {
      return;
    }
    try {
      const response = await apiFetch(`/api/api-keys/${keyId}/rotate`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        alert(`API Key rotated successfully!\n\nNew Raw Key:\n${data.rawKey}\n\nMake sure to copy it now as it won't be shown again!`);
        fetchDetails();
      } else {
        alert(data.message || "Failed to rotate API key.");
      }
    } catch (error) {
      console.error("Rotate API key error:", error);
    }
  };

  const copyKeyPrefix = (prefix: string, keyId: string) => {
    navigator.clipboard.writeText(prefix);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
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
        
        <button
          onClick={() => router.push("/organizations")}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 transition-colors mb-5 text-xs cursor-pointer font-normal"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Organizations</span>
        </button>

        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 pb-5 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Organization</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs font-medium text-neutral-600 font-mono">/{org.slug}</span>
            </div>
            <h1 className="text-3xl font-medium tracking-tight text-neutral-900 mt-1">
              {org.name}
            </h1>
            {org.description && (
              <p className="text-neutral-500 text-xs mt-1 font-normal">
                {org.description}
              </p>
            )}
          </div>
          <button
            onClick={() => router.push(`/dashboard?orgId=${org.id}`)}
            className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-normal transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Open Dashboard</span>
          </button>
        </div>

        
        <div className="p-6 bg-neutral-50/70 border border-neutral-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-medium text-neutral-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-neutral-900" />
                API Credentials
              </h2>
              <p className="text-neutral-500 text-xs mt-0.5 font-normal">Use these API keys to send events to this organization.</p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/keys?orgId=${org.id}`)}
              className="px-3 py-1.5 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-md text-xs font-normal text-neutral-800 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Manage in Console</span>
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div className="text-center py-6 bg-white border border-neutral-200/80 rounded-lg text-neutral-500 text-xs font-normal">
              No active API keys found for this organization.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="p-4 bg-white border border-neutral-200 rounded-lg flex flex-col gap-2 shadow-2xs"
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

                  <div className="flex flex-col gap-2 mt-1">
                    <code className="text-xs text-neutral-900 font-mono font-normal select-all break-all bg-neutral-50 px-2.5 py-2 rounded border border-neutral-200 w-full block">
                      {key.prefix}
                    </code>
                    <div className="flex items-center justify-between">
                      {key.revoked ? (
                        <span className="text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded w-fit uppercase">
                          REVOKED
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded w-fit uppercase">
                          ACTIVE
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyKeyPrefix(key.prefix, key.id)}
                          className="px-2.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                        >
                          {copiedKeyId === key.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKeyId === key.id ? "Copied" : "Copy"}</span>
                        </button>
                        {!key.revoked && (
                          <>
                            <button
                              onClick={() => handleRotateKey(key.id)}
                              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded text-xs font-normal cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                              title="Rotate Key (Revokes current key & issues new one)"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Rotate</span>
                            </button>
                            <button
                              onClick={() => handleRevokeKey(key.id)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-normal cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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

