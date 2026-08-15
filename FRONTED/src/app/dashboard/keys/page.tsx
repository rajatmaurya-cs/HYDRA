"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Plus, Copy, RotateCcw, Trash2, X, Check } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  revoked?: boolean;
  createdAt: string;
}

function ApiKeysPageContent() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyEnv, setKeyEnv] = useState("TEST");
  const [generatedKey, setGeneratedKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (orgId) {
      fetchApiKeys(orgId);
    }
  }, [orgId]);

  const fetchApiKeys = async (targetOrgId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:2000/api/api-keys?organizationId=${targetOrgId}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

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
          organizationId: orgId,
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

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API Key?")) return;
    try {
      const res = await fetch(`http://localhost:2000/api/api-keys/${keyId}/revoke`, {
        method: "PATCH",
        credentials: "include",
      });
      if (res.ok) {
        setApiKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, revoked: true } : k)));
      }
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const handleRotateKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to rotate this API Key? The current key will be revoked.")) return;
    try {
      const res = await fetch(`http://localhost:2000/api/api-keys/${keyId}/rotate`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        alert(`API Key rotated successfully!\n\nNew Key:\n${data.rawKey}`);
        if (orgId) fetchApiKeys(orgId);
      }
    } catch (error) {
      console.error("Failed to rotate API key:", error);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-neutral-900 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-neutral-900" />
            API Credentials
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5 font-normal">
            Bearer authentication tokens for request ingestion
          </p>
        </div>
        <button
          onClick={() => setShowKeyModal(true)}
          className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs rounded-md transition-all cursor-pointer font-normal flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Generate Key
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-xl">
          <p className="text-xs text-neutral-500 mb-4 font-normal">No active API keys found.</p>
          <button
            onClick={() => setShowKeyModal(true)}
            className="px-4 py-2 bg-black text-white text-xs font-normal rounded-md cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div key={key.id} className="p-5 bg-white border border-neutral-200 rounded-xl shadow-2xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-neutral-900">{key.name}</span>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700">
                    {key.environment}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 font-normal">
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
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyToClipboard(key.prefix, key.id)}
                      className="px-2.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal cursor-pointer flex items-center gap-1"
                    >
                      {copiedKeyId === key.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    {!key.revoked && (
                      <>
                        <button
                          onClick={() => handleRotateKey(key.id)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 rounded text-xs font-normal cursor-pointer flex items-center gap-1"
                          title="Rotate Key (Revokes current key & issues new one)"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Rotate</span>
                        </button>
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-normal cursor-pointer flex items-center gap-1"
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

      {/* Generate API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6 relative shadow-xl text-xs font-normal">
            <button onClick={() => setShowKeyModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-black">
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-medium text-neutral-900 mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-neutral-900" />
              Generate API Key
            </h3>
            {generatedKey ? (
              <div className="space-y-4">
                <code className="p-3 bg-neutral-50 border border-neutral-200 rounded-md block select-all break-all">{generatedKey}</code>
                <button onClick={() => setShowKeyModal(false)} className="w-full py-2 bg-black text-white rounded-md cursor-pointer">Done</button>
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
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">Environment</label>
                  <select value={keyEnv} onChange={(e) => setKeyEnv(e.target.value)} className="w-full px-3.5 py-2 border border-neutral-300 rounded-md">
                    <option value="TEST">TEST</option>
                    <option value="LIVE">LIVE</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowKeyModal(false)} className="px-3 py-1.5 border border-neutral-300 rounded-md">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 bg-black text-white rounded-md">{isSubmitting ? "Generating..." : "Generate Key"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function ApiKeysDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <ApiKeysPageContent />
    </Suspense>
  );
}
