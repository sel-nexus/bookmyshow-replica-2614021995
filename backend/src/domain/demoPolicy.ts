/** State the deliberately fixed OTP policy used by this demo authentication flow. */
export const demoPolicy = {
  validOtp: '1234',
  tokenLifetime: '30m',
  acknowledgement: 'OTP sent. Use 1234 for this demo.',
} as const;

/** Determine whether an OTP is accepted without exposing it through logs. */
export function isValidDemoOtp(otp: string): boolean {
  return otp === demoPolicy.validOtp;
}
