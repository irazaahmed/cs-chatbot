"use client";

import { useState } from "react";
import { Input } from "@/components/dashboard/Input";
import { Label } from "@/components/dashboard/Label";
import { Button } from "@/components/dashboard/Button";

/**
 * Type-to-confirm guard for an irreversible action. The delete button stays
 * disabled until the typed text exactly matches the tenant's name, so a
 * misclick can't take out a real customer's account.
 */
export function DeleteTenantForm({
  tenantId,
  tenantName,
  action,
  actionLabel = "Permanently delete tenant",
}: {
  tenantId: string;
  tenantName: string;
  action: (formData: FormData) => void;
  actionLabel?: string;
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
      <Label htmlFor="confirmName" size="sm" muted>
        Type <span className="font-semibold text-foreground">{tenantName}</span> to confirm
      </Label>
      <Input
        id="confirmName"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        variant="danger"
        className="max-w-sm text-sm"
        autoComplete="off"
      />
      <Button variant="danger" disabled={!matches || submitting} className="mt-3">
        {submitting ? "Deleting…" : actionLabel}
      </Button>
    </form>
  );
}
