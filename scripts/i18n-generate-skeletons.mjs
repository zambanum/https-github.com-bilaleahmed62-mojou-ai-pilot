import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(process.cwd(), 'public/locales');
const SOURCE_LANG = 'en';
const TARGET_LANGS = ['ar', 'es', 'fr', 'de', 'ru'];

function generateSkeleton(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = generateSkeleton(value, ``.`);
    } else {
      result[key] = `[TRANSLATE: ```] ```;
    }
  }
  return result;
}

console.log('🔨 Generating translation skeleton files...\n');

const enDir = path.join(LOCALES_DIR, SOURCE_LANG);
if (!fs.existsSync(enDir)) {
  console.error(`❌ English source directory not found: ``);
  process.exit(1);
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
let created = 0;
let skipped = 0;

for (const targetLang of TARGET_LANGS) {
  const targetDir = path.join(LOCALES_DIR, targetLang);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`📁 Created directory: `/`);
  }

  for (const file of enFiles) {
    const enPath = path.join(enDir, file);
    const targetPath = path.join(targetDir, file);
    
    if (fs.existsSync(targetPath)) {
      skipped++;
      continue;
    }

    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const skeleton = generateSkeleton(enData);
    
    fs.writeFileSync(targetPath, JSON.stringify(skeleton, null, 2) + '\n');
    console.log(`✨ Created `/```);
    created++;
  }
}

console.log(`\n✅ Skeleton generation complete!`);
console.log(`   Created: `` files`);
console.log(`   Skipped: `` files (already exist)`);

if (created > 0) {
  console.log(`\n⚠️  Next steps:`);
  console.log(`   1. Review generated files with [TRANSLATE] placeholders`);
  console.log(`   2. Replace placeholders with actual translations`);
  console.log(`   3. Run: npm run i18n:audit`);
}
