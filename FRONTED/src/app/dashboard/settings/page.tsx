"use client";

import React from "react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-200 pb-4 mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">
          ⚙️ Organization Settings
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5 font-normal">
          Manage organization name, slug, billing plan, and global settings
        </p>
      </div>
      <div className="p-6 bg-white border border-neutral-200 rounded-xl space-y-4 text-xs font-normal">
        <h3 className="text-sm font-semibold text-neutral-900">General Settings</h3>
        <p className="text-neutral-500">
          Configure organization slug, billing tier, and webhook signing secrets.
        </p>
      </div>
    </div>
  );
}
