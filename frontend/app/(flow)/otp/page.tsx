'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { AppShell } from '../../../components/AppShell';
import { AuthForm } from '../../../components/AuthForm';
import { verifyOtp } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

/** Verify the code for the pending mobile number and continue to the future dashboard. */
export default function OtpPage(): ReactElement {
  const router = useRouter();
  const { mobile, completeAuthentication } = useAuth();
  /** Finish authentication and retain the token only in application memory. */
  async function submitOtp(otp: string): Promise<void> {
    const result = await verifyOtp(mobile, otp);
    completeAuthentication(result.user, result.token);
    router.push('/dashboard');
  }
  if (!mobile) return <AppShell><section className="auth-stage"><p className="eyebrow">ONE MORE STEP</p><h1>Start with your mobile number.</h1><p>We need a number before we can verify a code.</p><Link className="text-link" href="/login">Return to login</Link></section></AppShell>;
  return <AppShell><section className="auth-stage"><p className="eyebrow">CHECK YOUR PHONE</p><h1>Enter the code, then take your seat.</h1><p>For this demo, use the code shown on the previous screen.</p><AuthForm mode="otp" mobile={mobile} onSubmit={submitOtp} /></section></AppShell>;
}
