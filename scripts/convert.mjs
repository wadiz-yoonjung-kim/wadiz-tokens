/**
 * Figma Variables JSON → DTCG 형식 변환 스크립트
 *
 * 실행: node scripts/convert.mjs
 * 입력: tokens/Color.json (Figma Variables 원본, RGB 0~1)
 * 출력: tokens/color.dtcg.tokens.json (DTCG 형식, Figma 네이밍 유지, 앱 개발자용)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(__dirname, '../tokens');

const figmaJson = JSON.parse(readFileSync(resolve(TOKENS_DIR, 'Color.json'), 'utf-8'));

// Figma RGB(0~1) → hex 변환
function figmaColorToHex({ r, g, b, a }) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  if (a !== undefined && a < 0.999) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const result = {};
const defaultModeId = Object.keys(figmaJson.modes)[0];

for (const variable of figmaJson.variables) {
  if (variable.type !== 'COLOR') continue;

  const resolvedColor = variable.resolvedValuesByMode?.[defaultModeId]?.resolvedValue
    ?? variable.valuesByMode?.[defaultModeId];

  if (!resolvedColor || typeof resolvedColor !== 'object') continue;

  const slashIndex = variable.name.indexOf('/');
  if (slashIndex === -1) continue;

  const group = variable.name.slice(0, slashIndex);
  const key = variable.name.slice(slashIndex + 1);

  if (!result[group]) result[group] = {};

  result[group][key] = {
    $value: figmaColorToHex(resolvedColor),
    $type: 'color',
    ...(variable.description ? { $description: variable.description } : {}),
  };
}

writeFileSync(
  resolve(TOKENS_DIR, 'color.dtcg.tokens.json'),
  JSON.stringify(result, null, 2) + '\n',
);

console.log('color.dtcg.tokens.json 생성 완료');
