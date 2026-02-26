import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

const dbPath = './packages/server/data/openfacilitator.db';
const db = new Database(dbPath);

console.log('Bootstrapping development database...');

// 1. Create a test user
const userId = '0x1234567890123456789012345678901234567890';
try {
    db.prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)').run(
        userId,
        'Tester',
        'tester@example.com'
    );
    console.log('✅ Created test user:', userId);
} catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
        console.log('ℹ️ Test user already exists');
    } else {
        console.error('❌ Failed to create user:', e.message);
    }
}

// 2. Create a test facilitator (demo)
const facilitatorId = nanoid();
const subdomain = 'demo';
const sepoliaChainId = 11155111;
const sepoliaUSDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

try {
    db.prepare(`
    INSERT INTO facilitators (id, name, subdomain, owner_address, supported_chains, supported_tokens)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
        facilitatorId,
        'Demo Facilitator',
        subdomain,
        userId,
        JSON.stringify([sepoliaChainId]), // Only Sepolia
        JSON.stringify([
            {
                address: sepoliaUSDC,
                symbol: 'USDC',
                decimals: 6,
                chainId: sepoliaChainId
            }
        ])
    );
    console.log('✅ Created test facilitator:');
    console.log('   ID:', facilitatorId);
    console.log('   Subdomain:', subdomain);
    console.log('   Chain:', sepoliaChainId, '(Sepolia)');
} catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed')) {
        console.log(`ℹ️ Facilitator with subdomain "${subdomain}" already exists. Updating configuration...`);
        db.prepare(`
            UPDATE facilitators 
            SET supported_chains = ?, supported_tokens = ?
            WHERE subdomain = ?
        `).run(
            JSON.stringify([sepoliaChainId]),
            JSON.stringify([{
                address: sepoliaUSDC,
                symbol: 'USDC',
                decimals: 6,
                chainId: sepoliaChainId
            }]),
            subdomain
        );
        console.log('✅ Updated existing facilitator config to Sepolia');
    } else {
        console.error('❌ Failed to create/update facilitator:', e.message);
    }
}

db.close();
console.log('Done! You can now test with:');
console.log(`curl http://127.0.0.1:5002/supported?_subdomain=${subdomain}`);
