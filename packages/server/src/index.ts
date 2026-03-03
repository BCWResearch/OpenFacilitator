import 'dotenv/config';
import { createServer } from './server.js';
import { initializeDatabase } from './db/index.js';
import { initializeAuth } from './auth/index.js';
import { initializeBillingCron } from './services/billing-cron.js';
import { backfillFacilitatorSubscriptions } from './db/facilitators.js';

const PORT = parseInt(process.env.PORT || '5002', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DATABASE_PATH = process.env.DATABASE_PATH || './data/openfacilitator.db';

async function main() {
  // Initialize database
  await initializeDatabase(DATABASE_PATH);

  // Initialize auth
  initializeAuth(DATABASE_PATH);

  // Backfill subscriptions for existing facilitator owners
  const backfilledCount = backfillFacilitatorSubscriptions();
  if (backfilledCount > 0) {
    console.log(`📋 Backfilled ${backfilledCount} subscription(s) for existing facilitator owners`);
  }

  // Create and start server
  const app = createServer();

  app.listen(PORT, HOST, () => {
    console.log(`🚀 OpenFacilitator server running at http://${HOST}:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Database: ${DATABASE_PATH}`);

    // Initialize billing cron job
    initializeBillingCron();

    // Seed demo facilitator if in development mode
    if (process.env.NODE_ENV === 'development') {
      seedDemoFacilitator().catch((err) => {
        console.error('Failed to seed demo facilitator:', err);
      });
    }
  });
}

/**
 * Seed a demo facilitator for local development
 */
async function seedDemoFacilitator() {
  const { getFacilitatorBySubdomain, createFacilitator, updateFacilitator } = await import('./db/facilitators.js');
  const { encryptPrivateKey } = await import('./utils/crypto.js');
  const { generateSolanaKeypair } = await import('@openfacilitator/core');

  const demoSubdomain = 'demo';
  const facilitator = getFacilitatorBySubdomain(demoSubdomain);

  if (!facilitator) {
    console.log(`[Dev] Seeding demo facilitator for subdomain: ${demoSubdomain}`);
    const kp = generateSolanaKeypair();
    const encryptedKey = encryptPrivateKey(kp.privateKey);

    const newFacilitator = createFacilitator({
      name: 'Demo Facilitator',
      subdomain: demoSubdomain,
      owner_address: '0x0000000000000000000000000000000000000000',
      supported_chains: JSON.stringify(['solana-devnet']),
      supported_tokens: JSON.stringify([{
        symbol: 'EURC',
        address: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
        decimals: 6,
        chainId: 'solana-devnet',
      }]),
    });

    if (newFacilitator) {
      updateFacilitator(newFacilitator.id, {
        encrypted_solana_private_key: encryptedKey
      });
      console.log(`[Dev] Demo facilitator created with Solana key: ${kp.publicKey}`);
    }
  } else if (!facilitator.encrypted_solana_private_key) {
    console.log(`[Dev] Enabling Solana on existing demo facilitator...`);
    const kp = generateSolanaKeypair();
    const encryptedKey = encryptPrivateKey(kp.privateKey);

    const chains = JSON.parse(facilitator.supported_chains);
    if (!chains.includes('solana-devnet')) {
      chains.push('solana-devnet');
    }

    const tokens = JSON.parse(facilitator.supported_tokens);
    if (!tokens.find((t: any) => (t.chainId === 'solana-devnet' || t.chainId === 'solana') && t.symbol === 'EURC')) {
      tokens.push({
        symbol: 'EURC',
        address: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
        decimals: 6,
        chainId: 'solana-devnet',
      });
    }

    updateFacilitator(facilitator.id, {
      encrypted_solana_private_key: encryptedKey,
      supported_chains: JSON.stringify(chains),
      supported_tokens: JSON.stringify(tokens),
    });
    console.log(`[Dev] Solana enabled for demo facilitator with key: ${kp.publicKey}`);
  } else {
    // Solana already enabled, ensure EURC is in supported tokens
    const tokens = JSON.parse(facilitator.supported_tokens);
    const hasEURC = tokens.some((t: any) => t.symbol === 'EURC' && (t.chainId === 'solana-devnet' || t.chainId === 'solana'));

    if (!hasEURC) {
      console.log(`[Dev] Adding EURC support to existing demo facilitator...`);
      tokens.push({
        symbol: 'EURC',
        address: 'HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr',
        decimals: 6,
        chainId: 'solana-devnet',
      });
      updateFacilitator(facilitator.id, {
        supported_tokens: JSON.stringify(tokens),
      });
    }

    const { decryptPrivateKey } = await import('./utils/crypto.js');
    const { getSolanaPublicKey } = await import('@openfacilitator/core');
    try {
      const privateKey = decryptPrivateKey(facilitator.encrypted_solana_private_key);
      const publicKey = getSolanaPublicKey(privateKey);
      console.log(`[Dev] Demo facilitator ${demoSubdomain} active with Solana key: ${publicKey}`);
    } catch (e) {
      console.error('[Dev] Failed to decrypt Solana key for demo facilitator');
    }
  }
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { createServer } from './server.js';
export * from './db/index.js';
export * from './auth/index.js';

