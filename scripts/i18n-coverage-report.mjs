import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(process.cwd(), 'public/locales');
const SOURCE_LANG = 'en';
const TARGET_LANGS = ['ar', 'es', 'fr', 'de', 'ru'];
const REPORT_DIR = path.resolve(process.cwd(), 'reports');

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

console.log('📊 Generating i18n coverage report...\n');

const enDir = path.join(LOCALES_DIR, SOURCE_LANG);
if (!fs.existsSync(enDir)) {
  console.error(`❌ Source directory not found: ${enDir}`);
  process.exit(1);
}

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
const coverage = {};
const overallStats = {};
let totalEnKeys = 0;

for (const file of enFiles) {
  const namespace = file.replace('.json', '');
  const enPath = path.join(enDir, file);
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const enKeys = getAllKeys(enData);
  totalEnKeys += enKeys.length;

  coverage[namespace] = {
    total: enKeys.length,
    languages: {}
  };

  for (const lang of TARGET_LANGS) {
    const langPath = path.join(LOCALES_DIR, lang, file);
    
    if (!overallStats[lang]) {
      overallStats[lang] = { total: 0, translated: 0, untranslated: 0, missing: 0 };
    }

    if (!fs.existsSync(langPath)) {
      coverage[namespace].languages[lang] = {
        exists: false,
        translated: 0,
        untranslated: 0,
        missing: enKeys.length,
        percentage: 0
      };
      overallStats[lang].total += enKeys.length;
      overallStats[lang].missing += enKeys.length;
      continue;
    }

    const langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
    const langKeys = getAllKeys(langData);
    const untranslated = findUntranslated(langData);
    const missingKeys = enKeys.filter(k => !langKeys.includes(k));
    const translated = enKeys.length - untranslated.length - missingKeys.length;
    const percentage = Math.round((translated / enKeys.length) * 100);

    coverage[namespace].languages[lang] = {
      exists: true,
      translated,
      untranslated: untranslated.length,
      missing: missingKeys.length,
      percentage
    };

    overallStats[lang].total += enKeys.length;
    overallStats[lang].translated += translated;
    overallStats[lang].untranslated += untranslated.length;
    overallStats[lang].missing += missingKeys.length;
  }
}

console.log('Coverage by language:');
for (const [lang, stats] of Object.entries(overallStats)) {
  const percentage = Math.round((stats.translated / stats.total) * 100);
  console.log(`  ${lang}: ${percentage}% (${stats.translated}/${stats.total} translated)`);
}

function generateHTML(coverage, overallStats, totalEnKeys) {
  const languageFlags = { ar: '🇸🇦', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', ru: '🇷🇺' };
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>i18n Coverage Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { margin-bottom: 0.5rem; color: #333; }
    .timestamp { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    .overall { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { padding: 1.5rem; border-radius: 8px; border: 2px solid #e0e0e0; }
    .stat-card h3 { font-size: 0.9rem; color: #666; margin-bottom: 0.5rem; }
    .stat-card .percentage { font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem; }
    .stat-card .details { font-size: 0.85rem; color: #888; }
    .good { border-color: #4caf50; background: #f1f8f4; }
    .good .percentage { color: #4caf50; }
    .warn { border-color: #ff9800; background: #fff8f0; }
    .warn .percentage { color: #ff9800; }
    .bad { border-color: #f44336; background: #fef5f5; }
    .bad .percentage { color: #f44336; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f5f5f5; font-weight: 600; color: #333; }
    .progress-bar { height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-top: 0.25rem; }
    .progress-fill { height: 100%; background: #4caf50; transition: width 0.3s; }
    .status-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .status-complete { background: #4caf50; color: white; }
    .status-partial { background: #ff9800; color: white; }
    .status-missing { background: #f44336; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌍 i18n Coverage Report</h1>
    <div class="timestamp">Generated: ${new Date().toISOString()}</div>
    
    <div class="overall">`;

  for (const [lang, stats] of Object.entries(overallStats)) {
    const percentage = Math.round((stats.translated / stats.total) * 100);
    const status = percentage >= 90 ? 'good' : percentage >= 70 ? 'warn' : 'bad';
    html += `
      <div class="stat-card ${status}">
        <h3>${languageFlags[lang]} ${lang.toUpperCase()}</h3>
        <div class="percentage">${percentage}%</div>
        <div class="details">${stats.translated}/${stats.total} keys translated</div>
        ${stats.untranslated > 0 ? `<div class="details">⚠️ ${stats.untranslated} need translation</div>` : ''}
        ${stats.missing > 0 ? `<div class="details">❌ ${stats.missing} missing</div>` : ''}
      </div>`;
  }

  html += `
    </div>
    
    <h2>Coverage by Namespace</h2>
    <table>
      <thead>
        <tr>
          <th>Namespace</th>
          <th>Total Keys</th>
          ${TARGET_LANGS.map(l => `<th>${languageFlags[l]} ${l.toUpperCase()}</th>`).join('')}
        </tr>
      </thead>
      <tbody>`;

  for (const [namespace, data] of Object.entries(coverage)) {
    html += `<tr><td><strong>${namespace}</strong></td><td>${data.total}</td>`;
    
    for (const lang of TARGET_LANGS) {
      const langData = data.languages[lang];
      if (!langData.exists) {
        html += `<td><span class="status-badge status-missing">MISSING</span></td>`;
      } else {
        const pct = langData.percentage;
        const status = pct === 100 ? 'complete' : pct >= 70 ? 'partial' : 'missing';
        html += `<td>
          <div>${pct}%</div>
          <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
        </td>`;
      }
    }
    html += `</tr>`;
  }

  html += `
      </tbody>
    </table>
  </div>
</body>
</html>`;

  return html;
}

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const htmlReport = generateHTML(coverage, overallStats, totalEnKeys);
const reportPath = path.join(REPORT_DIR, 'i18n-coverage.html');
fs.writeFileSync(reportPath, htmlReport);

console.log(`\n✅ Report generated: ${reportPath}`);
console.log('   Open this file in a browser to view the full report');
