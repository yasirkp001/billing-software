"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import type { SessionUser } from "@/lib/jwt";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} onMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        <footer className="sticky bottom-0 z-10 shrink-0 border-t border-wood-100 bg-white">
          <div className="px-4 py-5 lg:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Left: brand */}
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith("/logo.svg")) img.src = "/logo.svg";
                  }}
                  alt="Hi Wood Transporting"
                  className="h-8 w-auto object-contain opacity-80"
                />
                <div>
                  <p className="text-xs font-bold text-gray-700">Hi Wood Transporting</p>
                  <p className="text-[10px] text-gray-400">Transportation &amp; Logistics · Kerala</p>
                </div>
              </div>

              {/* Center: quick links */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-gray-400">
                <a href="/dashboard" className="hover:text-wood-700 transition-colors">Dashboard</a>
                <span className="text-gray-200">·</span>
                <a href="/vehicles" className="hover:text-wood-700 transition-colors">Vehicles</a>
                <span className="text-gray-200">·</span>
                <a href="/invoices" className="hover:text-wood-700 transition-colors">Invoices</a>
                <span className="text-gray-200">·</span>
                <a href="/drivers" className="hover:text-wood-700 transition-colors">Drivers</a>
                <span className="text-gray-200">·</span>
                <a href="/settings" className="hover:text-wood-700 transition-colors">Settings</a>
              </div>

              {/* Right: copyright */}
              <p className="text-[10px] text-gray-400 sm:text-right">
                © {new Date().getFullYear()} Hi Wood Transporting.<br className="hidden sm:block" /> All rights reserved.
              </p>
            </div>
          </div>
          {/* Bottom accent */}
          <div className="h-0.5 bg-gradient-to-r from-red-600 via-red-400 to-red-600" />
        </footer>
      </div>
    </div>
  );
}
