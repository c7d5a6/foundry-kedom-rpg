-- name: ListAppliedMigrations :many
SELECT version, applied_at FROM schema_migrations ORDER BY version;

-- name: RecordMigration :exec
INSERT INTO schema_migrations (version) VALUES (?);
