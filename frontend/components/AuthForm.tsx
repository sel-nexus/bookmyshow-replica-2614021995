'use client';

import React, { type FormEvent, type ReactElement, useState } from 'react';

interface AuthFormProps {
  mode: 'mobile' | 'otp';
  mobile?: string;
  onSubmit: (value: string) => Promise<void>;
}

/** Render an accessible, explicit-submit form for each authentication step. */
export function AuthForm({ mode, mobile, onSubmit }: AuthFormProps): ReactElement {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isMobile = mode === 'mobile';
  const fieldId = isMobile ? 'mobile' : 'otp';
  const label = isMobile ? 'Mobile number' : '4-digit verification code';
  const validate = (candidate: string): string => isMobile
    ? (/^\d{10,15}$/.test(candidate) ? '' : 'Enter a mobile number with 10 to 15 digits.')
    : (/^\d{4}$/.test(candidate) ? '' : 'Enter the 4-digit verification code.');

  /** Validate input and invoke the supplied network action only after submit. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const validationMessage = validate(value);
    if (validationMessage) { setError(validationMessage); return; }
    setSubmitting(true);
    setError('');
    try { await onSubmit(value); } catch (caught: unknown) { setError(caught instanceof Error ? caught.message : 'Unable to complete the request.'); } finally { setSubmitting(false); }
  }

  return <form className="auth-form" noValidate onSubmit={handleSubmit}>
    {mobile ? <p className="mobile-recap">Code sent to <strong>{mobile}</strong></p> : null}
    <label htmlFor={fieldId}>{label}</label>
    <input id={fieldId} name={fieldId} type={isMobile ? 'tel' : 'text'} inputMode="numeric" autoComplete={isMobile ? 'tel' : 'one-time-code'} maxLength={isMobile ? 15 : 4} value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, ''))} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} />
    {error ? <p id={`${fieldId}-error`} className="form-error" role="alert">{error}</p> : null}
    <button type="submit" disabled={submitting}>{submitting ? 'Please wait…' : isMobile ? 'Send verification code' : 'Verify & continue'}</button>
  </form>;
}
