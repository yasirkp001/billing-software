"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * One-click "convert" action used by the billing workflow (Booking → Trip
 * Sheet → Invoice). POSTs to the endpoint, then navigates to the next stage.
 */
export function ConvertButton({
  endpoint,
  redirectTo,
  label,
  icon,
  confirmText,
}: {
  endpoint: string;
  redirectTo: string;
  label: string;
  icon: IconName;
  confirmText?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    if (confirmText && !confirm(confirmText)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Action failed");
      
      let target = redirectTo;
      if (body.data) {
        if (body.data.invoiceNumber && redirectTo.startsWith("/invoices")) {
          target = `/invoices?q=${encodeURIComponent(body.data.invoiceNumber)}`;
        } else if (body.data.id && redirectTo.startsWith("/trip-sheets")) {
          target = `/trip-sheets?q=${encodeURIComponent(body.data.id)}`;
        }
      }
      router.push(target);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed");
      setLoading(false);
    }
  }

  return (
    <Button variant="success" size="sm" onClick={run} disabled={loading}>
      <Icon name={icon} size={13} /> {loading ? "…" : label}
    </Button>
  );
}
