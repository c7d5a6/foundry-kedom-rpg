-- Character sheet banner art for a region (Foundry path or URL). Empty = system default.

PRAGMA foreign_keys = ON;

ALTER TABLE region ADD COLUMN banner_img TEXT NOT NULL DEFAULT '';
