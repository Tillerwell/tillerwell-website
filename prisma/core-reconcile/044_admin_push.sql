-- Bell alerts by Web Push: a new order (or any other bell message) reaches an
-- admin's laptop and phone with no admin tab open. See lib/push.
--
-- Additive and idempotent: a fresh install gets all of this from the init
-- migration, an existing one from here on its next update. Nothing to backfill -
-- nobody has subscribed until they press the bell's alerts button.

-- The site's signing pair, made on first use.
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "pushVapidPublic" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "pushVapidPrivateEncrypted" TEXT;

CREATE TABLE IF NOT EXISTS "AdminPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminPushSubscription_endpoint_key" ON "AdminPushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "AdminPushSubscription_userId_idx" ON "AdminPushSubscription"("userId");

-- A constraint has no IF NOT EXISTS, so it is added only where it is missing,
-- the same way 043 does it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdminPushSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "AdminPushSubscription"
      ADD CONSTRAINT "AdminPushSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
