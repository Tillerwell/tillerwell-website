-- 046 - Per-admin sidebar favourites, stored server-side.
--
-- Favourites used to live only in each browser's localStorage, so they did not
-- follow a person to another browser or device. They now live on the user row.
--
-- Additive and idempotent: a fresh install gets the column from the init
-- migration, an existing one from here on its next update. NULL means "never
-- saved": the sidebar uploads the favourites (and their order) that browser
-- already held the first time it loads, so nobody loses their current setup.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sidebarFavourites" JSONB;
