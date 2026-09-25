// Pure predicates over what Razorpay reports for an order's payment attempts.
// No secrets, no I/O — so they can be unit tested, which matters because one
// of them decides when to take a customer's held slots away.

/** Only the field we judge on; the gateway sends plenty more. */
export interface GatewayAttempt {
  status: string;
}

/**
 * True only when the customer has tried to pay and every attempt failed.
 *
 * Deliberately false when there are **no** attempts (they have not paid yet —
 * the hold is theirs for the full window) and when any attempt is still alive
 * (`created`, `pending`, `authorized`, `captured`), since money may still land.
 */
export function allAttemptsFailed(attempts: readonly GatewayAttempt[]): boolean {
  return attempts.length > 0 && attempts.every((a) => a.status === 'failed');
}

/**
 * The attempt worth acting on: a captured payment, else an authorised one
 * that still needs capturing. Anything else means nothing is ours yet.
 */
export function findUsablePayment<T extends GatewayAttempt>(attempts: readonly T[]): T | undefined {
  return attempts.find((a) => a.status === 'captured') ?? attempts.find((a) => a.status === 'authorized');
}
