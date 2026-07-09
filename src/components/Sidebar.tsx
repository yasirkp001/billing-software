"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Icon, type IconName } from "@/components/ui/Icon";

type NavItem = { href: string; label: string; icon: IconName };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    section: "Operations",
    items: [
      { href: "/vehicles", label: "Vehicles", icon: "vehicles" },
      { href: "/drivers", label: "Drivers", icon: "drivers" },
      { href: "/bookings", label: "Bookings", icon: "bookings" },
      { href: "/trip-sheets", label: "Trip Sheets", icon: "trip-sheets" },
      { href: "/diesel", label: "CR Diesel", icon: "expenses" },
    ],
  },
  {
    section: "Billing",
    items: [
      { href: "/invoices", label: "Invoices", icon: "invoices" },
      { href: "/payments", label: "Payments", icon: "payments" },
    ],
  },
  {
    section: "Account",
    items: [{ href: "/settings", label: "Settings", icon: "settings" }],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Hi Wood" className="h-8 w-auto object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={clsx(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                        active
                          ? "bg-red-50 text-red-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-red-600" />
                      )}
                      <Icon
                        name={item.icon}
                        size={18}
                        className={clsx(
                          "shrink-0 transition-colors",
                          active ? "text-red-600" : "text-gray-400 group-hover:text-gray-600"
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500">Hi Wood Billing</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
