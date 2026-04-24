/**
 * Figma Variables JSON → DTCG 형식 변환 스크립트
 *
 * 실행: node scripts/normalize.mjs
 * 입력: tokens/Color.json (Figma Variables 플러그인 추출 원본)
 * 출력: tokens/color.normalized.tokens.json (플랫폼별 빌드 입력용)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = resolve(__dirname, '../tokens');

const figmaJson = JSON.parse(readFileSync(resolve(TOKENS_DIR, 'Color.json'), 'utf-8'));

// 웹 레거시 변수명 유지를 위한 BlackAlpha 번호 매핑
// (BlackAlpha/50 → $color-rgba-dark-54, BlackAlpha/70 → $color-rgba-dark-68)
const BLACK_ALPHA_MAP = {
  '5': '5', '10': '10', '20': '20', '30': '30', '40': '40',
  '50': '54',
  '60': '60',
  '70': '68',
  '80': '80', '90': '90', '100': '100',
};

// 웹 레거시 변수명 유지를 위한 WhiteAlpha 번호 매핑
// (WhiteAlpha/70 → $color-rgba-light-68, WhiteAlpha/80 → $color-rgba-light-84)
const WHITE_ALPHA_MAP = {
  '5': '5', '10': '10', '20': '20', '30': '30', '40': '40', '50': '50', '60': '60',
  '70': '68',
  '80': '84',
  '90': '90', '100': '100',
};

const ETC_KEY_MAP = {
  'wadizStore': 'wadiz-store',
  'maisonDeWa': 'maison-de-wa',
  'kakao--container': 'kakao',
  'naver': 'naver',
  'facebook': 'facebook',
};

const GRADIENT_DIR_MAP = {
  'LeftTop': 'left-top',
  'RightBottom': 'right-bottom',
};

// Figma RGB(0~1) → hex 변환
function figmaColorToHex({ r, g, b, a }) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  if (a !== undefined && a < 0.999) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 숫자 앞 대문자 prefix 제거 (M100→100, GE100→100 등)
function stripPrefix(key) {
  return key.replace(/^[A-Z]+/, '');
}

// 중첩 객체에 값 삽입
function setNestedValue(obj, path, value) {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]]) current[path[i]] = {};
    current = current[path[i]];
  }
  current[path[path.length - 1]] = value;
}

const result = { color: { $type: 'color' } };

// 첫 번째 모드 ID 추출
const defaultModeId = Object.keys(figmaJson.modes)[0];

for (const variable of figmaJson.variables) {
  if (variable.type !== 'COLOR') continue;

  const resolvedColor = variable.resolvedValuesByMode?.[defaultModeId]?.resolvedValue
    ?? variable.valuesByMode?.[defaultModeId];

  if (!resolvedColor || typeof resolvedColor !== 'object') continue;

  const hexValue = figmaColorToHex(resolvedColor);
  const entry = {
    $value: hexValue,
    $type: 'color',
    ...(variable.description ? { $description: variable.description } : {}),
  };

  // "Mint/M600" → group: "Mint", key: "M600"
  const slashIndex = variable.name.indexOf('/');
  if (slashIndex === -1) continue;

  const group = variable.name.slice(0, slashIndex);
  const key = variable.name.slice(slashIndex + 1);

  let path;

  switch (group) {
    case 'Mint':    path = ['mint',   stripPrefix(key)]; break;
    case 'Gray':    path = ['gray',   stripPrefix(key)]; break;
    case 'Red':     path = ['red',    stripPrefix(key)]; break;
    case 'Blue':    path = ['blue',   stripPrefix(key)]; break;
    case 'Yellow':  path = ['yellow', stripPrefix(key)]; break;
    case 'Purple':  path = ['purple', stripPrefix(key)]; break;
    case 'Green':   path = ['green',  stripPrefix(key)]; break;

    case 'BlackAlpha':
      // Figma 자연 이름으로 추가 ($color-rgba-dark-50 등)
      setNestedValue(result.color, ['rgba', 'dark', key], entry);
      // 레거시 변수명도 추가 ($color-rgba-dark-54 등)
      if (BLACK_ALPHA_MAP[key] && BLACK_ALPHA_MAP[key] !== key) {
        setNestedValue(result.color, ['rgba', 'dark', BLACK_ALPHA_MAP[key]], entry);
      }
      continue;

    case 'WhiteAlpha':
      // Figma 자연 이름으로 추가 ($color-rgba-light-80 등)
      setNestedValue(result.color, ['rgba', 'light', key], entry);
      // 레거시 변수명도 추가 ($color-rgba-light-84 등)
      if (WHITE_ALPHA_MAP[key] && WHITE_ALPHA_MAP[key] !== key) {
        setNestedValue(result.color, ['rgba', 'light', WHITE_ALPHA_MAP[key]], entry);
      }
      continue;

    case 'Etc':
      path = ['etc', ETC_KEY_MAP[key] ?? key];
      break;
    case 'GradientWAi':
      path = ['gradient', 'wai', GRADIENT_DIR_MAP[key] ?? key];
      break;
    case 'GradientBlue':
      path = ['gradient', 'blue', GRADIENT_DIR_MAP[key] ?? key];
      break;
    default:
      continue;
  }

  setNestedValue(result.color, path, entry);
}

writeFileSync(
  resolve(TOKENS_DIR, 'color.normalized.tokens.json'),
  JSON.stringify(result, null, 2) + '\n',
);

console.log('color.normalized.tokens.json 생성 완료');
