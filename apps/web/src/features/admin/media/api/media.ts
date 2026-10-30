import { MEDIA_ROUTES, type StoredObjectUploadResponse } from '@techwin/contracts';
import { accessTokenStore } from '@/shared/api/api-client';
import { apiConfig } from '@/shared/api/api-config';
import { readCookie } from '@/shared/lib/cookies';

export async function uploadStoredObject(
  file: File,
  category: 'EMPLOYEE_PROFILE_IMAGE',
): Promise<StoredObjectUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const headers = new Headers();
  const token = accessTokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const csrf = readCookie(apiConfig.csrfCookie);
  if (csrf) headers.set(apiConfig.csrfHeader, csrf);
  const url = `${apiConfig.baseUrl}${MEDIA_ROUTES.storedObjects}?category=${encodeURIComponent(category)}`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    throw new Error('File upload failed.');
  }
  return (await response.json()) as StoredObjectUploadResponse;
}
