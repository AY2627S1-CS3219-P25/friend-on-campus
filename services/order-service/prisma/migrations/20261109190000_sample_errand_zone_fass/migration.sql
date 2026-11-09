-- AI Assistance Disclosure:
-- Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
-- Scope: Data correction for the two sample errands the seed created with zone 'Arts & Social Sciences'. Every
--        other source names that zone 'FASS' (the supplier seed's building mapping, the admin zone list, the
--        student feed tabs), so the feed's FASS tab matched neither errand. The seed only inserts missing rows,
--        so databases seeded earlier keep the old value unless it is corrected here. No schema change.
-- Author review: <to be completed by Reallyeasy1>
-- AI-generated (edited by Reallyeasy1)

-- Scoped to the two sample order codes; an errand that is not a sample is never touched.
UPDATE "orders"
SET "campus_zone" = 'FASS'
WHERE "order_code" IN ('ORD-54312', 'ORD-86429')
  AND "campus_zone" = 'Arts & Social Sciences';
