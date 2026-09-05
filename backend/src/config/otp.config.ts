/**
 * OTP configuration for auth
 */
export const OTP_CONFIG = {
  /** OTP length (digits) */
  length: 6,
  /** Expiry in minutes */
  expiryMinutes: 5,
  /** Max verification attempts before lock */
  maxAttempts: 3,
  /** Rate limit: max OTPs per phone per hour */
  rateLimitPerHour: 10,
};
