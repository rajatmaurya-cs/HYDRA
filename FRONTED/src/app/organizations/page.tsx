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

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [createdOrgName, setCreatedOrgName] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch organizations
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

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    // Convert to lowercase, replace spaces and special chars with hyphens
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
        // Add new org to state
        setOrganizations((prev) => [...prev, data.organization]);
        if (data.defaultApiKey) {
          setCreatedApiKey(data.defaultApiKey);
          setCreatedOrgName(data.organization.name);
        }
        // Reset form
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
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black text-white pt-24 pb-12 px-6 md:px-12 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Organizations
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Select or create an organization to manage your projects.
            </p>
          </div>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Organization
            </button>
          )}
        </div>

        {/* Create Form Card */}
        {showCreateForm && (
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 md:p-8 mb-8 animate-fade-in relative">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setFormError("");
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold mb-4">Create New Organization</h2>

            {formError && (
              <div className="p-4 mb-6 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Organization Name
                </label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={name}
                  onChange={handleNameChange}
                  required
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Slug (URL Safe)
                </label>
                <input
                  type="text"
                  placeholder="acme-corp"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  required
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Billing Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="billing@acme.com"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="What does this organization do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
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
                      Creating...
                    </>
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Organizations List */}
        {loadingOrgs ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.01] border border-white/[0.05] rounded-2xl p-8">
            <svg className="w-12 h-12 text-slate-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-bold">No organizations found</h3>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              You are not a member of any organization. Create one to get started.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer"
            >
              Create First Organization
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-white/[0.02] border border-white/[0.08] hover:border-indigo-500/30 hover:bg-white/[0.04] p-6 rounded-2xl transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-all">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-semibold tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase">
                      {org.plan}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold group-hover:text-indigo-300 transition-colors">
                    {org.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">/{org.slug}</p>
                  {org.description && (
                    <p className="text-slate-400 text-sm mt-3 line-clamp-2">
                      {org.description}
                    </p>
                  )}
                </div>
                <div className="mt-6 border-t border-white/5 pt-4 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => router.push(`/organizations/${org.id}`)}
                    className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Manage
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generated API Key Modal Popup */}
        {createdApiKey && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-fade-in">
              <button
                onClick={() => setCreatedApiKey("")}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h3 className="text-xl font-bold mb-1">Organization Created!</h3>
              <p className="text-slate-400 text-xs mb-4">
                Here is your default TEST API Key for <strong className="text-white">{createdOrgName}</strong>:
              </p>

              <div className="p-3 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-between gap-2 mb-4">
                <code className="text-xs font-mono text-indigo-300 select-all break-all">{createdApiKey}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdApiKey)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  Copy
                </button>
              </div>

              <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg mb-4">
                ⚠️ Store this API Key safely. You can use it in <code>Authorization: Bearer</code> headers.
              </p>

              <button
                onClick={() => setCreatedApiKey("")}
                className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
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
