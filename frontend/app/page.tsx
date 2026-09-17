import Link from 'next/link';
import type { ReactElement } from 'react';
import { AppShell } from '../components/AppShell';

/** Render the public entrance to the cinema booking experience. */
export default function HomePage(): ReactElement {
  return <AppShell><section className="landing"><p className="eyebrow">THE SHOW STARTS HERE</p><h1>Find your next <em>big-screen</em> feeling.</h1><p className="landing-copy">Sign in to keep your seats, shows, and perfectly timed plans close at hand.</p><Link className="primary-link" href="/login">Continue with mobile <span aria-hidden="true">→</span></Link><div className="film-strip" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div></section></AppShell>;
}
