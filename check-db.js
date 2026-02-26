
import Database from 'better-sqlite3';

const db = new Database('./packages/server/data/openfacilitator.db');
const facilitator = db.prepare('SELECT * FROM facilitators LIMIT 1').get();
console.log(JSON.stringify(facilitator, null, 2));
db.close();
