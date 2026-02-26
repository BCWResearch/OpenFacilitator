import Database from 'better-sqlite3';

const db = new Database('./data/openfacilitator.db');
const demo = db.prepare('SELECT * FROM facilitators WHERE subdomain = ?').get('demo');

if (demo) {
    console.log('--- Demo Facilitator ---');
    console.log(JSON.stringify(demo, null, 2));
} else {
    console.log('Demo facilitator not found.');
    const all = db.prepare('SELECT subdomain FROM facilitators').all();
    console.log('Available subdomains:', all.map(a => a.subdomain));
}

db.close();
