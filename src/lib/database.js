import { createClient } from "@libsql/client";

let client;

export function getDatabase() {
  if (!client) {
    const url = process.env.DATABASE_URL || "file:./data/cinema.db";
    if (process.env.VERCEL && url.startsWith("file:")) {
      throw new Error("A hosted DATABASE_URL is required on Vercel.");
    }
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return client;
}
