import type { ProjectConfig, GeneratedFile, DepMap } from "../../core/types.js";
import { ver } from "../../core/versions.js";

export function ormDeps(config: ProjectConfig): DepMap {
  const d: DepMap = {};
  const { orm, database } = config.features;
  if (orm === "prisma") {
    d["@prisma/client"] = ver("@prisma/client");
  }
  if (orm === "drizzle") {
    d["drizzle-orm"] = ver("drizzle-orm");
    if (database === "postgresql") d.pg = ver("pg");
    if (database === "mysql") d.mysql2 = ver("mysql2");
    if (database === "sqlite") d["better-sqlite3"] = ver("better-sqlite3");
  }
  if (orm === "mongoose" || database === "mongodb") {
    d.mongoose = ver("mongoose");
  }
  return d;
}

export function ormDevDeps(config: ProjectConfig): DepMap {
  const d: DepMap = {};
  if (config.features.orm === "prisma") {
    d.prisma = ver("prisma");
  }
  if (config.features.orm === "drizzle") {
    d["drizzle-kit"] = ver("drizzle-kit");
  }
  return d;
}

export function ormFiles(config: ProjectConfig): GeneratedFile[] {
  const { orm, database } = config.features;
  if (orm === "none" && database === "none") return [];
  const files: GeneratedFile[] = [];

  if (orm === "prisma") {
    const provider =
      database === "postgresql"
        ? "postgresql"
        : database === "mysql"
          ? "mysql"
          : database === "mongodb"
            ? "mongodb"
            : "sqlite";
    files.push({
      path: "prisma/schema.prisma",
      content: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model Item {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
`,
    });
    files.push({
      path: `src/lib/db.${config.language === "ts" ? "ts" : "js"}`,
      content: `import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();
`,
    });
  }

  if (orm === "drizzle") {
    files.push({
      path: "drizzle.config.ts",
      content: `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/schema.ts',
  out: './drizzle',
  dialect: '${database === "mysql" ? "mysql" : database === "sqlite" ? "sqlite" : "postgresql"}',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
});
`,
    });
    files.push({
      path: "src/lib/schema.ts",
      content:
        database === "sqlite"
          ? `import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
`
          : `import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
`,
    });
  }

  if (orm === "mongoose" || (database === "mongodb" && orm === "none")) {
    files.push({
      path: `src/lib/db.${config.language === "ts" ? "ts" : "js"}`,
      content: `import mongoose from 'mongoose';
import { appEnv } from '../config/env.js';

export async function connectDb() {
  await mongoose.connect(appEnv.DATABASE_URL);
  return mongoose.connection;
}
`,
    });
    files.push({
      path: `src/modules/items/item.model.${config.language === "ts" ? "ts" : "js"}`,
      content: `import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
  },
  { timestamps: true },
);

export const ItemModel = mongoose.models.Item || mongoose.model('Item', itemSchema);
`,
    });
  }

  return files;
}

export function redisDeps(config: ProjectConfig): DepMap {
  if (config.features.cache !== "redis") return {};
  return { ioredis: ver("ioredis") };
}

export function redisFiles(config: ProjectConfig): GeneratedFile[] {
  if (config.features.cache !== "redis") return [];
  const e = config.language === "ts" ? "ts" : "js";
  return [
    {
      path: `src/lib/redis.${e}`,
      content: `import Redis from 'ioredis';
import { appEnv } from '../config/env.js';

export const redis = new Redis(appEnv.REDIS_URL);
`,
    },
  ];
}
