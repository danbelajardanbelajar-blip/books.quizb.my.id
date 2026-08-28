const fs = require('fs');
const path = require('path');
const dbPath = path.resolve('../golden_server/database.sqlite');
console.log('Exists?', fs.existsSync(dbPath));
