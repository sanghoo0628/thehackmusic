import type { GenerateOptions, GenerationResult, Song } from "../types/music";
import { songs } from "../data/songs";
import { generatePlaylist, generatePlaylistFromSongs } from "../lib/generator";
import { assert, assertDeepEqual, assertEqual, assertThrows, test } from "./harness";

/** 재현 가능한 난수 (mulberry32) */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSongs(spec: { genre: string; known: number; unknown: number }[]): Song[] {
  const result: Song[] = [];
  for (const { genre, known, unknown } of spec) {
    for (let i = 0; i < known + unknown; i++) {
      result.push({
        id: `${genre}-${i}`,
        title: `${genre} 곡 ${i}`,
        artist: "테스트 가수",
        genre,
        year: 2020,
        mood: "잔잔한",
        isKnown: i < known,
      });
    }
  }
  return result;
}

function newCount(result: GenerationResult): number {
  return result.songs.filter((song) => !song.isKnown).length;
}

function assertNoDuplicates(result: GenerationResult): void {
  const ids = result.songs.map((song) => song.id);
  assertEqual(new Set(ids).size, ids.length, "결과에 중복 곡이 없어야 함");
}

test("가수·장르·연도·분위기 조건으로 정확히 필터링한다", () => {
  const cases: GenerateOptions[] = [
    { mode: "artist", value: "달빛소년", newSongRatio: 50, count: 10 },
    { mode: "genre", value: "발라드", newSongRatio: 50, count: 10 },
    { mode: "year", value: 2020, newSongRatio: 50, count: 10 },
    { mode: "mood", value: "잔잔한", newSongRatio: 50, count: 10 },
  ];
  for (const options of cases) {
    const result = generatePlaylist(options);
    assertEqual(result.songs.length, 10, `${options.mode} 결과 수`);
    assert(
      result.songs.every((song) => song[options.mode] === options.value),
      `${options.mode}=${options.value} 조건 밖의 곡이 포함됨`,
    );
    assertNoDuplicates(result);
  }
});

test("연도 조건은 숫자로 비교하고 문자열 연도는 거부한다", () => {
  const result = generatePlaylist({ mode: "year", value: 2015, newSongRatio: 0, count: 5 });
  assert(result.songs.every((song) => song.year === 2015), "연도 필터");
  assertThrows(
    () => generatePlaylist({ mode: "year", value: "2015", newSongRatio: 0, count: 5 }),
    "문자열 연도는 오류여야 함",
  );
});

test("후보가 충분하면 0·50·100% 비율을 정확히 맞추고 경고가 없다", () => {
  // 분위기별 알고 있는 곡 10곡, 새로운 곡 10곡
  for (const [ratio, expectedNew] of [[0, 0], [50, 5], [100, 10]] as const) {
    for (let seed = 1; seed <= 5; seed++) {
      const result = generatePlaylistFromSongs(
        songs,
        { mode: "mood", value: "신나는", newSongRatio: ratio, count: 10 },
        seededRandom(seed),
      );
      assertEqual(result.songs.length, 10, `${ratio}% 결과 수`);
      assertEqual(newCount(result), expectedNew, `${ratio}% 새로운 곡 수`);
      assertEqual(result.actualNewSongRatio, ratio, `${ratio}% 실제 비율`);
      assertEqual(result.requestedCount, 10, "requestedCount");
      assertDeepEqual(result.warnings, [], `${ratio}% 경고 없음`);
      assertNoDuplicates(result);
    }
  }
});

test("목표 새 곡 수는 Math.round(count * ratio / 100)이며 반올림만으로 경고하지 않는다", () => {
  const source = makeSongs([{ genre: "록", known: 30, unknown: 30 }]);
  const result = generatePlaylistFromSongs(source, { mode: "genre", value: "록", newSongRatio: 33, count: 7 });
  assertEqual(newCount(result), Math.round((7 * 33) / 100), "새로운 곡 수");
  assertEqual(result.actualNewSongRatio, 28.6, "실제 비율(2/7)");
  assertDeepEqual(result.warnings, [], "경고 없음");
});

test("새로운 곡이 부족하면 알고 있는 곡으로 채우고 한국어 경고를 준다", () => {
  const source = makeSongs([{ genre: "록", known: 20, unknown: 3 }]);
  const result = generatePlaylistFromSongs(source, { mode: "genre", value: "록", newSongRatio: 100, count: 10 });
  assertEqual(result.songs.length, 10, "결과 수는 유지");
  assertEqual(newCount(result), 3, "가능한 새로운 곡 모두 사용");
  assertEqual(result.actualNewSongRatio, 30, "실제 비율");
  assertEqual(result.warnings.length, 1, "경고 1개");
  assert(/새로운 곡/.test(result.warnings[0] ?? "") && /7곡/.test(result.warnings[0] ?? ""), "새로운 곡 부족 경고");
  assertNoDuplicates(result);
});

