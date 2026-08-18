"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Check,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  Activity,
  Layers,
  Terminal,
  ArrowUpRight,
  Code2,
  Cpu,
  Heart,
} from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

export default function Footer() {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const email = "rajatmaurya.dev@gmail.com";
  const portfolioUrl = "https://rajatmaurya-dev.vercel.app/";
  const githubUrl = "https://github.com/rajatmaurya-cs";
  const linkedinUrl = "https://www.linkedin.com/in/rajat-maurya-3a172331b/";
  const repoUrl = "https://github.com/rajatmaurya-cs/HYDRA";

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <footer className="w-full bg-neutral-50/80 border-t border-neutral-200/80 text-neutral-600 font-sans mt-20">
      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-14 border-b border-neutral-200">
          
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center font-extrabold text-sm tracking-tight shadow-2xs">
                H
              </div>
              <span className="font-semibold text-lg text-neutral-900 tracking-tight">
                HYDRA
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                v1.0.0 Online
              </span>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-sm font-normal">
              High-throughput enterprise webhook gateway and resilient event delivery engine. 
              Engineered for zero message loss with transactional outbox persistence, Apache Kafka streaming, 
              exponential backoff retries, and HMAC SHA-256 signatures.
            </p>

            
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-white border border-neutral-200 text-neutral-700 shadow-2xs">
                <Cpu className="w-3 h-3 text-neutral-500" />
                Aiven Kafka
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-white border border-neutral-200 text-neutral-700 shadow-2xs">
                <Zap className="w-3 h-3 text-amber-500" />
                Upstash Redis
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-white border border-neutral-200 text-neutral-700 shadow-2xs">
                <Layers className="w-3 h-3 text-indigo-500" />
                Neon Postgres
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono bg-white border border-neutral-200 text-neutral-700 shadow-2xs">
                <Shield className="w-3 h-3 text-emerald-500" />
                HMAC SHA-256
              </span>
            </div>
          </div>

          
          <div className="lg:col-span-3 space-y-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Platform & Features
            </h4>
            <ul className="space-y-2 text-xs font-normal text-neutral-600">
              <li>
                <Link href="/docs?topic=ingress" className="hover:text-black transition-colors">
                  Event Ingress & Delivery
                </Link>
              </li>
              <li>
                <Link href="/docs?topic=endpoints" className="hover:text-black transition-colors">
                  Webhook Endpoints
                </Link>
              </li>
              <li>
                <Link href="/docs?topic=dlq" className="hover:text-black transition-colors">
                  Dead Letter Queues (DLQ)
                </Link>
              </li>
              <li>
                <Link href="/docs?topic=keys" className="hover:text-black transition-colors">
                  API Key Management
                </Link>
              </li>
              <li>
                <Link href="/docs?topic=logs" className="hover:text-black transition-colors">
                  Observability & Logs
                </Link>
              </li>
              <li>
                <Link href="/docs?topic=workspaces" className="hover:text-black transition-colors">
                  Multi-tenant Workspaces
                </Link>
              </li>
            </ul>
          </div>

          
          <div className="lg:col-span-4 space-y-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900">
              Created By
            </h4>
            
            <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">Rajat Maurya</p>
                  <p className="text-[11px] text-neutral-500 font-normal">Backend Engineer</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                  RM
                </div>
              </div>

              
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200 text-xs">
                <a
                  href={`mailto:${email}`}
                  className="truncate text-neutral-700 hover:text-black transition-colors flex items-center gap-1.5 font-mono text-[11px]"
                >
                  <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="truncate">{email}</span>
                </a>
                <button
                  onClick={handleCopyEmail}
                  title="Copy email to clipboard"
                  className="p-1 rounded hover:bg-neutral-200/80 text-neutral-500 hover:text-black transition-all cursor-pointer"
                >
                  {copiedEmail ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Portfolio Link Button */}
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-900 text-white text-xs hover:bg-neutral-800 transition-all font-medium shadow-2xs"
              >
                <span>Portfolio Website</span>
                <ArrowUpRight className="w-3 h-3 text-neutral-400" />
              </a>

              {/* GitHub & LinkedIn Grid */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-800 hover:text-black hover:border-neutral-400 hover:shadow-2xs transition-all font-medium"
                >
                  <GithubIcon className="w-3.5 h-3.5 text-neutral-800" />
                  <span>GitHub</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-400" />
                </a>

                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-800 hover:text-black hover:border-neutral-400 hover:shadow-2xs transition-all font-medium"
                >
                  <LinkedinIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>LinkedIn</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-400" />
                </a>
              </div>
            </div>

          </div>

        </div>

        
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span>© {new Date().getFullYear()} HYDRA Webhook Gateway. Built by Rajat Maurya.</span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 transition-colors inline-flex items-center gap-1"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source Repository</span>
            </a>
            <div className="flex items-center gap-1.5 text-neutral-700">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] font-medium">All Systems Operational</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
