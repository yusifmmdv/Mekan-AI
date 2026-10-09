import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { hashToken, newToken } from "./security";
import { assert } from "./errors";
import type { Role } from "@/generated/prisma/client";
export const COOKIE = "mekan_session";
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: { wallet: true, profile: true, store: true, designer: true },
      },
    },
  });
  return s && s.expiresAt > new Date() && !s.user.disabled ? s.user : null;
}
export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  assert(user, 401, "AUTH", "Hesabınıza daxil olun.");
  assert(
    !roles || roles.includes(user.role),
    403,
    "FORBIDDEN",
    "Bu əməliyyat üçün icazəniz yoxdur.",
  );
  return user;
}
export async function pageUser(roles?: Role[]) {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (roles && !roles.includes(u.role)) redirect("/dashboard");
  return u;
}
export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE);
}
export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);
