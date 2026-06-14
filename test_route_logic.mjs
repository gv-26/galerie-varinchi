import { db } from './src/db/index.js';
import * as schema from './src/db/schema.js';
import { eq, and } from 'drizzle-orm';

async function test() {
  try {
    const profileId = 'bfe2ab8c-50b9-4369-89b7-a9419a3d2514'; // Haritha Menon
    console.log('Checking active version...');
    const active = await db.query.agreementVersion.findFirst({
      where: eq(schema.agreementVersion.isActive, true),
    });
    console.log('Active Version:', active);

    if (active) {
      console.log('Checking consent for profile', profileId, 'and version', active.id);
      const consent = await db.query.artistAgreementConsent.findFirst({
        where: and(
          eq(schema.artistAgreementConsent.artistId, profileId),
          eq(schema.artistAgreementConsent.agreementVersionId, active.id)
        ),
      });
      console.log('Consent:', consent);
      console.log('Pending Version Result:', consent ? null : active);
    }
  } catch (e) {
    console.error('ERROR:', e);
  }
}

test().catch(console.error);
