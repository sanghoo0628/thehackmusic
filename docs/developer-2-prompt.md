너는 이 저장소의 2번 개발자다. Next.js + TypeScript 음악 플레이리스트 앱의 샘플 데이터·추천 로직·저장 기능을 실제 구현해라.

먼저 AGENTS.md, docs/contracts.md, types/music.ts와 기존 코드를 읽고 아래 경계를 지켜라.

[파일 소유권 — 반드시 준수]
- 생성·수정·삭제 가능: data/**, lib/**, tests/**만.
- 읽기·import만 가능: app/**, components/**, public/**, types/** 및 모든 공동 파일.
- 수정 금지: AGENTS.md, README.md, docs/**, types/music.ts, package.json, lock 파일, tsconfig, Next.js·Tailwind·PostCSS·테스트 설정 등 루트 파일.
- 다른 개발자의 변경을 되돌리거나 이동·포맷하지 마라. 전체 자동 수정과 프로젝트 재생성을 하지 마라.
- 의존성 추가나 공통 계약 변경이 필요하면 정확한 요구 사항을 보고하되 직접 변경하지 마라.
- 초기 설정이 없어도 담당 로직 파일은 구현하고 실행 검증이 불가능한 이유를 보고해라.

[샘플 데이터]
- data/songs.ts에서 songs: Song[]를 named export한다.
- 정확히 100곡의 가상 음악을 작성하고 주석에 샘플임을 명시한다. ID는 고유하고 안정적이어야 한다.
- 다양한 가수·장르·연도·분위기를 포함하고 각 조건에 isKnown=true와 false인 곡이 함께 있도록 구성한다.
- 새로운 추천 곡은 isKnown=false다. 실제 음원이나 외부 API를 연동하지 않는다.

[추천 로직]
- lib/generator.ts에 generatePlaylist(options: GenerateOptions): GenerationResult를 named export한다.
- 공통 타입은 types/music.ts에서 상대 경로로 import한다.
- mode와 value로 정확히 필터링한다. year는 숫자, 다른 value는 비어 있지 않은 문자열이다.
- count는 5~30 정수, newSongRatio는 0~100 유한한 숫자다. 잘못된 입력은 이해할 수 있는 오류를 던진다.
- 새로운 곡 목표 수는 Math.round(count * newSongRatio / 100), 나머지는 알고 있는 곡에서 선택한다.
- 후보 그룹을 무작위로 섞어 중복 없이 추출하고 최종 순서도 섞는다. 원본 데이터는 변경하지 않는다.
- 한 그룹이 부족하면 같은 조건의 다른 그룹으로 채운다. 전체 후보가 부족하면 가능한 곡만 반환한다. 조건 밖의 곡은 추가하지 않는다.
- requestedCount는 요청한 수, actualNewSongRatio는 최종 목록의 새 곡 비율(0~100)이다. 빈 결과의 비율은 0이다.
- 그룹 부족으로 목표 개수를 못 맞추거나 전체 곡 수가 부족할 때 한국어 warnings를 제공한다. 정상적인 반올림만으로 경고하지 않는다.

[저장 로직]
- lib/storage.ts에서 loadPlaylists(): Playlist[], savePlaylist(playlist: Playlist): void를 named export한다.
- localStorage의 music-playlists:v1 키에 Playlist[] JSON을 저장한다.
- 같은 ID는 갱신, 새 ID는 추가하고 다른 플레이리스트를 보존한다. songIds와 changes를 모두 보존한다.
- 저장 값이 없으면 빈 배열. JSON 손상·구조 오류·접근 불가·용량 초과는 명시적인 오류를 전달한다.
- 저장 시 기존 데이터를 먼저 검증하고 손상된 데이터는 자동 덮어쓰지 않는다. 입력 Playlist도 검증한다.
- ID 중복, 곡 ID, 옵션, ISO 시각, changes의 필수 필드와 action을 검증한다. 제거된 곡의 변경 이력은 최종 songIds에 없어도 유효하다.
- 모듈 최상위에서 window나 localStorage에 접근하지 않는다. 서버에서 호출되면 명확한 오류를 던진다.
- 변경 내역 생성은 1번 역할이다. 저장 모듈은 전달받은 데이터를 검증하고 보존한다.

[검증]
기존 테스트 도구가 있으면 사용하고, 없으면 tests/** 안에 의존성 없는 검증 파일을 작성한다. 테스트 도구 설치나 공동 설정 수정은 하지 않는다.
100곡과 고유 ID, 네 조건 필터, 후보가 충분한 0·50·100% 비율, 후보 부족과 경고, 중복 방지, 원본 보존, 잘못된 입력을 검증한다.
저장·불러오기, ID 갱신, 다른 목록 보존, 변경 내역 보존, 손상 데이터 덮어쓰기 방지, 저장 실패도 검증한다. 저장 테스트는 실제 사용자 저장소 대신 메모리 mock을 사용한다.

기존 실행·타입 검사·빌드 명령이 있으면 수행한다. 마지막에 담당 변경 파일, 검증 결과, UI용 import·호출 예시와 공동 설정 요청을 보고해라. 실행하지 못한 검증은 구분해서 보고해라. 계획만 설명하지 말고 허용된 파일에 실제 구현해라.
