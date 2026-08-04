"use client";

import { useState } from "react";

/**
 * Type-to-confirm guard for an irreversible action. The delete button stays
 * disabled until the typed text exactly matches the tenant's name, so a
 * misclick can't take out a real customer's account.
 */
export function DeleteTenantForm({
  tenantId,
  tenantName,
  action,
}: {
  tenantId: string;
  tenantName: string;
  action: (formData: FormData) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const matches = confirmText === tenantName;

  return (
    <form
      action={action}
      onSubmit={() => setSubmitting(true)}
      className="mt-4"
    >
      <input type="hidden" name="id" value={tenantId} />
      <label htmlFor="confirmName" className="block text-xs font-medium text-muted">
        Type <span className="font-semibold text-foreground">{tenantName}</span> to confirm
      </label>
      <input
        id="confirmName"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="mt-1.5 w-full max-w-sm rounded-xl border border-border bg-surface/60 px-4 py-2.5 text-sm text-foreground outline-none transition-shadow focus:shadow-[0_0_0_2px_rgb(239,68,68)]"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!matches || submitting}
        className="mt-3 rounded-full border border-red-400/40 px-5 py-2 text-sm font-medium text-danger-text transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {submitting ? "Deleting…" : "Permanently delete tenant"}
      </button>
    </form>
  );
}
