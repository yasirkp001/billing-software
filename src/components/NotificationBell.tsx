"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { playNotification } from "@/lib/sound";

type Severity = "danger" | "warning" | "info";
type Notification = {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string;
  severity: Severity;
};

const STORAGE_KEY = "hw_dismissed_notifs";

/* Per-type icon (only real Icon names) */
const TYPE_ICON: Record<string, IconName> = {
  overdue: "invoices",
  insurance: "vehicles",
  fitness: "vehicles",
  license: "drivers",
  tripsheet: "trip-sheets",
};

/* Per-severity colored icon chip */
const SEV_CHIP: Record<Severity, string> = {
  danger: "bg-red-100 text-red-600",
  warning: "bg-amber-100 text-amber-600",
  info: "bg-blue-100 text-blue-600",
};

/* Left accent strip per severity */
const SEV_ACCENT: Record<Severity, string> = {
  danger: "border-l-red-500",
  warning: "border-l-amber-500",
  info: "border-l-blue-500",
};

/* Severity groups, in display order */
const GROUPS: { key: Severity; label: string; dot: string; pill: string }[] = [
  { key: "danger", label: "Urgent", dot: "bg-red-500", pill: "bg-red-100 text-red-700" },
  { key: "warning", label: "Upcoming", dot: "bg-amber-500", pill: "bg-amber-100 text-amber-700" },
  { key: "info", label: "For Review", dot: "bg-blue-500", pill: "bg-blue-100 text-blue-700" },
];

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastKey, setToastKey] = useState(0); // 0 = hidden; >0 = visible (key re-mount replays animation)
  const [mounted, setMounted] = useState(false); // gate portals until client mount
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const prevCount = useRef(-1); // -1 = not yet loaded
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set()); // synchronous mirror of `dismissed`

  /* Update dismissed set in state, ref, and localStorage together. */
  function applyDismissed(next: Set<string>) {
    dismissedRef.current = next;
    setDismissed(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* storage unavailable — dismissal just won't persist */
    }
  }

  // Mount + hydrate dismissed IDs from localStorage (runs before the load effect)
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr)) {
        const s = new Set<string>(arr);
        dismissedRef.current = s;
        setDismissed(s);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function showToast() {
    setToastKey((k) => k + 1);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastKey(0), 4500);
  }

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/notifications");
      const body = await res.json();
      if (res.ok) {
        const newItems: Notification[] = body.data.items ?? [];
        setItems(newItems);

        // Prune dismissed IDs that no longer exist (alert resolved) so the set
        // can't grow forever and a recurring condition can surface again.
        const presentIds = new Set(newItems.map((i) => i.id));
        const pruned = new Set([...dismissedRef.current].filter((id) => presentIds.has(id)));
        applyDismissed(pruned);

        const visibleCount = newItems.filter((i) => !pruned.has(i.id)).length;
        const prev = prevCount.current;
        // Initial load: ding if any visible alerts. Refresh: ding only if visible count grew.
        if (visibleCount > 0 && (prev === -1 || (isRefresh && visibleCount > prev))) {
          playNotification();
          showToast();
        }
        prevCount.current = visibleCount;
      }
    } catch {
      /* ignore — bell just shows no alerts */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(false);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* Dismiss every currently-shown alert. */
  function clearAll() {
    const next = new Set(dismissedRef.current);
    for (const i of items) next.add(i.id);
    applyDismissed(next);
    prevCount.current = 0;
  }

  const visible = items.filter((i) => !dismissed.has(i.id));
  const count = visible.length;
  const counts = {
    danger: visible.filter((i) => i.severity === "danger").length,
    warning: visible.filter((i) => i.severity === "warning").length,
    info: visible.filter((i) => i.severity === "info").length,
  };

  // Stable stagger index across groups
  let renderIdx = 0;

  return (
    <>
      {/* Toast popup — portaled to body to escape the Topbar's stacking context */}
      {mounted &&
        toastKey > 0 &&
        createPortal(
          <div
            key={toastKey}
            className="toast-enter fixed right-4 top-20 z-[1000] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-xl"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
              <Icon name="bell" size={17} className="text-red-600" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">
                {count} alert{count !== 1 ? "s" : ""} need attention
              </p>
              <p className="text-xs text-gray-500">Tap the bell to review</p>
            </div>
            <button
              onClick={() => setToastKey(0)}
              className="ml-1 shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Dismiss"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>,
          document.body
        )}

      <div className="relative">
        {/* Bell button */}
        <button
          onClick={() => {
            setOpen((o) => !o);
            if (!open) load(true);
          }}
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-wood-50 hover:text-wood-800"
          aria-label="Notifications"
        >
          <span className={count > 0 ? "block bell-wiggle" : "block"}>
            <Icon name="bell" size={20} />
          </span>
          {count > 0 && (
            <span className="badge-pulse absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>

        {mounted && open && createPortal(
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />

            {/* Panel — portaled to body so page content can never paint over it */}
            <div className="panel-in fixed right-3 top-[64px] z-[999] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm">
                    <Icon name="bell" size={14} />
                  </span>
                  <span className="text-sm font-bold text-gray-900">Notifications</span>
                  {count > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">{count}</span>
                  )}
                </div>
                <button
                  onClick={() => load(true)}
                  disabled={refreshing}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  aria-label="Refresh"
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={refreshing ? "animate-spin" : ""}
                  >
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[60vh] overflow-y-auto sm:max-h-96">
                {loading ? (
                  <div className="flex flex-col items-center gap-2 px-4 py-10 text-gray-400">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                    <span className="text-sm font-medium">Loading…</span>
                  </div>
                ) : count === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-700">All caught up!</p>
                      <p className="mt-0.5 text-xs text-gray-400">No alerts need your attention.</p>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    {GROUPS.map((g) => {
                      const groupItems = visible.filter((i) => i.severity === g.key);
                      if (groupItems.length === 0) return null;
                      return (
                        <div key={g.key} className="mb-1 last:mb-0">
                          {/* Group header */}
                          <div className="flex items-center gap-2 px-4 pb-1 pt-2.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${g.dot}`} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{g.label}</span>
                            <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${g.pill}`}>{groupItems.length}</span>
                          </div>
                          {/* Group items */}
                          {groupItems.map((n) => {
                            const delay = `${Math.min(renderIdx++, 12) * 35}ms`;
                            return (
                              <Link
                                key={n.id}
                                href={n.href}
                                onClick={() => setOpen(false)}
                                style={{ animationDelay: delay }}
                                className={`item-in group flex items-center gap-3 border-l-2 ${SEV_ACCENT[n.severity]} px-4 py-2.5 transition-colors hover:bg-gray-50`}
                              >
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${SEV_CHIP[n.severity]}`}>
                                  <Icon name={TYPE_ICON[n.type] ?? "bell"} size={16} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-gray-800">{n.title}</span>
                                  <span className="block truncate text-xs text-gray-500">{n.detail}</span>
                                </span>
                                <span className="shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-gray-500">
                                  <Icon name="chevron-right" size={16} />
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer — severity summary + clear all */}
              {count > 0 && (
                <div className="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-2">
                  <div className="flex items-center gap-2.5 text-[11px] font-bold">
                    {counts.danger > 0 && (
                      <span className="flex items-center gap-1 text-red-600"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{counts.danger}</span>
                    )}
                    {counts.warning > 0 && (
                      <span className="flex items-center gap-1 text-amber-600"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{counts.warning}</span>
                    )}
                    {counts.info > 0 && (
                      <span className="flex items-center gap-1 text-blue-600"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />{counts.info}</span>
                    )}
                  </div>
                  <button
                    onClick={clearAll}
                    className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </>,
          document.body
        )}
      </div>
    </>
  );
}
