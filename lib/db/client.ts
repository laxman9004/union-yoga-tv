import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createTursoClient(): PrismaClient {
  // Web adapter — works on Netlify serverless (no native binaries).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSQL } = require("@prisma/adapter-libsql/web");
  const adapter = new PrismaLibSQL({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  return new PrismaClient({ adapter });
}

function createLocalClient(): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

function createClient(): PrismaClient {
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    return createTursoClient();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Netlify environment variables."
    );
  }
  return createLocalClient();
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

/** Lazy singleton — avoids connecting during `next build`. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as object, prop);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
