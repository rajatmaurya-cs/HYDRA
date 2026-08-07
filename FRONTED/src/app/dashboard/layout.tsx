"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

function DashboardSidebarContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const orgIdFromQuery = searchParams.get("orgId");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch user's organizations
  useEffect(() => {
    if (user) {
      fetchOrganizations();
    }
  }, [user]);

  // Sync selected organization ID from URL query if present
  useEffect(() => {
    if (orgIdFromQuery && organizations.some((o) => o.id === orgIdFromQuery)) {
      setSelectedOrgId(orgIdFromQuery);
    }
  }, [orgIdFromQuery, organizations]);

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
          const defaultOrgId = orgList[0].id;
          setSelectedOrgId(defaultOrgId);
          router.replace(`${pathname}?orgId=${defaultOrgId}`);
        }
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleOrgChange = (newOrgId: string) => {
    setSelectedOrgId(newOrgId);
    router.push(`${pathname}?orgId=${newOrgId}`);
  };

  const navItems = [
    { path: "/dashboard", label: "Overview", icon: "🏠" },
    { path: "/dashboard/endpoints", label: "Endpoints", icon: "🔗" },
    { path: "/dashboard/events", label: "Events", icon: "📦" },
    { path: "/dashboard/logs", label: "Delivery Logs", icon: "📜" },
    { path: "/dashboard/failed", label: "Failed Deliveries", icon: "❌" },
    { path: "/dashboard/keys", label: "API Credentials", icon: "🔑" },
    { path: "/dashboard/settings", label: "Settings", icon: "⚙️" },
  ];

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white text-black">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex font-sans pt-16">
      
      {/* Sidebar Navigation - Persists across all dashboard routes */}
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
                  onChange={(e) => handleOrgChange(e.target.value)}
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
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(`${item.path}?orgId=${selectedOrgId}`)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-normal transition-all cursor-pointer ${
                    isActive
                      ? "bg-black text-white font-medium shadow-xs"
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

      {/* Main Content Render Area */}
      <main className="flex-1 ml-64 p-8 max-w-6xl">
        {children}
      </main>

    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
      </div>
    }>
      <DashboardSidebarContent>{children}</DashboardSidebarContent>
    </Suspense>
  );
}
