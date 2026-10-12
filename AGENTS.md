# 작업 경계

이 저장소는 두 개발자가 분업한다. 작업 프롬프트에서 지정한 역할만 수행한다.

- 1번: `app/**`, `components/**`, `public/**`만 생성·수정한다.
- 2번: `data/**`, `lib/**`, `tests/**`만 생성·수정한다.
- `types/music.ts`는 합의된 공통 계약이다. 두 역할 모두 읽기만 한다.
- `docs/**`, `README.md`, 이 파일, 루트 설정과 의존성 파일은 공동 영역이다. 담당 역할 작업에서는 수정하지 않는다.
- 다른 역할의 파일은 읽고 import할 수 있으나 수정·삭제·이동·포맷하지 않는다.
- 전체 포맷, 전체 자동 수정, `git reset`, `git clean`, 다른 변경을 되돌리는 작업을 하지 않는다.
- 필요한 공동 설정이 없으면 담당 파일 구현을 계속하고, 설정 담당자에게 필요한 변경을 보고한다. 프로젝트 전체를 새로 생성하거나 설치 명령으로 루트 파일을 변경하지 않는다.
- 경계를 넘는 변경이 필요하면 요청 내용을 보고하고 해당 변경은 수행하지 않는다.
- 역할이 지정되지 않은 공동 설정 작업은 사용자가 별도로 지시할 수 있다.

현재는 폴더와 계약만 준비된 상태다. Next.js 설치와 루트 설정은 별도 초기 설정 작업으로 한 번 수행해야 한다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
