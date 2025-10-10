import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(process.cwd(), 'public/locales');
const SOURCE_LANG = 'en';
const REQUIRED_LANGS = ['ar', 'es', 'fr', 'de', 'ru'];

function getAllKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function findUntranslated(obj, prefix = '') {
  const untranslated = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' && value.includes('[TRANSLATE')) {
      untranslated.push(fullKey);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      untranslated.push(...findUntranslated(value, fullKey));
    }
  }
  return untranslated;
}

console.log('🔍 Running i18n audit...\n');

const enDir = path.join(LOCALES_DIR, SOURCE_LANG);
if (!fs.existsSync(enDir)) {
  console.error(`❌ Source directory not found: ${enDir}`);
  process.exit(1);
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
let errorCount = 0;
let warningCount = 0;

for (const file of enFiles) {
  const enPath = path.join(enDir, file);
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const enKeys = getAllKeys(enData);

  console.log(`📄 Checking ${file} (${enKeys.length} keys in English)`);

  for (const lang of REQUIRED_LANGS) {
    const langPath = path.join(LOCALES_DIR, lang, file);
    
    if (!fs.existsSync(langPath)) {
      console.error(`  ❌ [${lang}] File missing: ${file}`);
      errorCount++;
      continue;
    }

    let langData;
    try {
      langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
    } catch (err) {
      console.error(`  ❌ [${lang}] Parse error in ${file}: ${err.message}`);
      errorCount++;
      continue;
    }

    const langKeys = getAllKeys(langData);
    const missingKeys = enKeys.filter(k => !langKeys.includes(k));
    const untranslated = findUntranslated(langData);
    const extraKeys = langKeys.filter(k => !enKeys.includes(k));

    if (missingKeys.length > 0) {
      console.error(`  ❌ [${lang}] Missing ${missingKeys.length} keys:`);
      missingKeys.slice(0, 5).forEach(k => console.error(`     - ${k}`));
      if (missingKeys.length > 5) {
        console.error(`     ... and ${missingKeys.length - 5} more`);
      }
      errorCount++;
    }

    if (untranslated.length > 0) {
      console.error(`  ❌ [${lang}] ${untranslated.length} untranslated keys (still have [TRANSLATE] placeholders):`);
      untranslated.slice(0, 3).forEach(k => console.error(`     - ${k}`));
      if (untranslated.length > 3) {
        console.error(`     ... and ${untranslated.length - 3} more`);
      }
      errorCount++;
    }

    if (extraKeys.length > 0) {
      console.warn(`  ⚠️  [${lang}] ${extraKeys.length} extra keys (not in English):`);
      extraKeys.slice(0, 3).forEach(k => console.warn(`     - ${k}`));
      if (extraKeys.length > 3) {
        console.warn(`     ... and ${extraKeys.length - 3} more`);
      }
      warningCount++;
    }

    if (missingKeys.length === 0 && untranslated.length === 0 && extraKeys.length === 0) {
      console.log(`  ✅ [${lang}] All keys present and translated`);
    }
  }
  console.log('');
}

console.log('─'.repeat(50));
if (errorCount === 0 && warningCount === 0) {
  console.log('✅ All translations are complete and valid!');
} else {
  console.log(`Summary: ${errorCount} errors, ${warningCount} warnings`);
  if (errorCount > 0) {
    console.log('\n💡 To fix issues:');
    console.log('   1. Run: npm run i18n:sync     (adds missing keys)');
    console.log('   2. Translate [TRANSLATE] placeholders');
    console.log('   3. Run: npm run i18n:audit    (verify fixes)');
    process.exit(1);
  }
}