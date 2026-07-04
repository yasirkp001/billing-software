import clsx from "clsx";

// Positive / success states → green (the standard place for green in the app)
const GREEN = new Set(["paid", "completed", "active", "success", "approved"]);
// Negative / terminal-bad states → red
const RED = new Set(["overdue", "cancelled", "canceled", "failed", "rejected", "inactive"]);

/**
 * Coloured pill for a record's status.
 * Green = positive, Red = negative, Gray = neutral / in-progress.
 */
export function StatusBadge({ status }: { status?: string | null }) {
  const value = String(status ?? "").trim();
  if (!value) return <span className="text-gray-400">—</span>;

  const key = value.toLowerCase();
  const tone = GREEN.has(key)
    ? "bg-green-100 text-green-700"
    : RED.has(key)
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-600";

  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        tone
      )}
    >
      {value.replace(/-/g, " ")}
    </span>
  );
}
