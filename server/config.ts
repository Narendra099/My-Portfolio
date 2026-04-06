import dotenv from "dotenv";

dotenv.config();

const defaultPort = Number(process.env.PORT ?? 8787);
const publicUrl = process.env.RENDER_EXTERNAL_URL ?? `http://localhost:${defaultPort}`;
const frontendUrl = process.env.FRONTEND_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:5173";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: defaultPort,
  frontendUrl,
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? `${publicUrl}/auth/google/callback`,
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
  sessionSecret: required("SESSION_SECRET"),
};
