// Phase 1 billing is manual (CLAUDE.md section 9) — no payment gateway. These
// are the account details customers pay into directly, then submit proof.
// Real values come from env so they're never hardcoded/committed; fall back
// to obvious placeholders so the flow is still visible before they're set.

export interface PaymentInstructions {
  jazzCash: string;
  easyPaisa: string;
  bankAccountTitle: string;
  bankAccountNumber: string;
  bankIban: string;
  bankName: string;
}

export function getPaymentInstructions(): PaymentInstructions {
  return {
    jazzCash: process.env.PAYMENT_JAZZCASH_NUMBER || "0300-0000000 (set PAYMENT_JAZZCASH_NUMBER)",
    easyPaisa: process.env.PAYMENT_EASYPAISA_NUMBER || "0300-0000000 (set PAYMENT_EASYPAISA_NUMBER)",
    bankAccountTitle: process.env.PAYMENT_BANK_ACCOUNT_TITLE || "Ahmed Raza",
    bankAccountNumber: process.env.PAYMENT_BANK_ACCOUNT_NUMBER || "0000000000000 (set PAYMENT_BANK_ACCOUNT_NUMBER)",
    bankIban: process.env.PAYMENT_BANK_IBAN || "PK00XXXX0000000000000000 (set PAYMENT_BANK_IBAN)",
    bankName: process.env.PAYMENT_BANK_NAME || "Bank name (set PAYMENT_BANK_NAME)",
  };
}
