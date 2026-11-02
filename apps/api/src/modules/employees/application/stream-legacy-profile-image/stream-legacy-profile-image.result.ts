export type StreamLegacyProfileImageResult =
  | { readonly kind: 'not_found' }
  | { readonly kind: 'stream'; readonly absolutePath: string };
