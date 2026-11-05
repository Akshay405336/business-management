-- Persist individually selected leave dates (multi-date requests).

ALTER TABLE "leave_requests" ADD COLUMN "half_day_date" DATE;

CREATE TABLE "leave_request_dates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "leave_request_id" UUID NOT NULL,
    "leave_date" DATE NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "leave_request_dates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "leave_request_date_unique" ON "leave_request_dates"("leave_request_id", "leave_date");
CREATE INDEX "leave_request_date_org_date_idx" ON "leave_request_dates"("organization_id", "leave_date");
CREATE INDEX "leave_request_date_request_sort_idx" ON "leave_request_dates"("leave_request_id", "sort_order");

ALTER TABLE "leave_request_dates" ADD CONSTRAINT "leave_request_dates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_request_dates" ADD CONSTRAINT "leave_request_dates_leave_request_id_fkey" FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one row per calendar day in the legacy start/end range for existing requests.
INSERT INTO "leave_request_dates" ("id", "organization_id", "leave_request_id", "leave_date", "sort_order")
SELECT
    gen_random_uuid(),
    lr."organization_id",
    lr."id",
    gs.day::date,
    (ROW_NUMBER() OVER (PARTITION BY lr."id" ORDER BY gs.day) - 1)::integer
FROM "leave_requests" lr
CROSS JOIN LATERAL generate_series(lr."start_date", lr."end_date", INTERVAL '1 day') AS gs(day);

UPDATE "leave_requests" lr
SET "half_day_date" = lr."start_date"
WHERE lr."is_half_day" = true AND lr."half_day_date" IS NULL;
