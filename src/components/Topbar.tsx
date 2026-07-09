"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/jwt";
import { Icon } from "@/components/ui/Icon";
import { NotificationBell } from "@/components/NotificationBell";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { playLogout } from "@/lib/sound";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/vehicles": "Vehicles",
  "/drivers": "Drivers",
  "/bookings": "Bookings",
  "/trip-sheets": "Trip Sheets",
  "/diesel": "Diesel",
  "/invoices": "Invoices",
  "/payments": "Payments",
};

export function Topbar({
  user,
  onMenu,
}: {
  user: SessionUser;
  onMenu: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Derive page title from path
  const pageTitle =
    Object.entries(PAGE_TITLES).find(([key]) => pathname === key || pathname.startsWith(key + "/"))?.[1] ??
    "Hi Wood";

  async function logout() {
    playLogout(); // fire the chime within the click gesture, before navigating away
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    // Clear dismissed notifications so all alerts appear fresh on next login
    try { localStorage.removeItem("hw_dismissed_notifs"); } catch { /* ignore */ }
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 lg:px-6 shadow-sm">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors lg:hidden"
          aria-label="Open menu"
        >
          <Icon name="menu" size={20} />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900 tracking-tight">{pageTitle}</h1>
        </div>
      </div>

      {/* Right: user info + notifications + logout */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* User avatar + name */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <span className="text-xs font-semibold text-gray-700">{user.name}</span>
          {user.role === "admin" && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600">Admin</span>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="logout" size={15} />
          <span className="hidden sm:inline">{loading ? "…" : "Logout"}</span>
        </button>
      </div>
    </header>

      {/* Logout confirmation — rendered outside the backdrop-blurred <header>
          so its `fixed inset-0` pins to the viewport, not the 64px header. */}
      <Modal open={confirmOpen} onClose={() => !loading && setConfirmOpen(false)} title="Log out?">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Icon name="logout" size={26} />
          </div>
          <p className="text-sm text-gray-600">
            Are you sure you want to log out? You&apos;ll need to sign in again to
            access the billing system.
          </p>
          <div className="flex w-full justify-center gap-2 pt-1">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={logout} disabled={loading}>
              <Icon name="logout" size={15} />
              {loading ? "Logging out…" : "Log out"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
