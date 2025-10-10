import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(process.cwd(), 'public/locales');
const SOURCE_LANG = 'en';
const TARGET_LANGS = ['ar', 'es', 'fr', 'de', 'ru'];

/**
 * Deep merge target with source structure, preserving existing translations
 */
function syncKeys(target, source, enValue, prefix = '') {
  const result = {};
  
  // Add all keys from source (English)
  for (const [key, value] of Object.entries(source)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sync nested objects
      result[key] = syncKeys(
        target[key] || {},
        value,
        enValue[key],
        fullKey
      );
    } else {
      // Use existing translation if available and not a placeholder
      if (target[key] && typeof target[key] === 'string' && !target[key].includes('[TRANSLATE')) {
        result[key] = target[key]; // Preserve existing translation
      } else {
        // Add new key with placeholder
        result[key] = `[TRANSLATE: ${fullKey}] ${enValue[key]}`;
      }
    }
  }
  
  // Check for obsolete keys in target (keys not in source)
  const obsoleteKeys = Object.keys(target).filter(k => !source.hasOwnProperty(k));
  
  return { synced: result, obsolete: obsoleteKeys };
}

console.log('🔄 Syncing translation keys...\n');

const enDir = path.join(LOCALES_DIR, SOURCE_LANG);
if (!fs.existsSync(enDir)) {
  console.error(`❌ English source directory not found: ${enDir}`);
  process.exit(1);
}

const namespaceFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
let totalAdded = 0;
let totalRemoved = 0;
let totalSynced = 0;

for (const file of namespaceFiles) {
  const namespace = file.replace('.json', '');
  const enPath = path.join(enDir, file);
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  for (const lang of TARGET_LANGS) {
    const langDir = path.join(LOCALES_DIR, lang);
    const langPath = path.join(langDir, file);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    // Load existing data or use empty object
    let langData = {};
    if (fs.existsSync(langPath)) {
      langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
    }

    // Sync keys
    const { synced, obsolete } = syncKeys(langData, enData, enData);
    
    // Count changes
    const beforeKeys = Object.keys(flattenObject(langData)).length;
    const afterKeys = Object.keys(flattenObject(synced)).length;
    const added = afterKeys - beforeKeys;
    const removed = obsolete.length;
    
    if (added > 0 || removed > 0) {
      // Write synced data
      fs.writeFileSync(langPath, JSON.stringify(synced, null, 2) + '\n');
      
      let changes = [];
      if (added > 0) {
        changes.push(`+${added} keys`);
        totalAdded += added;
      }
      if (removed > 0) {
        changes.push(`-${removed} keys`);
        totalRemoved += removed;
      }
      
      console.log(`✓ ${lang}/${file}: ${changes.join(', ')}`);
      if (obsolete.length > 0) {
        console.log(`  Removed obsolete keys: ${obsolete.join(', ')}`);
      }
      totalSynced++;
    }
  }
}

console.log(`\n✅ Key sync complete!`);
console.log(`   Files synced: ${totalSynced}`);
console.log(`   Keys added: ${totalAdded}`);
console.log(`   Keys removed: ${totalRemoved}`);

if (totalAdded > 0) {
  console.log(`\n⚠️  ${totalAdded} new keys added with [TRANSLATE] placeholders`);
  console.log(`   Please translate these keys before deployment`);
  console.log(`   Run: npm run i18n:audit to check status`);
}

/**
 * Flatten nested object to dot notation keys
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}
