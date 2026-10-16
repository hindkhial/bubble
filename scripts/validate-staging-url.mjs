export function validateStagingUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !url.hostname || url.hostname.includes('*') || value !== url.origin)
    throw new Error('Use an explicit HTTPS staging origin without credentials, path or trailing slash.');
  return value;
}
if (process.argv[1]?.endsWith('/validate-staging-url.mjs')) validateStagingUrl(process.argv[2]);
