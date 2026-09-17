'use client';

import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { AppShell } from '../../../components/AppShell';
import { AuthForm } from '../../../components/AuthForm';
import { requestLogin } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

/** Collect a mobile number and advance only after the OTP request succeeds. */
export default function LoginPage(): ReactElement {
  const router = useRouter();
  const { setPendingMobile } = useAuth();
  /** Request the OTP and keep its mobile in the in-memory flow context. */
  async function submitMobile(mobile: string): Promise<void> {
    await requestLogin(mobile);
    setPendingMobile(mobile);
    router.push('/otp');
  }
  return (
    <AppShell>
      <section className="auth-stage">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Your seat starts with a number.</h1>
        <p>We’ll send a short verification code to continue.</p>
        <AuthForm mode="mobile" onSubmit={submitMobile} />
        <p className="demo-note">
          Demo code: <strong>1234</strong>
        </p>
      </section>
    </AppShell>
  );
}
