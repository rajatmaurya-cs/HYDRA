"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
}

export default function OrganizationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [createdOrgName, setCreatedOrgName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  const fetchOrganizations = async () => {
    try {
      setLoadingOrgs(true);
      const response = await fetch("http://localhost:2000/api/organizations", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    const suggestedSlug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    setSlug(suggestedSlug);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim() || !slug.trim()) {
      setFormError("Name and slug are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:2000/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          slug,
          description: description || undefined,
          billingEmail: billingEmail || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setOrganizations((prev) => [...prev, data.organization]);
        if (data.defaultApiKey) {
          setCreatedApiKey(data.defaultApiKey);
          setCreatedOrgName(data.organization.name);
        }
        setName("");
        setSlug("");
        setDescription("");
        setBillingEmail("");
        setShowCreateForm(false);
      } else {
        setFormError(data.message || "Failed to create organization.");
      }
    } catch (error) {
      setFormError("Failed to connect to the backend server.");
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
      <div className="max-w-4xl mx-auto">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200/80 pb-5 mb-8">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
              Organizations
            </h1>
            <p className="text-neutral-500 text-xs mt-1 font-normal">
              Select or create an organization to manage your webhooks and credentials.
            </p>
          </div>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-normal transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Organization
            </button>
          )}
        </div>

        {showCreateForm && (
          <div className="bg-neutral-50/70 border border-neutral-200 rounded-xl p-6 mb-8 relative">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setFormError("");
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-base font-medium text-neutral-900 mb-0.5">Create New Organization</h2>
            <p className="text-xs text-neutral-500 mb-5 font-normal">
              Organizations store your endpoints, API credentials, and webhooks history.
            </p>

            {formError && (
              <div className="p-3 mb-5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-normal">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider">
                  Organization Name
                </label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={name}
                  onChange={handleNameChange}
                  required
                  className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black transition-all font-normal"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider">
                  URL Slug
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-neutral-400 font-mono">/</span>
                  <input
                    type="text"
                    placeholder="acme-corp"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="w-full pl-6 pr-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black transition-all font-mono font-normal"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider">
                  Billing Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="billing@acme.com"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black transition-all font-normal"
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-[11px] font-medium text-neutral-700 uppercase tracking-wider">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="What does this organization do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-white border border-neutral-300 rounded-md text-neutral-900 text-xs placeholder-neutral-400 focus:outline-none focus:border-black transition-all resize-none font-normal"
                />
              </div>

              <div className="flex justify-end gap-2 md:col-span-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
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
                  {isSubmitting ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </form>
          </div>
        )}

        {loadingOrgs ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-14 bg-neutral-50/50 border border-neutral-200/80 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-900">No organizations found</h3>
            <p className="text-neutral-500 text-xs mt-1 mb-5 font-normal">
              You are not a member of any organization. Create one to get started.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-md text-xs font-normal transition-all cursor-pointer"
            >
              Create First Organization
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-white border border-neutral-200 hover:border-neutral-400 p-5 rounded-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-md bg-black text-white flex items-center justify-center font-normal text-xs">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[9px] font-normal text-neutral-600 bg-neutral-100 border border-neutral-200/80 px-2 py-0.5 rounded uppercase">
                      {org.plan}
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-neutral-900">{org.name}</h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5 font-normal">/{org.slug}</p>
                  {org.description && (
                    <p className="text-neutral-600 text-xs mt-2 line-clamp-2 font-normal leading-relaxed">
                      {org.description}
                    </p>
                  )}
                </div>
                <div className="mt-5 border-t border-neutral-100 pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400 font-normal">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => router.push(`/organizations/${org.id}`)}
                    className="text-xs font-medium text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Manage →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {createdApiKey && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md p-6 relative shadow-xl">
              <button
                onClick={() => setCreatedApiKey("")}
                className="absolute top-4 right-4 text-neutral-400 hover:text-black transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h3 className="text-base font-medium text-neutral-900 mb-1">Organization Created!</h3>
              <p className="text-neutral-500 text-xs mb-4 font-normal">
                Here is your default TEST API Key for <strong className="font-medium text-neutral-900">{createdOrgName}</strong>:
              </p>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md flex items-center justify-between gap-2 mb-4">
                <code className="text-xs font-mono text-neutral-900 select-all break-all font-normal">{createdApiKey}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdApiKey)}
                  className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white rounded text-xs font-normal cursor-pointer shrink-0"
                >
                  Copy
                </button>
              </div>

              <p className="text-[11px] text-neutral-600 bg-neutral-50 border border-neutral-200 p-2.5 rounded-md mb-4 font-normal">
                ⚠️ Store this API Key safely. Use it in <code>Authorization: Bearer</code> headers.
              </p>

              <button
                onClick={() => setCreatedApiKey("")}
                className="w-full py-2 bg-black hover:bg-neutral-800 text-white font-normal rounded-md text-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
