"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-950/40 backdrop-blur-md border-b border-white/[0.06] py-4 px-6 md:px-12 flex justify-between items-center">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-indigo-500/10 group-hover:scale-105 transition-all">
          H
        </div>
        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent group-hover:text-white transition-colors">
          HYDRA
        </span>
      </Link>

      {/* Auth Action Links */}
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className={`text-sm font-medium transition-colors hover:text-white px-4 py-2 rounded-xl ${
            pathname === "/login" ? "text-white bg-white/[0.05]" : "text-slate-400"
          }`}
        >
          Log In
        </Link>
        <Link
          href="/register"
          className={`text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 ${
            pathname === "/register"
              ? "bg-white text-slate-950 shadow-white/5"
              : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-500/10 hover:shadow-indigo-500/20"
          }`}
        >
          Create Account
        </Link>
      </div>
    </nav>
  );
}
