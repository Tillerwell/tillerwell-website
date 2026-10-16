-- 045 - Per-admin notification preferences.
--
-- Settings > General > Notifications: which kinds of admin notification each
-- person sees in the bell, and which they also want a browser alert for.
--
-- Additive and idempotent: a fresh install gets the column from the init
-- migration, an existing one from here on its next update. NULL means "the
-- defaults", which is exactly how every notification behaved before this
-- existed, so there is nothing to backfill.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationPrefs" JSONB;
