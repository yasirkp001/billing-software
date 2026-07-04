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
        <footer className="shrink-0 border-t border-wood-100 bg-white px-4 py-3 lg:px-6">
          <div className="flex flex-col items-center justify-between gap-1 text-xs text-gray-400 sm:flex-row">
            <p>
              © {new Date().getFullYear()}{" "}
              <span className="font-semibold text-gray-600">Hi Wood Transporting</span>. All rights reserved.
            </p>
            <p>Transportation &amp; Logistics Services · Billing System</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
