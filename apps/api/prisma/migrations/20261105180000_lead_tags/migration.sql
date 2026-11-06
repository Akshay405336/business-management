CREATE TABLE "lead_tags" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#64748b',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lead_tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lead_tag_assignments" (
    "lead_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "lead_tag_assignments_pkey" PRIMARY KEY ("lead_id","tag_id")
);

CREATE UNIQUE INDEX "lead_tags_organization_id_slug_key" ON "lead_tags"("organization_id", "slug");
CREATE INDEX "lead_tags_organization_id_name_idx" ON "lead_tags"("organization_id", "name");
CREATE INDEX "lead_tag_assignments_tag_id_idx" ON "lead_tag_assignments"("tag_id");

ALTER TABLE "lead_tags" ADD CONSTRAINT "lead_tags_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_tag_assignments" ADD CONSTRAINT "lead_tag_assignments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_tag_assignments" ADD CONSTRAINT "lead_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "lead_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "lead_tags" ("id", "organization_id", "name", "slug", "color", "created_at", "updated_at")
SELECT gen_random_uuid(), o."id", v."name", v."slug", v."color", NOW(), NOW()
FROM "organizations" o
CROSS JOIN (
  VALUES
    ('Urgent', 'urgent', '#ef4444'),
    ('Risk', 'risk', '#f59e0b')
) AS v("name", "slug", "color")
WHERE NOT EXISTS (
  SELECT 1 FROM "lead_tags" lt WHERE lt."organization_id" = o."id" AND lt."slug" = v."slug"
);
