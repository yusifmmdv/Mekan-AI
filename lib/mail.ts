import nodemailer from "nodemailer";
import { db } from "./db";
import { hashToken, newToken } from "./security";
import { appUrl } from "./config";
import { assert } from "./errors";
export const mailConfigured = () => !!process.env.SMTP_HOST;
export async function sendAuthMail(
  userId: string,
  email: string,
  kind: "RESET" | "VERIFY",
) {
  assert(
    mailConfigured(),
    503,
    "MAIL_NOT_CONFIGURED",
    "E-poçt xidməti konfiqurasiya edilməyib.",
  );
  const token = newToken();
  await db.authToken.create({
    data: {
      userId,
      kind,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const url = `${appUrl}/${kind === "RESET" ? "reset-password" : "verify-email"}?token=${token}`;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: kind === "RESET" ? "Şifrəni yeniləyin" : "E-poçtu təsdiqləyin",
    text: `Mekan AI: ${url}\nLink 1 saat etibarlıdır.`,
  });
}
