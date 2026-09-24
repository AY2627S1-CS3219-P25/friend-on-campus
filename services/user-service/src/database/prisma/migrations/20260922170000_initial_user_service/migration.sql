-- AI Assistance Disclosure:
-- Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
-- Scope: Created the initial Prisma migration for the approved User and Session persistence schema.
-- Author review: <to be completed by ngkhengyang>

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_role_check" CHECK ("role" IN ('STUDENT', 'ADMIN')),
    CONSTRAINT "users_username_not_blank_check" CHECK (BTRIM("username") <> ''),
    CONSTRAINT "users_email_not_blank_check" CHECK (BTRIM("email") <> '')
);

CREATE UNIQUE INDEX "users_username_case_insensitive_uq"
    ON "users" (LOWER("username"));
CREATE UNIQUE INDEX "users_email_case_insensitive_uq"
    ON "users" (LOWER("email"));

CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "persistent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idle_expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_refresh_token_hash_key" UNIQUE ("refresh_token_hash"),
    CONSTRAINT "sessions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "sessions_user_expiry_idx" ON "sessions" ("user_id", "idle_expires_at");
