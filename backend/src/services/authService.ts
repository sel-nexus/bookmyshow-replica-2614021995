import jwt from 'jsonwebtoken';
import type { SqliteUserRepository, UserRecord } from '../repositories/sqliteRepository';
import { config } from '../config';
import { demoPolicy, isValidDemoOtp } from '../domain/demoPolicy';

/** Carry expected authentication failure information to the HTTP layer. */
export class AuthError extends Error {
  /** Initialize a controlled authentication failure. */
  public constructor(public readonly code: string, message: string) {
    super(message);
  }
}

/** Validate OTPs, persist verified users, and issue application JWTs. */
export class AuthService {
  /** Initialize the service with its persistence dependency. */
  public constructor(private readonly users: SqliteUserRepository) {}

  /** Return the login acknowledgement without persisting authentication state. */
  public requestLogin(mobile: string): { mobile: string; nextStep: 'VERIFY_OTP'; message: string } {
    return { mobile, nextStep: 'VERIFY_OTP', message: demoPolicy.acknowledgement };
  }

  /** Verify an OTP, persist the user only after success, and sign a token. */
  public verifyOtp(mobile: string, otp: string): { user: UserRecord; token: string } {
    if (!isValidDemoOtp(otp)) throw new AuthError('INVALID_OTP', 'The verification code is invalid.');
    const user = this.users.createOrFindByMobile(mobile);
    const token = jwt.sign({ sub: user.id, mobile: user.mobile }, config.jwtSecret, {
      issuer: config.jwtIssuer,
      expiresIn: demoPolicy.tokenLifetime,
    });
    return { user, token };
  }
}
