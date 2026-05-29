import path from "path";
import { PrismaClient } from "@/app/generated/prisma/client";

let localPrisma: PrismaClient | undefined;
let tursoPrisma: PrismaClient | undefined;

export function getLocalPrisma(): PrismaClient {
  if (!localPrisma) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    localPrisma = new PrismaClient({ adapter });
  }
  return localPrisma;
}

export function getTursoPrisma(): PrismaClient {
  if (!tursoPrisma) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
      throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local");
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSql } = require("@prisma/adapter-libsql/web");
    const adapter = new PrismaLibSql({ url, authToken });
    tursoPrisma = new PrismaClient({ adapter });
  }
  return tursoPrisma;
}
