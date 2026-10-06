import {
  PAYAZA_CURRENCY,
  isFailedPayazaEvent,
  isSuccessfulPayazaEvent,
  numericAmount,
} from "./payaza.ts";

export type PaymentSettlementAction = "pending" | "fail" | "confirm" | "reject" | "duplicate";

export function determinePaymentSettlement(input: {
  payment: Record<string, unknown>;
  payload: Record<string, unknown>;
}) {
  const { payment, payload } = input;
  if (payment.webhookProcessedAt || payment.paymentStatus === "paid") return "duplicate" as const;

  const payloadCurrency = String(payload.currency_code ?? payload.currency ?? "").toUpperCase();
  const payloadAmount = numericAmount(payload.amount_received ?? payload.request_amount);
  const expectedAmount = numericAmount(payment.amount);
  if (
    payloadCurrency !== PAYAZA_CURRENCY ||
    payloadAmount === null ||
    expectedAmount === null ||
    payloadAmount !== expectedAmount
  ) {
    return "reject" as const;
  }

  if (isFailedPayazaEvent(payload)) return "fail" as const;
  if (isSuccessfulPayazaEvent(payload)) return "confirm" as const;
  return "pending" as const;
}
