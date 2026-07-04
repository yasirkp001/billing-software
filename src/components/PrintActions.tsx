"use client";

import Link from "next/link";

/** No-print action bar with a Print/Download-PDF button and a Close link.
 *  Hidden when the page is actually printed. */
export function PrintActions({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div className="mx-auto mb-6 max-w-4xl rounded-xl border border-gray-200 bg-white p-4 shadow-sm no-print print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          <p className="text-xs text-gray-500">Ready to print or download as PDF</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 cursor-pointer"
          >
            🖨️ Print / Download PDF
          </button>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            ✕ Close
          </Link>
        </div>
      </div>
    </div>
  );
}
