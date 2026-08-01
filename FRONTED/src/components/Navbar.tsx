"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-14 flex items-center justify-between text-neutral-900">
        
        {/* Brand Logo (Minimalist Icon Only - HYDRA Text Removed) */}
        <Link 
          href="/" 
          className="flex items-center group transition-transform active:scale-95"
          aria-label="Home"
        >
          <div className="w-7 h-7 rounded-md bg-black text-white flex items-center justify-center font-normal text-xs tracking-wider transition-colors group-hover:bg-neutral-800">
            H
          </div>
        </Link>

        {/* Navigation & User Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-neutral-300 rounded-full border-t-black animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/organizations"
                className={`text-xs font-normal transition-all px-3 py-1.5 rounded-md ${
                  pathname === "/organizations"
                    ? "text-black bg-neutral-100"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-50"
                }`}
              >
                Organizations
              </Link>
              <Link
                href="/dashboard"
                className={`text-xs font-normal transition-all px-3 py-1.5 rounded-md ${
                  pathname === "/dashboard"
                    ? "text-black bg-neutral-100"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-50"
                }`}
              >
                Console
              </Link>
              <span className="text-xs font-normal text-neutral-400 hidden md:inline">
                {user.email}
              </span>
              <button
                onClick={logout}
                className="text-xs font-normal text-neutral-600 hover:text-black border border-neutral-200 hover:border-neutral-300 px-3 py-1.5 rounded-md transition-all active:scale-95 cursor-pointer ml-1"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className={`text-xs font-normal transition-all px-3 py-1.5 rounded-md ${
                  pathname === "/login"
                    ? "text-black bg-neutral-100"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-50"
                }`}
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="text-xs font-normal px-3.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-md transition-all active:scale-95"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
