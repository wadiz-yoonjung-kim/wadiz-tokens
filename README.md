# wadiz-tokens

Figma Variables 기반 디자인 토큰 저장소입니다.

## 파이프라인 흐름

```
[디자이너]
Figma Variables 수정
  → Figma 플러그인으로 {Category}.json 추출
  → tokens/{Category}.json 커밋 & push

[GitHub Actions - 자동 실행]
tokens/*.json 변경 감지
  → convert.mjs   : {Category}.json → {category}.dtcg.tokens.json  (앱 개발자용)
  → normalize.mjs : {category}.dtcg.tokens.json → {category}.normalized.tokens.json  (웹 개발자용)
  → manifest.json 갱신 (생성된 파일 목록)
  → 결과물 자동 커밋

[앱 개발자 - iOS / Android]
*.dtcg.tokens.json HTTP fetch
  → Style Dictionary → 플랫폼별 코드 생성 (Swift / Compose)

[웹 개발자 - wadiz-frontend]
manifest.json 조회 → *.normalized.tokens.json 일괄 fetch (sync.mjs)
  → build.mjs → SCSS/CSS/JS 빌드
  → @wadiz/tokens/src/scss/_{category}.scss  (카테고리별 자동 생성)
```

## 파일 설명

| 파일 | 생성 주체 | 사용 대상 | 설명 |
|---|---|---|---|
| `tokens/{Category}.json` | 디자이너 | - | Figma Variables 원본 (RGB 0~1 값) |
| `tokens/{category}.dtcg.tokens.json` | GitHub Actions | 앱 개발자 (iOS, Android) | DTCG 형식, Figma 네이밍 유지, hex 값 |
| `tokens/{category}.normalized.tokens.json` | GitHub Actions | 웹 개발자 | DTCG 형식, 웹 변수명 호환 |
| `tokens/manifest.json` | GitHub Actions | 웹 개발자 (sync.mjs) | 사용 가능한 normalized 파일 목록 |

## 카테고리 추가 방법

새로운 토큰 카테고리(예: Size, Shadow)를 추가할 때의 작업 범위입니다.

**디자이너**
1. Figma 플러그인으로 `{Category}.json` 추출
2. `tokens/{Category}.json` 커밋 & push → GitHub Actions 자동 실행

**웹 개발자 (특별한 정규화 규칙이 필요한 경우)**
- `scripts/normalize.mjs`의 `NORMALIZERS` 레지스트리에 핸들러 추가

```js
// normalize.mjs
const NORMALIZERS = {
  color: normalizeColor,
  size: normalizeSize,   // 추가
};
```

> 정규화 규칙이 없으면 기본 핸들러가 자동 처리합니다.
> 기본 핸들러: 그룹명 소문자 변환, 값 그대로 유지.

## 스크립트

```bash
# tokens/*.json → *.dtcg.tokens.json (모든 카테고리)
node scripts/convert.mjs

# *.dtcg.tokens.json → *.normalized.tokens.json + manifest.json
node scripts/normalize.mjs

# 전체 실행
node scripts/convert.mjs && node scripts/normalize.mjs
```

## 앱 개발자 사용 방법

`{category}.dtcg.tokens.json`을 HTTP fetch 후 Style Dictionary로 플랫폼별 코드를 생성합니다.

```
https://raw.githubusercontent.com/wadiz-yoonjung-kim/wadiz-tokens/main/tokens/color.dtcg.tokens.json
```

```js
// Style Dictionary 설정 예시 (iOS)
{
  source: ['color.dtcg.tokens.json'],
  platforms: {
    ios: {
      transforms: ['name/camel'],
      files: [{ destination: 'ColorTokens.swift', format: 'ios-swift/class.swift' }]
    }
  }
}
```

## 웹 개발자 사용 방법

`wadiz-frontend`에서 아래 명령으로 최신 토큰을 fetch 후 빌드합니다.

```bash
pnpm --filter @wadiz/tokens run sync-build
```

`manifest.json`을 기준으로 모든 카테고리의 normalized 파일을 일괄 동기화합니다.

```
https://raw.githubusercontent.com/wadiz-yoonjung-kim/wadiz-tokens/main/tokens/manifest.json
```
