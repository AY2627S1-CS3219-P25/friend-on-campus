-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
-- Scope: Data correction for the two sample errands the seed created with zone 'Arts & Social Sciences'.
-- Author review: I validated correctness, edited for style, and verified with automated tests.

-- Scoped to the two sample order codes; an errand that is not a sample is never touched.
UPDATE "orders"
SET "campus_zone" = 'FASS'
WHERE "order_code" IN ('ORD-54312', 'ORD-86429')
  AND "campus_zone" = 'Arts & Social Sciences';
