import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(process.cwd(), 'public/locales');
const SOURCE_LANG = 'en';
const TARGET_LANGS = ['ar', 'es', 'fr', 'de', 'ru'];

function syncKeys(source, target, prefix = '') {
  const synced = { ...target };
  const obsoleteKeys = [];

  for (const [key, value] of Object.entries(source)) {
    const fullKey = prefix ? `.`` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (!synced[key] || typeof synced[key] !== 'object') {
        synced[key] = {};
      }
      const [nested, obsolete] = syncKeys(value, synced[key], fullKey);
      synced[key] = nested;
      obsoleteKeys.push(...obsolete);
    } else {
      if (!(key in synced) || (typeof synced[key] === 'string' && synced[key].startsWith('[TRANSLATE'))) {
        synced[key] = `[TRANSLATE: ``] ```;
      }
    }
  }

  for (const key of Object.keys(target)) {
    if (!(key in source)) {
      const fullKey = prefix ? `.`` : key;
      obsoleteKeys.push(fullKey);
      delete synced[key];
    }
  }

  return [synced, obsoleteKeys];
}

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `.`` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

console.log('🔄 Synchronizing translation keys...\n');

const enDir = path.join(LOCALES_DIR, SOURCE_LANG);
if (!fs.existsSync(enDir)) {
  console.error(`❌ English source directory not found: ``);
  process.exit(1);
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
let totalSynced = 0;
let totalAdded = 0;
let totalRemoved = 0;

for (const targetLang of TARGET_LANGS) {
  const targetDir = path.join(LOCALES_DIR, targetLang);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`📁 Created directory: `/`);
  }

  for (const file of enFiles) {
    const enPath = path.join(enDir, file);
    const targetPath = path.join(targetDir, file);
    
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const targetData = fs.existsSync(targetPath) 
      ? JSON.parse(fs.readFileSync(targetPath, 'utf8'))
      : {};

    const beforeKeys = Object.keys(flattenObject(targetData)).length;
    const [synced, obsolete] = syncKeys(enData, targetData);
    const afterKeys = Object.keys(flattenObject(synced)).length;
    
    const added = afterKeys - beforeKeys + obsolete.length;
    const removed = obsolete.length;

    if (added > 0 || removed > 0) {
      fs.writeFileSync(targetPath, JSON.stringify(synced, null, 2) + '\n');
      console.log(`✨ `/``: +`` keys, -`` keys`);
      totalSynced++;
      totalAdded += added;
      totalRemoved += removed;
    }
  }
}

console.log(`\n✅ Sync complete!`);
console.log(`   Files updated: ```);
console.log(`   Keys added: ```);
console.log(`   Keys removed: ```);

if (totalAdded > 0) {
  console.log(`\n⚠️  New keys added with [TRANSLATE] placeholders`);
  console.log(`   Replace placeholders with actual translations`);
  console.log(`   Then run: npm run i18n:audit`);
}
