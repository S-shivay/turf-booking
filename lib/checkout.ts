'use client';

import type { CreateBookingResponse } from '@/lib/types';

/**
 * Razorpay Checkout loader.
 *
 * The script is injected by our own (nonce-trusted) bundle, so it is allowed
 * by `'strict-dynamic'` in the CSP without a nonce of its own.
 *
 * Nothing here confirms anything: the handler and the dismiss callback both
 * just hand control back to the caller, which sends the customer to the
 * status page. Only the signed webhook turns a hold into a booking.
 */

const SRC = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayInstance {
  open(): void;
  close(): void;
  on(event: string, cb: (payload: unknown) => void): void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  retry?: { enabled: boolean };
  handler?: () => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean; escape?: boolean };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let loader: Promise<void> | null = null;

/** Loads checkout.js once per page. Rejects if it can't be fetched. */
export function loadCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('client only'));
  if (window.Razorpay) return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    const el = existing ?? document.createElement('script');
    el.addEventListener('load', () => resolve(), { once: true });
    el.addEventListener(
      'error',
      () => {
        loader = null;
        reject(new Error('checkout-unavailable'));
      },
      { once: true },
    );
    if (!existing) {
      el.src = SRC;
      el.async = true;
      document.head.appendChild(el);
    }
  });
  return loader;
}

export interface CheckoutParams {
  /** Order details exactly as the server issued them — never re-priced here. */
  order: Pick<CreateBookingResponse, 'orderId' | 'amount' | 'currency' | 'keyId'> & {
    customer?: CreateBookingResponse['customer'];
  };
  turfName: string;
  description: string;
  /** Called when the window closes for any reason: paid, failed or dismissed. */
  onClose: () => void;
}

/**
 * Undo Checkout's scroll lock.
 *
 * Razorpay locks the page (body `overflow: hidden` plus a full-screen
 * container) while its window is open and only restores it when its own
 * teardown finishes. Our `handler` fires while the window is still up and we
 * navigate immediately — a client-side navigation that never reloads the
 * document — so without this the next page inherits a frozen, unscrollable
 * body. Runs twice because the teardown can re-apply the lock one frame later.
 */
function releaseCheckout(): void {
  const unlock = () => {
    document.querySelectorAll('.razorpay-container, .razorpay-backdrop').forEach((el) => el.remove());
    for (const el of [document.body, document.documentElement]) {
      for (const prop of ['overflow', 'overflow-y', 'position', 'top', 'width', 'height']) {
        el.style.removeProperty(prop);
      }
    }
  };
  requestAnimationFrame(unlock);
  window.setTimeout(unlock, 400);
}

/** Opens Razorpay Checkout. Resolves once the window is on screen. */
export async function openCheckout({ order, turfName, description, onClose }: CheckoutParams): Promise<void> {
  await loadCheckout();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error('checkout-unavailable');

  let closed = false;
  const done = () => {
    if (closed) return;
    closed = true;
    try {
      rzp.close();
    } catch {
      // Already closing — the cleanup below is what matters.
    }
    releaseCheckout();
    onClose();
  };

  const rzp = new Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: turfName,
    description,
    order_id: order.orderId,
    prefill: {
      name: order.customer?.name ?? undefined,
      email: order.customer?.email,
      contact: order.customer?.phone ?? undefined,
    },
    theme: { color: '#22c55e' },
    retry: { enabled: false },
    handler: done,
    modal: { ondismiss: done, escape: true },
  });
  rzp.on('payment.failed', done);
  rzp.open();
}
