# File storage (S3)

Central uploads are persisted as `stored_objects` rows and served only through authorized API routes (`/api/v1/media/objects/:id/content`). Objects are private in S3; the API returns short-lived presigned URLs after permission checks.

## Environment variables

Set in Coolify (or `.env` locally). Never commit secrets.

| Variable | Description |
| --- | --- |
| `STORAGE_PROVIDER` | `local` (default in development) or `s3` (default in production). |
| `AWS_ACCESS_KEY_ID` | IAM access key. Required when `STORAGE_PROVIDER=s3`. |
| `AWS_SECRET_ACCESS_KEY` | IAM secret. Required when `STORAGE_PROVIDER=s3`. |
| `AWS_REGION` | e.g. `ap-south-1` |
| `AWS_S3_BUCKET` | e.g. `techwin-s3` |
| `STORAGE_PRESIGNED_TTL_SECONDS` | Presigned download lifetime (default 900). |
| `STORAGE_EMPLOYEE_PROFILE_MAX_BYTES` | Profile image limit (default 5 MB). |

## IAM (least privilege)

Grant the application user only:

- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, `s3:HeadObject` on `arn:aws:s3:::techwin-s3/org/*` (adjust bucket name).

Block public ACLs and bucket policies that expose objects anonymously.

## Local development

With `STORAGE_PROVIDER=local` (default when `NODE_ENV=development`), files are written under `apps/api/data/uploads/objects/`. This path is gitignored.

## Failed cleanup

If S3 delete fails after a DB unlink, a row is inserted into `storage_cleanup_jobs`. Re-run cleanup by calling `StoredFileService.processCleanupQueue()` from an operational script or a future admin task; pending jobs retry up to five times.

## Credential rotation

1. Create a new IAM access key.
2. Update `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Coolify.
3. Redeploy the API.
4. Deactivate the old key after traffic is healthy.

## Testing uploads

1. Sign in to the admin app with `media.upload` and `employees.create`.
2. Add or edit an employee and upload a JPEG/PNG/WebP under 5 MB.
3. Confirm the list avatar loads via `/api/v1/media/objects/{id}/content`.
