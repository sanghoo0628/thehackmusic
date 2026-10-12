import type { GenerateOptions, GenerationResult, Song } from "../types/music";
import { songs } from "../data/songs";
import { assertGenerateOptions } from "./validation";

export type RandomSource = () => number;

/** Fisher-Yates 셔플. 입력 배열은 변경하지 않고 새 배열을 반환한다. */
function shuffle<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = temp;
  }
  return result;
}

function matchesOption(song: Song, options: GenerateOptions): boolean {
  return song[options.mode] === options.value;
}

/**
 * 주어진 곡 목록에서 플레이리스트를 생성한다. 테스트에서 데이터와 난수를 주입할 때 사용한다.
 * 원본 배열과 곡 객체는 변경하지 않으며 결과에는 곡 객체의 복사본을 담는다.
 */
export function generatePlaylistFromSongs(
  source: readonly Song[],
  options: GenerateOptions,
  random: RandomSource = Math.random,
): GenerationResult {
  assertGenerateOptions(options);
  const { count, newSongRatio } = options;

  const candidates = source.filter((song) => matchesOption(song, options));
  if (candidates.length === 0) {
    return {
      songs: [],
      requestedCount: count,
      actualNewSongRatio: 0,
      warnings: ["선택한 조건에 맞는 곡이 없습니다."],
    };
  }

  const newPool = shuffle(candidates.filter((song) => !song.isKnown), random);
  const knownPool = shuffle(candidates.filter((song) => song.isKnown), random);

  const targetNew = Math.round((count * newSongRatio) / 100);
  const targetKnown = count - targetNew;

  // 각 그룹에서 목표만큼 뽑고, 부족분은 같은 조건의 다른 그룹 남은 곡으로 채운다.
  const pickedNew = newPool.slice(0, targetNew);
  const pickedKnown = knownPool.slice(0, targetKnown);
  const extraKnown = knownPool.slice(pickedKnown.length, pickedKnown.length + (targetNew - pickedNew.length));
  const extraNew = newPool.slice(pickedNew.length, pickedNew.length + (targetKnown - pickedKnown.length));

  const selected = shuffle([...pickedNew, ...extraNew, ...pickedKnown, ...extraKnown], random).map(
    (song) => ({ ...song }),
  );

  const warnings: string[] = [];
  if (pickedNew.length < targetNew) {
    warnings.push(
      `조건에 맞는 새로운 곡이 ${newPool.length}곡뿐이라 목표 ${targetNew}곡을 채우지 못했습니다.` +
        (extraKnown.length > 0 ? ` 부족한 ${extraKnown.length}곡은 알고 있는 곡으로 채웠습니다.` : ""),
    );
  }
  if (pickedKnown.length < targetKnown) {
    warnings.push(
      `조건에 맞는 알고 있는 곡이 ${knownPool.length}곡뿐이라 목표 ${targetKnown}곡을 채우지 못했습니다.` +
        (extraNew.length > 0 ? ` 부족한 ${extraNew.length}곡은 새로운 곡으로 채웠습니다.` : ""),
    );
  }
  if (selected.length < count) {
    warnings.push(
      `조건에 맞는 곡이 모두 ${candidates.length}곡이라 요청한 ${count}곡 중 ${selected.length}곡만 생성했습니다.`,
    );
  }

  const newCount = selected.filter((song) => !song.isKnown).length;
  return {
    songs: selected,
    requestedCount: count,
    // 소수점 첫째 자리까지 반올림한 백분율 (예: 3/7곡 → 42.9)
    actualNewSongRatio: Math.round((newCount / selected.length) * 1000) / 10,
    warnings,
  };
}

/** 샘플 데이터(data/songs.ts)에서 조건에 맞는 플레이리스트를 생성한다. 잘못된 입력은 오류를 던진다. */
export function generatePlaylist(options: GenerateOptions): GenerationResult {
  return generatePlaylistFromSongs(songs, options);
}
