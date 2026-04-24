/**
 * DTCG JSON → 웹 네이밍 변환 스크립트
 *
 * 실행: node scripts/normalize.mjs
 * 입력: tokens/*.dtcg.tokens.json (DTCG 형식)
 * 출력: tokens/*.normalized.tokens.json (웹 변수명 호환)
 *       tokens/manifest.json (생성된 파일 목록)
 *
 * 카테고리별 정규화 핸들러를 NORMALIZERS에 등록합니다.
 * 등록되지 않은 카테고리는 기본 핸들러(normalizeGeneric)가 처리합니다.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(__dirname, '../tokens');

// --- 공통 유틸 ---

function setNestedValue(obj, path, value) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) current[path[i]] = {};
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
}

// --- Color 정규화 ---

// 웹 레거시 변수명 유지 매핑
// BlackAlpha/50 → $color-rgba-dark-54, BlackAlpha/70 → $color-rgba-dark-68
const BLACK_ALPHA_MAP = {
  '5': '5', '10': '10', '20': '20', '30': '30', '40': '40',
  '50': '54',
  '60': '60',
  '70': '68',
  '80': '80', '90': '90', '100': '100',
};

// WhiteAlpha/70 → $color-rgba-light-68, WhiteAlpha/80 → $color-rgba-light-84
const WHITE_ALPHA_MAP = {
  '5': '5', '10': '10', '20': '20', '30': '30', '40': '40', '50': '50', '60': '60',
  '70': '68',
  '80': '84',
  '90': '90', '100': '100',
};

// 숫자 앞 대문자 prefix 제거 (M100→100, GE100→100 등)
function stripPrefix(key) {
  return key.replace(/^[A-Z]+/, '');
}

function normalizeColor(dtcgJson) {
  const result = { color: { $type: 'color' } };

  for (const [group, tokens] of Object.entries(dtcgJson)) {
    for (const [key, token] of Object.entries(tokens)) {
      const entry = {
        $value: token.$value,
        $type: 'color',
        ...(token.$description ? { $description: token.$description } : {}),
      };

      switch (group) {
        case 'Mint':    setNestedValue(result.color, ['mint',   stripPrefix(key)], entry); break;
        case 'Gray':    setNestedValue(result.color, ['gray',   stripPrefix(key)], entry); break;
        case 'Red':     setNestedValue(result.color, ['red',    stripPrefix(key)], entry); break;
        case 'Blue':    setNestedValue(result.color, ['blue',   stripPrefix(key)], entry); break;
        case 'Yellow':  setNestedValue(result.color, ['yellow', stripPrefix(key)], entry); break;
        case 'Purple':  setNestedValue(result.color, ['purple', stripPrefix(key)], entry); break;
        case 'Green':   setNestedValue(result.color, ['green',  stripPrefix(key)], entry); break;

        case 'BlackAlpha':
          setNestedValue(result.color, ['rgba', 'dark', key], entry);
          if (BLACK_ALPHA_MAP[key] && BLACK_ALPHA_MAP[key] !== key) {
            setNestedValue(result.color, ['rgba', 'dark', BLACK_ALPHA_MAP[key]], entry);
          }
          break;

        case 'WhiteAlpha':
          setNestedValue(result.color, ['rgba', 'light', key], entry);
          if (WHITE_ALPHA_MAP[key] && WHITE_ALPHA_MAP[key] !== key) {
            setNestedValue(result.color, ['rgba', 'light', WHITE_ALPHA_MAP[key]], entry);
          }
          break;

        case 'Etc':
          setNestedValue(result.color, ['etc', key], entry);
          break;

        case 'GradientWAi':
          setNestedValue(result.color, ['gradient', 'wai', key], entry);
          break;

        case 'GradientBlue':
          setNestedValue(result.color, ['gradient', 'blue', key], entry);
          break;
      }
    }
  }

  return result;
}

// --- 기본 정규화 ---
// 신규 카테고리(size, shadow 등)에 적용됩니다.
// 그룹명을 소문자로 변환하고 값은 그대로 유지합니다.
// 그룹명이 카테고리명과 동일한 경우 flatten합니다.
// 예: Size.json → { "Size": { "4": { "$value": "4px" } } }
//   → { "size": { "4": { "$value": "4px" } } }

function normalizeGeneric(dtcgJson, categoryName) {
  const result = {};

  for (const [group, tokens] of Object.entries(dtcgJson)) {
    const groupKey = group.toLowerCase();
    // 그룹명이 카테고리명과 같으면 flatten, 다르면 중첩
    const basePath = groupKey === categoryName ? [categoryName] : [categoryName, groupKey];

    for (const [key, token] of Object.entries(tokens)) {
      setNestedValue(result, [...basePath, key], {
        $value: token.$value,
        $type: token.$type,
        ...(token.$description ? { $description: token.$description } : {}),
      });
    }
  }

  return result;
}

// --- 카테고리별 정규화 핸들러 레지스트리 ---
// 신규 카테고리 추가 시 여기에 등록합니다.
// 예: size: (dtcgJson) => normalizeSize(dtcgJson),

const NORMALIZERS = {
  color: normalizeColor,
};

// --- 실행 ---

const dtcgFiles = readdirSync(TOKENS_DIR)
  .filter((f) => f.endsWith('.dtcg.tokens.json'))
  .sort();

const generatedFiles = [];

for (const file of dtcgFiles) {
  const categoryName = file.replace('.dtcg.tokens.json', '');
  const dtcgJson = JSON.parse(readFileSync(resolve(TOKENS_DIR, file), 'utf-8'));

  const normalize = NORMALIZERS[categoryName] ?? ((json) => normalizeGeneric(json, categoryName));
  const result = normalize(dtcgJson);

  const outputName = `${categoryName}.normalized.tokens.json`;
  writeFileSync(resolve(TOKENS_DIR, outputName), JSON.stringify(result, null, 2) + '\n');
  console.log(`${outputName} 생성 완료`);
  generatedFiles.push(outputName);
}

// manifest.json: 생성된 normalized 파일 목록 (sync.mjs에서 참조)
writeFileSync(
  resolve(TOKENS_DIR, 'manifest.json'),
  JSON.stringify({ normalizedFiles: generatedFiles }, null, 2) + '\n',
);
console.log('manifest.json 생성 완료');
