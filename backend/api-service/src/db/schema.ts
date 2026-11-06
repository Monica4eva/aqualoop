import { pgSchema, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// api-service tables live in their own Postgres schema so the auth-service
// (which shares the tenant Neon DB) can migrate without touching api
// tables / sequences, and vice versa. The Worker connects
// with the default search_path; queries against these tables use the
// schema-qualified names emitted by drizzle.
export const apiSchema = pgSchema('api');

export const newlyMeta = apiSchema.table(
  '_newly_meta',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    project_id: text('project_id').notNull(),
    env: text('env').notNull(),
    template_version: text('template_version').notNull(),
  },
  (table) => ({
    projectIdIdx: index('_newly_meta_project_id_idx').on(table.project_id),
  }),
);

export type NewlyMetaRow = typeof newlyMeta.$inferSelect;
export type NewlyMetaInsert = typeof newlyMeta.$inferInsert;

export const kvEntries = apiSchema.table(
  'kv_entries',
  {
    key: text('key').primaryKey(),
    value: jsonb('value'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    expiresAtIdx: index('kv_entries_expires_at_idx').on(table.expires_at),
  }),
);

export type KvEntriesRow = typeof kvEntries.$inferSelect;
export type KvEntriesInsert = typeof kvEntries.$inferInsert;
