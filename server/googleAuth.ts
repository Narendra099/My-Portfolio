import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { config } from "./config.js";
import { readJsonFile, writeJsonFile } from "./storage.js";

type StoredTokens = Credentials;

const TOKEN_FILE = "google-tokens.json";

export function createOAuthClient() {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri,
  );
}

export async function loadOAuthClient() {
  const client = createOAuthClient();
  const tokens = await readStoredTokens();
  if (tokens) {
    client.setCredentials(tokens);
  }
  return client;
}

export async function readStoredTokens() {
  return readJsonFile<StoredTokens>(TOKEN_FILE);
}

export async function saveTokens(tokens: StoredTokens) {
  const previous = (await readStoredTokens()) ?? {};
  const merged = {
    ...previous,
    ...tokens,
    refresh_token: tokens.refresh_token ?? previous.refresh_token,
  };
  await writeJsonFile(TOKEN_FILE, merged);
  return merged;
}
