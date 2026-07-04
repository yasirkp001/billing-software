// Shared formatting helpers for the billing UI.

/** ₹ amount with Indian grouping. `money(125000)` → "₹1,25,000". */
export function money(value: number | null | undefined, opts?: { decimals?: boolean }): string {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `₹${safe.toLocaleString("en-IN", {
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  })}`;
}

/** Compact ₹ for tight KPI cards. 1_25_000 → "₹1.25L", 2_50_00_000 → "₹2.5Cr". */
export function moneyCompact(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2).replace(/\.00$/, "")}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2).replace(/\.00$/, "")}L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return money(n);
}

/**
 * Mask free text into an Indian vehicle registration number as the user types.
 * Format: SS-DD-LL-NNNN  (state letters · RTO digits · series letters · number)
 * e.g. "kl10au5330" / "KL 10 AU 5330" → "KL-10-AU-5330".
 * Invalid characters for the current segment are dropped, dashes are inserted
 * automatically, and everything is upper-cased.
 */
export function formatVehicleReg(raw: string): string {
  const s = String(raw ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  let i = 0;
  const take = (max: number, re: RegExp) => {
    let out = "";
    while (i < s.length && out.length < max && re.test(s[i])) out += s[i++];
    return out;
  };
  const state = take(2, /[A-Z]/); // state code  — KL, KA, TN…
  const rto = take(2, /[0-9]/);   // RTO district number
  const series = take(3, /[A-Z]/);// series letters (usually 1–2)
  const num = take(4, /[0-9]/);   // 1–4 digit number

  return [state, rto, series, num].filter(Boolean).join("-");
}

/** Locale date — "30 Jun 2026". */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/** Age since a registration date — "7 years and 9 months". */
export function vehicleAge(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  let months = now.getMonth() - d.getMonth();
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "—";
  const yLabel = `${years} year${years === 1 ? "" : "s"}`;
  const mLabel = `${months} month${months === 1 ? "" : "s"}`;
  return years === 0 ? mLabel : months === 0 ? yLabel : `${yLabel} and ${mLabel}`;
}
