# wadiz-tokens

Figma Variables 기반 디자인 토큰 저장소입니다.

## 파이프라인 흐름
아래는 Color 토큰에 대한 예시입니다.

```
[디자이너]
Figma Variables 수정
  → Figma 플러그인으로 Color.json 추출
  → tokens/Color.json 커밋 & push

[GitHub Actions - 자동 실행]
Color.json 변경 감지
  → convert.mjs   : Color.json → color.dtcg.tokens.json (앱 개발자용)
  → normalize.mjs : color.dtcg.tokens.json → color.normalized.tokens.json (웹 개발자용)
  → 결과물 자동 커밋

[앱 개발자 - iOS / Android]
color.dtcg.tokens.json HTTP fetch
  → Style Dictionary → 플랫폼별 코드 생성 (Swift / Compose)

[웹 개발자 - wadiz-frontend]
color.normalized.tokens.json HTTP fetch (sync.mjs)
  → build.mjs → SCSS/CSS/JS 빌드
  → @wadiz/tokens/build/scss/_color.scss   ← Source of Truth
  → @wadiz/tokens/src/scss/_color.scss     (src/로 copy)
  → waffle/src/styles/common/_color.scss   (@forward 참조)
```

## 파일 설명

| 파일 | 생성 주체 | 사용 대상 | 설명 |
|---|---|---|---|
| `tokens/Color.json` | 디자이너 | - | Figma Variables 원본 (RGB 0~1 값) |
| `tokens/color.dtcg.tokens.json` | GitHub Actions | 앱 개발자 (iOS, Android) | DTCG 형식, Figma 네이밍 유지, hex 값 |
| `tokens/color.normalized.tokens.json` | GitHub Actions | 웹 개발자 | DTCG 형식, 웹 변수명 호환, 레거시 변수 포함 |

## 스크립트

```bash
# Color.json → color.dtcg.tokens.json
node scripts/convert.mjs

# color.dtcg.tokens.json → color.normalized.tokens.json
node scripts/normalize.mjs

# 전체 실행
npm run build
```

## 앱 개발자 사용 방법

`color.dtcg.tokens.json`을 HTTP fetch 후 Style Dictionary로 플랫폼별 코드를 생성합니다.

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

```
https://raw.githubusercontent.com/wadiz-yoonjung-kim/wadiz-tokens/main/tokens/color.normalized.tokens.json
```
