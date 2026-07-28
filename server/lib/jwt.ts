import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias

export interface SessionPayload {
  sub: string; // admin id
  username: string;
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(key);
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    if (!payload.sub || typeof payload.username !== "string") return null;
    return { sub: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
