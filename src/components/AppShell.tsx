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
        <main className="flex-1 overflow-y-auto p-4 pb-6 lg:p-6 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}
