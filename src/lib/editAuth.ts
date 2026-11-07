import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

export const EDIT_COOKIE = "ps_edit";

export const newEditToken = () => randomBytes(24).toString("base64url");
export const hashToken = (t: string) =>
  createHash("sha256").update(t).digest("hex");

export async function readEditToken(): Promise<string | null> {
  const v = (await cookies()).get(EDIT_COOKIE)?.value;
  return v && /^[A-Za-z0-9_-]{20,64}$/.test(v) ? v : null;
}

export const editCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};
