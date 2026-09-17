import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthForm } from '../components/AuthForm';

describe('AuthForm', () => {
  it('shows an accessible validation error and does not submit an invalid mobile', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<AuthForm mode="mobile" onSubmit={submit} />);
    await user.type(screen.getByLabelText('Mobile number'), '123');
    await user.click(screen.getByRole('button', { name: 'Send verification code' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('10 to 15 digits');
    expect(submit).not.toHaveBeenCalled();
  });

  it('submits the entered OTP only after explicit verification', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<AuthForm mode="otp" mobile="9876543210" onSubmit={submit} />);
    expect(submit).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('4-digit verification code'), '1234');
    await user.click(screen.getByRole('button', { name: 'Verify & continue' }));
    expect(submit).toHaveBeenCalledWith('1234');
  });
});
