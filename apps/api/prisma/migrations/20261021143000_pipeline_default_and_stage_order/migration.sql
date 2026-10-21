-- Default pipeline flag and active stage order normalization
ALTER TABLE "pipelines" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "pipelines_organization_id_is_default_idx" ON "pipelines"("organization_id", "is_default");

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id
      ORDER BY sort_order ASC, created_at ASC
    ) AS rn
  FROM pipelines
)
UPDATE pipelines AS p
SET is_default = true
FROM ranked AS r
WHERE p.id = r.id AND r.rn = 1;

UPDATE pipeline_stages
SET sort_order = 0
WHERE status = 'INACTIVE';

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY pipeline_id
      ORDER BY sort_order ASC, created_at ASC
    ) AS rn
  FROM pipeline_stages
  WHERE status = 'ACTIVE'
)
UPDATE pipeline_stages AS ps
SET sort_order = r.rn
FROM ranked AS r
WHERE ps.id = r.id;
