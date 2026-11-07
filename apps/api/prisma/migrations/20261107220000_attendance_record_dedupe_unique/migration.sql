-- Forward-only cleanup: keep the newest row per org + employee + attendance date.
DELETE FROM "attendance_records" AS target
USING (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, employee_id, attendance_date
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS row_num
  FROM "attendance_records"
) AS ranked
WHERE target.id = ranked.id
  AND ranked.row_num > 1;
