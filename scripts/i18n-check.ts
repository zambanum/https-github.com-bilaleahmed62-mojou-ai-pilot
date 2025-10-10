import fs from 'node:fs';
import path from 'node:path';

const LOCALES_DIR = path.resolve(process.cwd(), 'public/locales');
const LANGS = ['en','ar','es','fr','de','ru'];
const NAMESPACES = ['nav','actions','kpis','tooltips','errors','hero','links','sales','finance','crm','inventory','support','marketing'];

function readJSON(p: string) { return JSON.parse(fs.readFileSync(p,'utf8')); }

function keysOf(obj: any, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'object' && v !== null ? keysOf(v, key) : [key];
  });
}

let failed = false;

for (const ns of NAMESPACES) {
  const refPath = path.join(LOCALES_DIR, 'en', `${ns}.json`);
  if (!fs.existsSync(refPath)) {
    console.error(`[i18n] MISSING REFERENCE FILE: en/${ns}.json`);
    failed = true;
    continue;
  }
  
  const ref = readJSON(refPath);
  const refKeys = keysOf(ref);

  for (const lang of LANGS) {
    const p = path.join(LOCALES_DIR, lang, `${ns}.json`);
    if (!fs.existsSync(p)) {
      console.error(`[i18n] MISSING FILE: ${lang}/${ns}.json`);
      failed = true; 
      continue;
    }
    const data = readJSON(p);
    const keys = keysOf(data);
    for (const k of refKeys) {
      if (!keys.includes(k)) {
        console.error(`[i18n] MISSING KEY: ${lang}/${ns}.json -> ${k}`);
        failed = true;
      }
    }
  }
}

if (failed) {
  console.error('[i18n] ❌ Translation validation failed. Fix missing files/keys before deployment.');
  process.exit(1);
}

console.log('[i18n] ✅ All locale files complete');
