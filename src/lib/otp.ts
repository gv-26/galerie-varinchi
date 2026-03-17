export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function getOtpExpiryDate(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10); // OTP valid for 10 minutes
  return expiry;
}
