/**
 * Reads a secret value from SST Ion's injected environment variables.
 * 
 * SST Ion injects linked secrets as `SST_RESOURCE_<NAME>` env vars.
 * The value is a JSON-encoded object: { "type": "sst.sst.Secret", "value": "..." }
 * 
 * Falls back to `process.env[name]` for local development.
 */
export function getSecret(name: string): string | undefined {
  // Try direct env var first
  const directVar = process.env[name];
  if (directVar) return directVar;
  
  if (name === 'RESEND_API_KEY') return process.env['MY_RESEND_API_KEY'];
  if (name === 'AWS_ACCESS_KEY_ID') return process.env['MY_AWS_ACCESS_KEY_ID'];
  if (name === 'AWS_SECRET_ACCESS_KEY') return process.env['MY_AWS_SECRET_ACCESS_KEY'];
  if (name === 'AWS_REGION') return process.env['MY_AWS_REGION'];
  
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
