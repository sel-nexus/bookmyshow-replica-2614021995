import React, { type ReactElement } from 'react';
import type { PaymentMethod } from '../lib/checkout-context';

/** Render local-only payment-method controls without exposing their values to booking submission. */
export function PaymentForm({
  method,
  onChoose,
  disabled,
}: {
  method: PaymentMethod | null;
  onChoose: (method: PaymentMethod) => void;
  disabled: boolean;
}): ReactElement {
  return (
    <fieldset className="payment-form" disabled={disabled}>
      <legend>Payment method</legend>
      <label>
        <input
          type="radio"
          name="payment-method"
          checked={method === 'CARD'}
          onChange={(): void => onChoose('CARD')}
        />
        {' '}Card
      </label>
      <label>
        <input
          type="radio"
          name="payment-method"
          checked={method === 'UPI'}
          onChange={(): void => onChoose('UPI')}
        />
        {' '}UPI
      </label>
      {method === 'CARD' && (
        <div className="payment-fields">
          <label htmlFor="card-number">
            Card number
            <input
              id="card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="Mock card number"
            />
          </label>
          <label htmlFor="card-cvv">
            CVV
            <input
              id="card-cvv"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="Mock CVV"
            />
          </label>
          <label htmlFor="card-expiry">
            Expiry
            <input
              id="card-expiry"
              autoComplete="cc-exp"
              placeholder="MM / YY"
            />
          </label>
        </div>
      )}
      {method === 'UPI' && (
        <div className="payment-fields">
          <label htmlFor="upi-id">
            UPI ID
            <input
              id="upi-id"
              autoComplete="off"
              placeholder="Mock UPI ID"
            />
          </label>
        </div>
      )}
      <p className="payment-note">
        These mock details stay in this form and are never submitted.
      </p>
    </fieldset>
  );
}
