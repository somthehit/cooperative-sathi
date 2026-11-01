import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "nepal_cooperative_super_secret_jwt_key_2083_!@#"
);

export type UserRole = "ADMIN" | "ACCOUNTANT" | "TELLER" | "VIEW_ONLY";

export interface SessionUser {
  userId: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: string;
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const u = payload as any;
    if (u && typeof u.fullName === "object" && u.fullName !== null) {
      if (Array.isArray(u.fullName.richText)) {
        u.fullName = u.fullName.richText.map((item: any) => item?.text || "").join("").trim();
      } else {
        u.fullName = String(u.username || "प्रयोगकर्ता");
      }
    }
    return u as SessionUser;
  } catch (e) {
    return null;
  }
}

export const DEFAULT_FALLBACK_USER: SessionUser = {
  userId: "USR-01",
  username: "admin",
  fullName: "प्रबन्धक / मुख्य प्रशासक",
  role: "ADMIN",
  status: "ACTIVE",
};

export async function getCurrentSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("coop_session")?.value;
    if (!token) return null;
    const verified = await verifySessionToken(token);
    return verified;
  } catch {
    return null;
  }
}

export async function authenticateRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get("coop_session")?.value;
  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const verified = await verifySessionToken(authHeader.substring(7));
      return verified;
    }
    return null;
  }
  const verified = await verifySessionToken(token);
  return verified;
}

export function roleAllowed(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}
