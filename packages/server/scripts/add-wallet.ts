import Database from 'better-sqlite3';
import crypto from 'crypto';
import 'dotenv/config';

// Encryption constants matching src/utils/crypto.ts
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function getEncryptionKey(secret: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256');
}

function encryptPrivateKey(privateKey: string, secret: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = getEncryptionKey(secret, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(privateKey, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([salt, iv, authTag, encrypted]);
    return combined.toString('base64');
}

const secret = process.env.ENCRYPTION_SECRET || 'development-secret-key';
const subdomain = process.argv[2] || 'demo';

import { privateKeyToAccount } from 'viem/accounts';

// Generate a random wallet
const privateKey = `0x${crypto.randomBytes(32).toString('hex')}` as `0x${string}`;
const account = privateKeyToAccount(privateKey);
const address = account.address;
const encrypted = encryptPrivateKey(privateKey, secret);

const db = new Database('./data/openfacilitator.db');

interface FacilitatorRow {
    id: string;
}

const facilitator = db.prepare('SELECT id FROM facilitators WHERE subdomain = ?').get(subdomain) as FacilitatorRow | undefined;

if (!facilitator) {
    console.log(`Facilitator with subdomain "${subdomain}" not found. Creating it...`);
    const id = crypto.randomBytes(8).toString('hex');
    db.prepare(`
    INSERT INTO facilitators (id, name, subdomain, owner_address, supported_chains, supported_tokens, encrypted_private_key)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        'Demo Facilitator',
        subdomain,
        address,
        JSON.stringify([84532, 11155111]),
        JSON.stringify([]),
        encrypted
    );
} else {
    db.prepare('UPDATE facilitators SET encrypted_private_key = ?, owner_address = ? WHERE id = ?').run(encrypted, address, facilitator.id);
}

console.log(`✅ Configured EVM wallet for facilitator: ${subdomain}`);
console.log(`📍 Wallet Address: ${address}`);
console.log(`🔐 Using encryption secret: ${secret === 'development-secret-key' ? 'default (development-secret-key)' : 'from environment'}`);
console.log(`\nIMPORTANT: Make sure your server is running with the SAME secret!`);
if (secret === 'development-secret-key') {
    console.log(`Run server with: ENCRYPTION_SECRET=development-secret-key npm run dev`);
}

db.close();
