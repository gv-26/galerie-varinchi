/**
 * Reads a secret value from SST Ion's injected environment variables.
 * 
 * SST Ion injects linked secrets as `SST_RESOURCE_<NAME>` env vars.
 * The value is a JSON-encoded object: { "type": "sst.sst.Secret", "value": "..." }
 * 
 * Falls back to `process.env[name]` for local development.
 */
export function getSecret(name: string): string | undefined {
  if (name === 'RESEND_API_KEY') {
    const myResendVar = process.env['MY_RESEND_API_KEY'];
    if (myResendVar) return myResendVar;
  }
  if (name === 'AWS_ACCESS_KEY_ID') {
    const myAccessVar = process.env['MY_AWS_ACCESS_KEY_ID'];
    if (myAccessVar) return myAccessVar;
  }
  if (name === 'AWS_SECRET_ACCESS_KEY') {
    const mySecretVar = process.env['MY_AWS_SECRET_ACCESS_KEY'];
    if (mySecretVar) return mySecretVar;
  }
  if (name === 'AWS_REGION') {
    const myRegionVar = process.env['MY_AWS_REGION'];
    if (myRegionVar) return myRegionVar;
  }
  if (name === 'AWS_SESSION_TOKEN') {
    return undefined;
  }

  // Try direct env var next
  const directVar = process.env[name];
  if (directVar) return directVar;
  
  // Try SST resource link (Ion uses SST_RESOURCE_<NAME>)
  const sstVar = process.env[`SST_RESOURCE_${name}`];
  if (sstVar) {
    try {
      const parsed = JSON.parse(sstVar);
      return parsed.value ?? sstVar;
    } catch {
      return sstVar;
    }
  }
  return undefined;
}
