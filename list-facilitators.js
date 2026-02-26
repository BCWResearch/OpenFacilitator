import Database from 'better-sqlite3';

const dbPath = './packages/server/data/openfacilitator.db';
try {
    const db = new Database(dbPath, { fileMustExist: true });
    const facilitators = db.prepare('SELECT id, name, subdomain, custom_domain FROM facilitators').all();
    console.log('Facilitators found:');
    console.log(JSON.stringify(facilitators, null, 2));
    db.close();
} catch (error) {
    console.error('Error reading database:', error.message);
}
