"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Layers,
  Terminal,
  Building2,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Menu,
  X,
  ExternalLink,
  User as UserIcon,
  Sparkles,
} from "lucide-react";





export type AuthRequirement = "authenticated" | "unauthenticated" | "all";

export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  external?: boolean;
  badge?: string;
  authRequirement?: AuthRequirement;
  matchMode?: "exact" | "prefix";
}

export interface NavbarProps {
  className?: string;
  fluid?: boolean;
}





const NAV_LINKS: NavLinkItem[] = [
  {
    id: "home",
    label: "Overview",
    href: "/",
    matchMode: "exact",
    authRequirement: "all",
  },
  {
    id: "organizations",
    label: "Organizations",
    href: "/organizations",
    icon: Building2,
    matchMode: "prefix",
    authRequirement: "authenticated",
  },
  {
    id: "dashboard",
    label: "Console",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchMode: "prefix",
    authRequirement: "authenticated",
  },
 
];





export default function Navbar({ className = "", fluid = false }: NavbarProps) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userDropdownOpen]);

  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  
  const isLinkActive = useCallback(
    (item: NavLinkItem): boolean => {
      if (item.external) return false;
      if (item.matchMode === "exact") {
        return pathname === item.href;
      }
      return pathname.startsWith(item.href);
    },
    [pathname]
  );

  
  const visibleNavLinks = NAV_LINKS.filter((item) => {
    if (!item.authRequirement || item.authRequirement === "all") return true;
    if (item.authRequirement === "authenticated") return Boolean(user);
    if (item.authRequirement === "unauthenticated") return !user;
    return true;
  });

  const getUserInitials = (name?: string, email?: string): string => {
    if (name && name.trim().length > 0) {
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.trim().length > 0) {
      return email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200/70 transition-all ${className}`}
    >
      <div
        className={`mx-auto px-4 sm:px-6 md:px-8 h-14 flex items-center justify-between ${
          fluid ? "w-full" : "max-w-7xl"
        }`}
      >
        
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform active:scale-98"
            aria-label="HYDRA Home"
          >
            <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-mono font-semibold text-xs tracking-wider shadow-xs group-hover:bg-neutral-800 transition-colors">
              H
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-sm text-neutral-900">
                HYDRA
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">
                v1.0
              </span>
            </div>
          </Link>

          
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {visibleNavLinks.map((item) => {
              const active = isLinkActive(item);
              const Icon = item.icon;

              if (item.external) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-normal text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80 rounded-md transition-colors"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
                    <span>{item.label}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-400" />
                  </a>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all ${
                    active
                      ? "text-neutral-950 font-medium bg-neutral-100 shadow-2xs"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70 font-normal"
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        active ? "text-neutral-900" : "text-neutral-400"
                      }`}
                    />
                  )}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-neutral-200 text-neutral-700">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        
        <div className="flex items-center gap-2 sm:gap-3">
          {isLoading ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-3.5 h-3.5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
            </div>
          ) : user ? (
            
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-neutral-200/90 hover:border-neutral-300 bg-neutral-50/60 hover:bg-neutral-100/80 transition-all cursor-pointer text-left"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-6 h-6 rounded-md bg-neutral-900 text-white flex items-center justify-center text-[10px] font-medium tracking-wide shrink-0">
                  {getUserInitials(user.name, user.email)}
                </div>
                <div className="hidden sm:flex flex-col text-left max-w-[140px]">
                  <span className="text-xs font-medium text-neutral-900 truncate leading-tight">
                    {user.name || user.email.split("@")[0]}
                  </span>
                  <span className="text-[10px] text-neutral-500 truncate leading-tight">
                    {user.email}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-neutral-100">
                    <p className="text-xs font-medium text-neutral-900 truncate">
                      {user.name || "Authenticated User"}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/organizations"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Organizations</span>
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Developer Console</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50/60 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`text-xs font-normal transition-all px-3 py-1.5 rounded-md ${
                  pathname === "/login"
                    ? "text-neutral-950 bg-neutral-100 font-medium"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-xs font-medium px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-md transition-all shadow-xs active:scale-98 flex items-center gap-1.5"
              >
                <span>Get Started</span>
              </Link>
            </div>
          )}

          
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className="md:hidden border-b border-neutral-200 bg-white/95 backdrop-blur-lg px-4 pt-2 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <nav className="flex flex-col space-y-1">
            {visibleNavLinks.map((item) => {
              const active = isLinkActive(item);
              const Icon = item.icon;

              if (item.external) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 text-xs font-normal text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="w-4 h-4 text-neutral-400" />}
                      <span>{item.label}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  </a>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 text-xs rounded-md ${
                    active
                      ? "bg-neutral-100 text-neutral-950 font-medium"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 font-normal"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {Icon && (
                      <Icon
                        className={`w-4 h-4 ${
                          active ? "text-neutral-900" : "text-neutral-400"
                        }`}
                      />
                    )}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-neutral-200 text-neutral-700">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          
          {user ? (
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-neutral-900 text-white flex items-center justify-center text-xs font-medium">
                  {getUserInitials(user.name, user.email)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-neutral-900 truncate max-w-[180px]">
                    {user.name || user.email}
                  </span>
                  <span className="text-[10px] text-neutral-500 truncate max-w-[180px]">
                    {user.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="text-xs text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-neutral-100 grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-xs font-medium text-white bg-black hover:bg-neutral-800 rounded-md transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
