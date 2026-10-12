# 음악 플레이리스트 자동 생성 앱

Next.js App Router + TypeScript + Tailwind CSS로 구현할 프로젝트의 분업용 골격입니다. 아직 실행 가능한 앱이나 의존성 설정은 없습니다.

## 구조와 담당

```text
app/                 1번: layout.tsx, page.tsx, globals.css
components/          1번: 생성 폼, 결과 편집, 검색, 저장 목록, 변경 내역
  ui/                1번: 공용 UI
public/              1번: 정적 자산
types/music.ts       공통 계약: 두 역할 모두 읽기 전용
data/                2번: songs.ts (100곡)
lib/                 2번: generator.ts, storage.ts
tests/               2번: 데이터·추천·저장 검증
docs/                작업 프롬프트와 연동 계약
```

## 시작 순서

1. 별도 초기 설정 작업에서 Next.js, React, TypeScript, Tailwind CSS 및 실행·빌드 설정을 준비합니다. 기존 파일을 보존하세요.
2. 각 개발자에게 `docs/developer-1-prompt.md`, `docs/developer-2-prompt.md` 내용을 전달합니다.
3. 두 개발자는 담당 경로만 수정하고 `docs/contracts.md`의 인터페이스를 따릅니다.
4. 모듈 완성 후 1번이 자기 담당 화면에서 연동합니다.

저장은 같은 브라우저의 localStorage를 사용합니다. 실제 음원 재생, 로그인, 서버 DB는 이번 범위에 포함하지 않습니다.
