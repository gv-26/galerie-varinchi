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
  
  if (name === 'RESEND_API_KEY') {
    const myResendVar = process.env['MY_RESEND_API_KEY'];
    if (myResendVar) return myResendVar;
  }

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
