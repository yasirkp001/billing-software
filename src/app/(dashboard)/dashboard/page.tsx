import Link from "next/link";
import { prisma } from "@/lib/db";
import { Icon, type IconName } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { money, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type RecentInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  paidAmount: number;
  status: string;
};

async function getStats() {
  try {
    const [
      totals,
      paidAgg,
      overdueAgg,
      counts,
      recent,
    ] = await Promise.all([
      prisma.invoice.aggregate({ _sum: { totalAmount: true, paidAmount: true } }),
      prisma.invoice.count({ where: { status: "paid" } }),
      prisma.invoice.aggregate({
        where: { status: "overdue" },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      Promise.all([
        prisma.vehicle.count(),
        prisma.driver.count(),
        prisma.booking.count(),
        prisma.invoice.count(),
      ]),
      prisma.invoice.findMany({
        take: 6,
        orderBy: { invoiceDate: "desc" },
      }),
    ]);

    const billed = totals._sum.totalAmount ?? 0;
    const collected = totals._sum.paidAmount ?? 0;
    const overdue =
      (overdueAgg._sum.totalAmount ?? 0) - (overdueAgg._sum.paidAmount ?? 0);
    const [vehicles, drivers, bookings, invoices] = counts;

    return {
      error: false,
      billed,
      collected,
      outstanding: billed - collected,
      overdue,
      paidCount: paidAgg,
      vehicles,
      drivers,
      bookings,
      invoices,
      recent: recent as RecentInvoice[],
    };
  } catch {
    return {
      error: true,
      billed: 0,
      collected: 0,
      outstanding: 0,
      overdue: 0,
      paidCount: 0,
      vehicles: 0,
      drivers: 0,
      bookings: 0,
      invoices: 0,
      recent: [] as RecentInvoice[],
    };
  }
}

async function getExpiryAlerts() {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const vehicles = await prisma.vehicle.findMany({
      where: {
        isActive: true,
        OR: [
          { insuranceExpiry: { gte: new Date("2000-01-01"), lte: soon } },
          { fitnessExpiry: { gte: new Date("2000-01-01"), lte: soon } },
          { taxValidUpto: { gte: new Date("2000-01-01"), lte: soon } },
          { permitValidUpto: { gte: new Date("2000-01-01"), lte: soon } },
          { puccValidUpto: { gte: new Date("2000-01-01"), lte: soon } },
        ],
      },
      select: {
        id: true,
        registrationNumber: true,
        insuranceExpiry: true,
        fitnessExpiry: true,
        taxValidUpto: true,
        permitValidUpto: true,
        puccValidUpto: true,
      },
    });

    const alerts: {
      vehicleId: string;
      regNumber: string;
      docType: string;
      date: Date;
      status: "expired" | "soon";
    }[] = [];

    const docState = (d: Date | null) => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      if (dt < now) return "expired" as const;
      if (dt <= soon) return "soon" as const;
      return null;
    };

    for (const v of vehicles) {
      const checks: { label: string; date: Date | null }[] = [
        { label: "Insurance", date: v.insuranceExpiry },
        { label: "Fitness", date: v.fitnessExpiry },
        { label: "Road Tax", date: v.taxValidUpto },
        { label: "Permit", date: v.permitValidUpto },
        { label: "PUCC (Pollution)", date: v.puccValidUpto },
      ];
      for (const check of checks) {
        const state = docState(check.date);
        if (state) {
          alerts.push({
            vehicleId: v.id,
            regNumber: v.registrationNumber,
            docType: check.label,
            date: check.date!,
            status: state,
          });
        }
      }
    }

    alerts.sort((a, b) => {
      if (a.status === "expired" && b.status !== "expired") return -1;
      if (a.status !== "expired" && b.status === "expired") return 1;
      return a.date.getTime() - b.date.getTime();
    });

    return alerts;
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [s, alerts] = await Promise.all([getStats(), getExpiryAlerts()]);

  const kpis: {
    label: string;
    value: string;
    sub: string;
    icon: IconName;
    tone: string;
    iconBg: string;
  }[] = [
    {
      label: "Total Billed",
      value: money(s.billed),
      sub: `${s.invoices} invoice${s.invoices === 1 ? "" : "s"}`,
      icon: "revenue",
      tone: "text-gray-900",
      iconBg: "bg-gray-100 text-gray-600",
    },
    {
      label: "Collected",
      value: money(s.collected),
      sub: `${s.paidCount} fully paid`,
      icon: "wallet",
      tone: "text-green-700",
      iconBg: "bg-green-100 text-green-600",
    },
    {
      label: "Outstanding",
      value: money(s.outstanding),
      sub: "Yet to receive",
      icon: "outstanding",
      tone: "text-amber-700",
      iconBg: "bg-amber-100 text-amber-600",
    },
    {
      label: "Overdue",
      value: money(s.overdue),
      sub: "Past due date",
      icon: "overdue",
      tone: "text-red-700",
      iconBg: "bg-red-100 text-red-600",
    },
  ];

  const ops: { label: string; href: string; value: number; icon: IconName }[] = [
    { label: "Vehicles", href: "/vehicles", value: s.vehicles, icon: "vehicles" },
    { label: "Drivers", href: "/drivers", value: s.drivers, icon: "drivers" },
    { label: "Bookings", href: "/bookings", value: s.bookings, icon: "bookings" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">
          Billing Overview
        </h2>
        <p className="text-sm font-medium text-gray-500">
          Revenue, collections and operations at a glance.
        </p>
      </div>

      {s.error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          <Icon name="overdue" size={18} />
          Could not read the database. Run{" "}
          <code className="mx-1 rounded bg-amber-100 px-1 font-mono text-xs">
            npm run db:push
          </code>{" "}
          to create it, then refresh.
        </div>
      )}

      {/* Expiry Alerts Warning */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h3 className="text-sm font-bold text-red-950 uppercase tracking-wider">
              Document Expiry Alerts
            </h3>
            <span className="ml-auto rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              {alerts.length} warning{alerts.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((a, idx) => (
              <Link
                key={`${a.vehicleId}-${a.docType}-${idx}`}
                href={`/vehicles/${a.vehicleId}`}
                className="flex items-center justify-between rounded-xl bg-white border border-red-100 p-3 hover:shadow-md transition-all"
              >
                <div>
                  <p className="font-bold text-gray-800 text-sm">{a.regNumber}</p>
                  <p className="text-xs text-gray-500">{a.docType}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    a.status === "expired"
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {a.status === "expired" ? "Expired" : "Expiring Soon"}
                  </span>
                  <p className="text-[10px] font-semibold text-gray-400 mt-1">
                    {formatDate(a.date)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {k.label}
              </span>
              <div className={`rounded-lg p-2 ${k.iconBg}`}>
                <Icon name={k.icon} size={18} />
              </div>
            </div>
            <p className={`mt-3 text-2xl font-extrabold tracking-tight ${k.tone}`}>
              {k.value}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent invoices */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-bold text-gray-900">Recent Invoices</h3>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
            >
              View all <Icon name="chevron-right" size={14} />
            </Link>
          </div>
          {s.recent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <Icon name="invoices" size={28} className="text-gray-300" />
              <p className="text-sm font-semibold text-gray-400">No invoices yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Invoice
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-gray-400">
                    Amount
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold uppercase tracking-wider text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {s.recent.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="font-bold text-gray-800">{inv.invoiceNumber}</div>
                      <div className="text-xs font-medium text-gray-400">
                        {formatDate(inv.invoiceDate)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-bold text-gray-800">
                      {money(inv.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Operations snapshot */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Operations</h3>
          <div className="space-y-2">
            {ops.map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:border-gray-200 hover:bg-gray-50"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-lg bg-gray-100 p-2 text-gray-500">
                    <Icon name={o.icon} size={18} />
                  </span>
                  <span className="text-sm font-semibold text-gray-700">{o.label}</span>
                </span>
                <span className="text-lg font-extrabold text-gray-900">{o.value}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
