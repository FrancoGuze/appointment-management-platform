import { timingSafeEqual } from "crypto";

function parseBearerToken(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");

  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token.trim();
}

export function validateCronBearerToken(headerValue: string | null): boolean {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    throw new Error("Missing CRON_SECRET");
  }

  const providedToken = parseBearerToken(headerValue);

  if (!providedToken) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedSecret, "utf8");
  const providedBuffer = Buffer.from(providedToken, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
