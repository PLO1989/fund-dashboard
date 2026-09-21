import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Benchmark files are reviewed at build time, not written by anonymous site visitors.
export const indexLevelSchema = z.object({
  date: z.string(),
  level: z.number().finite().positive(),
  sourceDate: z.string().optional(),
});
export const benchmarkSeriesSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  provider: z.string().min(1).max(100),
  currency: z.literal("NOK"),
  returnType: z.enum(["NET_TR", "GROSS_TR", "TR"]),
  hedging: z.enum(["UNHEDGED", "NOK_HEDGED", "NA"]),
  levels: z.array(indexLevelSchema).min(1).max(2400),
});
export const benchmarkPackageSchema = z.object({
  version: z.literal(1),
  series: z.array(benchmarkSeriesSchema).max(100),
  assignments: z.record(z.string()),
});
export type BenchmarkSeries = z.infer<typeof benchmarkSeriesSchema>;
export type BenchmarkPackage = z.infer<typeof benchmarkPackageSchema>;
