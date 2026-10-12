import type { GenerateOptions, GenerationResult, Playlist, Song } from "../../types/music";

// UI 개발용 데이터. 2번의 100곡 데이터와 교체해야 합니다.
export const songs: Song[] = Array.from({ length: 32 }, (_, index) => ({
  id: `preview-${index + 1}`,
  title: ["새벽의 산책", "빛나는 오후", "우리의 계절", "느린 파도"][index % 4] + ` ${Math.floor(index / 4) + 1}`,
  artist: ["루나", "오션", "모노", "소라"][Math.floor(index / 8)],
  genre: ["인디", "팝"][Math.floor(index / 4) % 2],
  year: 2020 + Math.floor(index / 4) % 4,
  mood: ["차분한", "활기찬"][Math.floor(index / 2) % 2],
  isKnown: index % 2 === 0,
}));

export function generatePlaylist(options: GenerateOptions): GenerationResult {
  if (!Number.isInteger(options.count) || options.count < 5 || options.count > 30 || !Number.isFinite(options.newSongRatio) || options.newSongRatio < 0 || options.newSongRatio > 100) {
    throw new Error("곡 수는 5~30, 새로운 곡 비율은 0~100으로 설정해주세요.");
  }
  const candidates = songs.filter((song) => song[options.mode] === options.value);
  const shuffle = (items: Song[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const target = Math.round(options.count * options.newSongRatio / 100);
  const selected = [
    ...shuffle(candidates.filter((song) => !song.isKnown)).slice(0, target),
    ...shuffle(candidates.filter((song) => song.isKnown)).slice(0, options.count - target),
  ];
  const selectedIds = new Set(selected.map((song) => song.id));
  selected.push(...shuffle(candidates.filter((song) => !selectedIds.has(song.id))).slice(0, options.count - selected.length));
  const newCount = selected.filter((song) => !song.isKnown).length;
  const warnings: string[] = [];
  if (selected.length < options.count) warnings.push("조건에 맞는 샘플 곡이 부족해 가능한 곡만 담았습니다.");
  if (newCount !== target) warnings.push("후보가 부족해 요청한 새로운 곡 비율을 맞추지 못했습니다.");
  return { songs: shuffle(selected), requestedCount: options.count, actualNewSongRatio: selected.length ? newCount / selected.length * 100 : 0, warnings };
}

// 임시 저장: localStorage에 접근하지 않으며 새로고침하면 사라집니다.
let previewPlaylists: Playlist[] = [];
export function loadPlaylists(): Playlist[] {
  return structuredClone(previewPlaylists);
}
export function savePlaylist(playlist: Playlist): void {
  previewPlaylists = [structuredClone(playlist), ...previewPlaylists.filter((item) => item.id !== playlist.id)];
}
