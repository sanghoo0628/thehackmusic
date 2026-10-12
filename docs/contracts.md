# 연동 계약 (작업 중 읽기 전용)

공통 타입은 `types/music.ts`에 정의되어 있습니다. 상대 경로 import를 사용해 초기 경로 별칭 설정에 의존하지 않습니다.

## 2번이 제공할 export

```ts
// data/songs.ts
export const songs: Song[];

// lib/generator.ts
export function generatePlaylist(options: GenerateOptions): GenerationResult;

// lib/storage.ts
export function loadPlaylists(): Playlist[];
export function savePlaylist(playlist: Playlist): void;
```

- 생성 함수는 동기 함수이며 잘못된 입력에 오류를 던집니다.
- count는 5~30 정수, 비율은 0~100 유한한 숫자입니다.
- year 값은 숫자, 나머지 조건 값은 비어 있지 않은 문자열입니다.
- 새로운 곡은 `isKnown=false`입니다. 비율은 0~100 단위입니다.
- 새로운 곡 목표 수는 `Math.round(count * newSongRatio / 100)`입니다.
- 모든 결과는 선택 조건을 유지합니다. 후보 부족 시 다른 그룹으로 보충하고, 비율 불일치나 전체 후보 부족은 한국어 warnings로 알립니다.
- 빈 결과의 actualNewSongRatio는 0입니다.
- 저장 키는 `music-playlists:v1`, 값은 Playlist[]의 JSON입니다.
- 없는 저장 값은 빈 배열, 손상·접근 불가·용량 초과는 오류입니다. 손상 데이터는 자동 덮어쓰지 않습니다.
- 저장은 ID 기준 갱신이며 다른 플레이리스트를 보존합니다.
- 1번이 ID와 ISO 시각을 만들고 사용자 추가·제거 내역을 기록합니다. 생성 직후 changes는 빈 배열입니다.
- 1번은 저장 성공 후에만 저장 완료를 표시하고 실패 시 편집 상태와 오류 안내를 유지합니다.
- 기존 저장 데이터를 불러오는 데 실패하면 자동 저장을 중단하여 덮어쓰기를 방지합니다.
