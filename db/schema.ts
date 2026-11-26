import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // CloudHike auth user id
  name: text("name"),
  email: text("email").notNull().unique(),
  credits: integer("credits").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  // Display name auto-generated from the prompt (see lib/project-name.ts).
  // Nullable so rows created before this column existed still load.
  name: text("name"),
  prompt: text("prompt").notNull(),
  // 'pending' is the only status for now; the AI build pipeline will add more later.
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectAssets = pgTable("project_assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  key: text("key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectAsset = typeof projectAssets.$inferSelect;
export type NewProjectAsset = typeof projectAssets.$inferInsert;
