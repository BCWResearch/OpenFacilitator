"use strict";
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = require("better-sqlite3");
var nanoid_1 = require("nanoid");
var dbPath = './packages/server/data/openfacilitator.db';
var db = new better_sqlite3_1.default(dbPath);
console.log('Bootstrapping development database...');
// 1. Create a test user
var userId = '0x1234567890123456789012345678901234567890';
try {
    db.prepare('INSERT INTO user (id, name, email) VALUES (?, ?, ?)').run(userId, 'Tester', 'tester@example.com');
    console.log('✅ Created test user:', userId);
}
catch (e) {
    if ((_a = e.message) === null || _a === void 0 ? void 0 : _a.includes('UNIQUE constraint failed')) {
        console.log('ℹ️ Test user already exists');
    }
    else {
        console.error('❌ Failed to create user:', e.message);
    }
}
// 2. Create a test facilitator (demo)
var facilitatorId = (0, nanoid_1.nanoid)();
var subdomain = 'demo';
var sepoliaChainId = 11155111;
var sepoliaUSDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
try {
    db.prepare("\n    INSERT INTO facilitators (id, name, subdomain, owner_address, supported_chains, supported_tokens)\n    VALUES (?, ?, ?, ?, ?, ?)\n  ").run(facilitatorId, 'Demo Facilitator', subdomain, userId, JSON.stringify([sepoliaChainId]), // Only Sepolia
    JSON.stringify([
        {
            address: sepoliaUSDC,
            symbol: 'USDC',
            decimals: 6,
            chainId: sepoliaChainId
        }
    ]));
    console.log('✅ Created test facilitator:');
    console.log('   ID:', facilitatorId);
    console.log('   Subdomain:', subdomain);
    console.log('   Chain:', sepoliaChainId, '(Sepolia)');
}
catch (e) {
    if ((_b = e.message) === null || _b === void 0 ? void 0 : _b.includes('UNIQUE constraint failed')) {
        console.log("\u2139\uFE0F Facilitator with subdomain \"".concat(subdomain, "\" already exists. Updating configuration..."));
        db.prepare("\n            UPDATE facilitators \n            SET supported_chains = ?, supported_tokens = ?\n            WHERE subdomain = ?\n        ").run(JSON.stringify([sepoliaChainId]), JSON.stringify([{
                address: sepoliaUSDC,
                symbol: 'USDC',
                decimals: 6,
                chainId: sepoliaChainId
            }]), subdomain);
        console.log('✅ Updated existing facilitator config to Sepolia');
    }
    else {
        console.error('❌ Failed to create/update facilitator:', e.message);
    }
}
db.close();
console.log('Done! You can now test with:');
console.log("curl http://127.0.0.1:5002/supported?_subdomain=".concat(subdomain));