test("알고 있는 곡이 부족하면 새로운 곡으로 채우고 경고한다", () => {
  const source = makeSongs([{ genre: "록", known: 2, unknown: 20 }]);
  const result = generatePlaylistFromSongs(source, { mode: "genre", value: "록", newSongRatio: 0, count: 10 });
  assertEqual(result.songs.length, 10, "결과 수는 유지");
  assertEqual(newCount(result), 8, "부족분 8곡은 새로운 곡");
  assertEqual(result.warnings.length, 1, "경고 1개");
  assert(/알고 있는 곡/.test(result.warnings[0] ?? ""), "알고 있는 곡 부족 경고");
});

test("전체 후보가 부족하면 가능한 곡만 반환하고 경고하며 조건 밖의 곡을 추가하지 않는다", () => {
  const source = makeSongs([
    { genre: "록", known: 2, unknown: 4 },
    { genre: "댄스", known: 30, unknown: 30 },
  ]);
  const result = generatePlaylistFromSongs(source, { mode: "genre", value: "록", newSongRatio: 50, count: 10 });
  assertEqual(result.songs.length, 6, "가능한 곡 수");
  assertEqual(result.requestedCount, 10, "requestedCount는 요청 수");
  assert(result.songs.every((song) => song.genre === "록"), "조건 밖 곡 없음");
  assert(result.warnings.some((warning) => /10곡 중 6곡/.test(warning)), "전체 부족 경고");
  assertEqual(result.actualNewSongRatio, 66.7, "실제 비율(4/6)");
  assertNoDuplicates(result);

  // 실제 데이터: 가수당 10곡이므로 30곡 요청 시 부족
  const real = generatePlaylist({ mode: "artist", value: "Echo Pines", newSongRatio: 50, count: 30 });
  assertEqual(real.songs.length, 10, "실제 데이터 가수 곡 수");
  assert(real.warnings.length > 0, "실제 데이터 부족 경고");
});

test("조건에 맞는 곡이 없으면 빈 결과, 비율 0, 경고를 반환한다", () => {
  const result = generatePlaylist({ mode: "artist", value: "존재하지 않는 가수", newSongRatio: 50, count: 10 });
  assertDeepEqual(result.songs, [], "빈 결과");
  assertEqual(result.actualNewSongRatio, 0, "빈 결과 비율");
  assertEqual(result.requestedCount, 10, "requestedCount");
  assertEqual(result.warnings.length, 1, "경고 1개");
});

test("여러 번 생성해도 중복이 없고 원본 데이터를 변경하지 않는다", () => {
  const before = JSON.stringify(songs);
  const random = seededRandom(42);
  for (let i = 0; i < 50; i++) {
    const result = generatePlaylistFromSongs(songs, { mode: "mood", value: "슬픈", newSongRatio: 50, count: 20 }, random);
    assertNoDuplicates(result);
    // 결과 곡을 수정해도 원본에 영향이 없어야 한다.
    const first = result.songs[0];
    if (first) first.title = "변경됨";
  }
  assertEqual(JSON.stringify(songs), before, "원본 songs 보존");
});

test("결과 순서를 섞는다 (새로운 곡과 알고 있는 곡이 그룹별로 몰리지 않음)", () => {
  const orders = new Set<string>();
  for (let seed = 1; seed <= 10; seed++) {
    const result = generatePlaylistFromSongs(
      songs,
      { mode: "mood", value: "신나는", newSongRatio: 50, count: 10 },
      seededRandom(seed),
    );
    orders.add(result.songs.map((song) => (song.isKnown ? "K" : "N")).join(""));
  }
  assert(orders.size > 1, "순서가 항상 같으면 안 됨");
});

test("잘못된 입력은 이해할 수 있는 오류를 던진다", () => {
  const base: GenerateOptions = { mode: "genre", value: "발라드", newSongRatio: 50, count: 10 };
  const invalid: unknown[] = [
    null,
    { ...base, mode: "title" },
    { ...base, value: "" },
    { ...base, value: "   " },
    { ...base, value: 3 },
    { ...base, mode: "year", value: 2020.5 },
    { ...base, count: 4 },
    { ...base, count: 31 },
    { ...base, count: 10.5 },
    { ...base, count: "10" },
    { ...base, newSongRatio: -1 },
    { ...base, newSongRatio: 101 },
    { ...base, newSongRatio: Number.NaN },
    { ...base, newSongRatio: Number.POSITIVE_INFINITY },
  ];
  for (const options of invalid) {
    assertThrows(
      () => generatePlaylist(options as GenerateOptions),
      `잘못된 입력 ${JSON.stringify(options)}`,
      (error) => error instanceof Error && /[가-힣]/.test(error.message),
    );
  }
  // 경계값은 허용
  generatePlaylist({ ...base, count: 5, newSongRatio: 0 });
  generatePlaylist({ ...base, count: 30, newSongRatio: 100 });
});
