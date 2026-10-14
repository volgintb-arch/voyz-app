// Карта мира для «Моей карты путешествий»: контуры стран Natural Earth 1:110m (общественное достояние)
// с русскими названиями и континентами. Координаты округлены до 0.1° — для постера и тапов хватает.
// Запуск: node tools/build-world.mjs → assets/data/world.json
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const gj = await (await fetch(URL)).json();

const CONT_RU = {
  Asia: 'Азия',
  Europe: 'Европа',
  Africa: 'Африка',
  'North America': 'Северная Америка',
  'South America': 'Южная Америка',
  Oceania: 'Океания',
  Antarctica: 'Антарктида',
  'Seven seas (open ocean)': 'Океания',
};

// названия, как они звучат в Voyz
const NAME_FIX = { KG: 'Кыргызстан' };

const r1 = (v) => Math.round(v * 10) / 10;
const ring = (pts) => {
  const out = [];
  for (const [lo, la] of pts) {
    const p = [r1(lo), r1(la)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : null;
};

const countries = gj.features
  .map((f) => {
    const p = f.properties;
    // у некоторых стран ISO_A2 = -99 (Франция, Норвегия, Косово) — берём ISO_A2_EH
    const iso = p.ISO_A2 !== '-99' ? p.ISO_A2 : p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ADM0_A3;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const rings = polys.map((poly) => ring(poly[0])).filter(Boolean); // внешние контуры; дыры на этом масштабе не видны
    return { iso, name: NAME_FIX[iso] ?? (p.NAME_RU || p.NAME), en: p.NAME_EN || p.NAME, cont: CONT_RU[p.CONTINENT] ?? p.CONTINENT, r: rings };
  })
  .filter((c) => c.cont !== 'Антарктида' && c.r.length)
  .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

writeFileSync(join(root, 'assets/data/world.json'), JSON.stringify({ source: 'Natural Earth 1:110m (public domain)', countries }));
console.log(`стран: ${countries.length}, континентов: ${new Set(countries.map((c) => c.cont)).size}`);
