import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lumen_session";

function secret() {
  return process.env.AUTH_SECRET || "lumen-dev-secret";
}

export function signSession(payload: { userId: string; email: string }) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString()) as {
      userId: string;
      email: string;
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(userId: string, email: string) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, signSession({ userId, email }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export function generatePairingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i]! % alphabet.length];
  return code;
}

export function generateDeviceToken() {
  return randomBytes(24).toString("hex");
}
