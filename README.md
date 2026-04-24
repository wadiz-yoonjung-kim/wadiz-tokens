# wadiz-tokens

Figma Variables 기반 디자인 토큰 저장소입니다.

## 파이프라인 흐름

```
[디자이너]
Figma Variables 수정
  → Figma 플러그인으로 Color.json 추출
  → tokens/Color.json 커밋 & push

[GitHub Actions - 자동 실행]
Color.json 변경 감지
  → convert.mjs 실행  → tokens/color.dtcg.tokens.json 생성 (앱 개발자용)
  → normalize.mjs 실행 → tokens/color.normalized.tokens.json 생성 (웹 개발자용)
  → 결과물 자동 커밋

[개발자]
git pull → 결과물 바로 사용
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

`color.dtcg.tokens.json`을 Style Dictionary에 연결하여 플랫폼별 코드를 생성합니다.

```js
// iOS 예시
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

`color.normalized.tokens.json`을 Style Dictionary에 연결하여 SCSS/CSS/JS를 생성합니다.

```bash
# wadiz-frontend에서 실행
pnpm --filter @wadiz/tokens run build
```
