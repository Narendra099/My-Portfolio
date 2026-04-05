import dotenv from "dotenv";

dotenv.config();

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8787),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleRedirectUri: required("GOOGLE_REDIRECT_URI"),
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
  sessionSecret: required("SESSION_SECRET"),
};
