"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Menu,
  X,
  User as UserIcon,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between">
        
        {/* Left: Brand & Main Navigation */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform active:scale-98"
          >
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-mono font-bold text-xs tracking-tight shadow-2xs group-hover:bg-neutral-800 transition-colors">
              H
            </div>
            <span className="font-semibold tracking-tight text-sm text-neutral-900">
              HYDRA
            </span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/organizations"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  pathname.startsWith("/organizations")
                    ? "text-neutral-950 font-medium bg-neutral-100"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 font-normal"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Organizations</span>
              </Link>

              <Link
                href="/dashboard"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                  pathname.startsWith("/dashboard")
                    ? "text-neutral-950 font-medium bg-neutral-100"
                    : "text-neutral-600 hover:text-neutral-950 hover:bg-neutral-50 font-normal"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
            </nav>
          )}
        </div>

        {/* Right: Auth Controls */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-neutral-300 border-t-black rounded-full animate-spin" />
          ) : user ? (
            
            /* User Profile Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold tracking-tight shadow-2xs">
                  {getUserInitials(user.name, user.email)}
                </div>
                <span className="hidden sm:inline-block text-xs font-medium text-neutral-800 max-w-[120px] truncate">
                  {user.name || user.email.split("@")[0]}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-neutral-200 rounded-xl shadow-lg py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-neutral-100">
                    <p className="text-xs font-medium text-neutral-900 truncate">
                      {user.name || "Signed in"}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/organizations"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:text-black hover:bg-neutral-50 transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Organizations</span>
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-neutral-700 hover:text-black hover:bg-neutral-50 transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Dashboard</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            /* Unauthenticated Links */
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-xs font-medium text-neutral-700 hover:text-black px-2.5 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white text-xs font-medium rounded-lg transition-all shadow-2xs"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle */}
          {user && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-1.5 text-neutral-600 hover:text-black rounded-md"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-6 py-3 space-y-1">
          <Link
            href="/organizations"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 rounded-md font-medium"
          >
            <Building2 className="w-4 h-4 text-neutral-400" />
            <span>Organizations</span>
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-50 rounded-md font-medium"
          >
            <LayoutDashboard className="w-4 h-4 text-neutral-400" />
            <span>Dashboard</span>
          </Link>
        </div>
      )}
    </header>
  );
}
