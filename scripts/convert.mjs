/**
 * Figma Variables JSON → DTCG 형식 변환 스크립트
 *
 * 실행: node scripts/convert.mjs
 * 입력: tokens/*.json (Figma Variables 원본, RGB 0~1)
 * 출력: tokens/{name}.dtcg.tokens.json (DTCG 형식, Figma 네이밍 유지, 앱 개발자용)
 *
 * 지원 변수 타입:
 * - COLOR  → hex (#rrggbb 또는 #rrggbbaa)
 * - FLOAT  → px (dimension)
 * - STRING → string (content)
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(__dirname, '../tokens');

// Figma RGB(0~1) → hex
function figmaColorToHex({ r, g, b, a }) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  if (a !== undefined && a < 0.999) return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Figma Variable 값 → DTCG 값 변환
function convertValue(variable, value) {
  switch (variable.type) {
    case 'COLOR':
      if (!value || typeof value !== 'object') return null;
      return { $value: figmaColorToHex(value), $type: 'color' };
    case 'FLOAT':
      if (typeof value !== 'number') return null;
      return { $value: `${value}px`, $type: 'dimension' };
    case 'STRING':
      return { $value: String(value), $type: 'content' };
    default:
      return null;
  }
}

// Figma export JSON 파일만 처리 (*.tokens.json, manifest.json 제외)
const sourceFiles = readdirSync(TOKENS_DIR).filter(
  (f) => f.endsWith('.json') && !f.includes('.tokens.') && f !== 'manifest.json',
);

for (const file of sourceFiles) {
  const figmaJson = JSON.parse(readFileSync(resolve(TOKENS_DIR, file), 'utf-8'));
  const defaultModeId = Object.keys(figmaJson.modes)[0];
  const result = {};

  for (const variable of figmaJson.variables) {
    const slashIndex = variable.name.indexOf('/');
    if (slashIndex === -1) continue;

    const resolvedValue =
      variable.resolvedValuesByMode?.[defaultModeId]?.resolvedValue ??
      variable.valuesByMode?.[defaultModeId];

    const converted = convertValue(variable, resolvedValue);
    if (!converted) continue;

    const group = variable.name.slice(0, slashIndex);
    const key = variable.name.slice(slashIndex + 1);

    if (!result[group]) result[group] = {};
    result[group][key] = {
      ...converted,
      ...(variable.description ? { $description: variable.description } : {}),
    };
  }

  const outputName = file.replace('.json', '').toLowerCase();
  writeFileSync(
    resolve(TOKENS_DIR, `${outputName}.dtcg.tokens.json`),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(`${outputName}.dtcg.tokens.json 생성 완료`);
}
