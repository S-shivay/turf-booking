import 'server-only';

/**
 * The only price that ever reaches Razorpay. Returns paise.
 * The client computes the same figure for display (see PriceSummary);
 * a client-sent amount is never accepted.
 */
export function calculateTotal(numPeople: number, slotCount: number, pricePerPersonPerSlot: number): number {
  if (!Number.isInteger(numPeople) || !Number.isInteger(slotCount) || !Number.isInteger(pricePerPersonPerSlot)) {
    throw new Error('pricing inputs must be integers');
  }
  return numPeople * slotCount * pricePerPersonPerSlot * 100;
}
