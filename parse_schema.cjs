const fs = require('fs');
const path = require('path');
const data = fs.readFileSync(path.join('C:', 'Users', 'camil', 'supabase_schema.json'), 'utf8');
const swagger = JSON.parse(data);
console.log('=== TOUTES LES TABLES ===');
console.log(Object.keys(swagger.definitions || {}).sort().join('\n'));
