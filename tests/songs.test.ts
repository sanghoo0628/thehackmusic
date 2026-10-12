import type { GenerationMode } from "../types/music";
import { songs } from "../data/songs";
import { assert, assertEqual, test } from "./harness";

test("샘플 데이터는 정확히 100곡이다", () => {
  assertEqual(songs.length, 100, "곡 수");
});

test("곡 ID는 모두 고유하고 비어 있지 않다", () => {
  const ids = songs.map((song) => song.id);
  assert(ids.every((id) => typeof id === "string" && id.trim().length > 0), "빈 ID가 있음");
  assertEqual(new Set(ids).size, 100, "고유 ID 수");
});

test("모든 곡의 필드 타입이 계약과 일치한다", () => {
  for (const song of songs) {
    assert(
      typeof song.title === "string" && song.title.length > 0 &&
        typeof song.artist === "string" && song.artist.length > 0 &&
        typeof song.genre === "string" && song.genre.length > 0 &&
        typeof song.mood === "string" && song.mood.length > 0 &&
        Number.isInteger(song.year) && typeof song.isKnown === "boolean",
      `${song.id}의 필드가 잘못됨`,
    );
  }
});

test("모든 조건 값에 알고 있는 곡과 새로운 곡이 함께 있다", () => {
  const modes: GenerationMode[] = ["artist", "genre", "year", "mood"];
  for (const mode of modes) {
    const groups = new Map<string | number, { known: number; unknown: number }>();
    for (const song of songs) {
      const group = groups.get(song[mode]) ?? { known: 0, unknown: 0 };
      if (song.isKnown) group.known++;
      else group.unknown++;
      groups.set(song[mode], group);
    }
    assert(groups.size >= 4, `${mode} 값이 다양하지 않음 (${groups.size}개)`);
    for (const [value, group] of groups) {
      assert(group.known > 0 && group.unknown > 0, `${mode}=${value}에 두 그룹이 모두 있어야 함`);
    }
  }
});
