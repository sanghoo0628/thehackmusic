import type { Playlist } from "../types/music";
import { getGenerateOptionsError, isIsoDateTime, isNonEmptyString, isRecord } from "./validation";

export const STORAGE_KEY = "music-playlists:v1";

export type PlaylistStorageErrorCode =
  | "unavailable" // 서버 환경 등 localStorage를 사용할 수 없음
  | "access" // 브라우저 설정 등으로 읽기·쓰기 거부
  | "quota" // 저장 용량 초과
  | "corrupted" // 저장된 데이터의 JSON 또는 구조 손상
  | "invalid"; // 저장하려는 Playlist가 유효하지 않음

export class PlaylistStorageError extends Error {
  readonly code: PlaylistStorageErrorCode;

  constructor(code: PlaylistStorageErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PlaylistStorageError";
    this.code = code;
  }
}

function getStorage(): Storage {
  if (typeof window === "undefined") {
    throw new PlaylistStorageError(
      "unavailable",
      "플레이리스트 저장소는 브라우저에서만 사용할 수 있습니다. 클라이언트 컴포넌트의 마운트 이후에 호출하세요.",
    );
  }
  try {
    const storage = window.localStorage;
    if (!storage) {
      throw new Error("localStorage is not available");
    }
    return storage;
  } catch (cause) {
    throw new PlaylistStorageError("access", "브라우저 저장소에 접근할 수 없습니다. 브라우저 설정을 확인해 주세요.", {
      cause,
    });
  }
}

function isQuotaExceeded(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || code === 22 || code === 1014;
}

/** 플레이리스트 하나의 구조를 검사하고, 문제가 있으면 한국어 오류 메시지를 반환한다. */
export function getPlaylistError(playlist: unknown): string | null {
  if (!isRecord(playlist)) {
    return "플레이리스트가 객체가 아닙니다.";
  }
  if (!isNonEmptyString(playlist.id)) {
    return "플레이리스트 ID가 비어 있거나 문자열이 아닙니다.";
  }
  const label = `플레이리스트(${playlist.id})`;
  if (!isNonEmptyString(playlist.name)) {
    return `${label}의 이름이 비어 있거나 문자열이 아닙니다.`;
  }
  const optionsError = getGenerateOptionsError(playlist.options);
  if (optionsError) {
    return `${label}의 생성 옵션이 잘못되었습니다: ${optionsError}`;
  }
  if (!Array.isArray(playlist.songIds) || !playlist.songIds.every(isNonEmptyString)) {
    return `${label}의 곡 ID 목록은 비어 있지 않은 문자열 배열이어야 합니다.`;
  }
  if (new Set(playlist.songIds).size !== playlist.songIds.length) {
    return `${label}에 중복된 곡 ID가 있습니다.`;
  }
  if (!isIsoDateTime(playlist.createdAt) || !isIsoDateTime(playlist.updatedAt)) {
    return `${label}의 생성·수정 시각은 ISO 8601 형식이어야 합니다.`;
  }
  if (!Array.isArray(playlist.changes)) {
    return `${label}의 변경 내역이 배열이 아닙니다.`;
  }
  const changeIds = new Set<string>();
  for (let index = 0; index < playlist.changes.length; index++) {
    const change: unknown = playlist.changes[index];
    const changeLabel = `${label}의 변경 내역 ${index + 1}번째 항목`;
    if (!isRecord(change)) {
      return `${changeLabel}이 객체가 아닙니다.`;
    }
    if (!isNonEmptyString(change.id)) {
      return `${changeLabel}의 ID가 비어 있거나 문자열이 아닙니다.`;
    }
    if (changeIds.has(change.id)) {
      return `${changeLabel}의 ID(${change.id})가 중복됩니다.`;
    }
    changeIds.add(change.id);
    if (change.action !== "add" && change.action !== "remove") {
      return `${changeLabel}의 action은 "add" 또는 "remove"여야 합니다.`;
    }
    // 제거된 곡의 이력도 유효하므로 songIds에 포함되어 있는지는 검사하지 않는다.
    if (!isNonEmptyString(change.songId)) {
      return `${changeLabel}의 곡 ID가 비어 있거나 문자열이 아닙니다.`;
    }
    if (!isIsoDateTime(change.timestamp)) {
      return `${changeLabel}의 시각은 ISO 8601 형식이어야 합니다.`;
    }
  }
  return null;
}

function getPlaylistsError(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return "저장된 값이 플레이리스트 배열이 아닙니다.";
  }
  const ids = new Set<string>();
  for (const playlist of value) {
    const error = getPlaylistError(playlist);
    if (error) {
      return error;
    }
    const { id } = playlist as Playlist;
    if (ids.has(id)) {
      return `플레이리스트 ID(${id})가 중복 저장되어 있습니다.`;
    }
    ids.add(id);
  }
  return null;
}

/**
 * 저장된 플레이리스트 목록을 불러온다. 저장 값이 없으면 빈 배열을 반환한다.
 * 서버 환경·접근 불가·데이터 손상 시 PlaylistStorageError를 던진다.
 */
export function loadPlaylists(): Playlist[] {
  const storage = getStorage();
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (cause) {
    throw new PlaylistStorageError("access", "저장된 플레이리스트를 읽을 수 없습니다. 브라우저 저장소 접근이 거부되었습니다.", {
      cause,
    });
  }
  if (raw === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new PlaylistStorageError("corrupted", "저장된 플레이리스트 데이터가 손상되었습니다(JSON 형식 오류).", { cause });
  }
  const error = getPlaylistsError(parsed);
  if (error) {
    throw new PlaylistStorageError("corrupted", `저장된 플레이리스트 데이터가 손상되었습니다: ${error}`);
  }
  return parsed as Playlist[];
}

/**
 * 플레이리스트를 저장한다. 같은 ID가 있으면 갱신하고 없으면 추가하며 다른 플레이리스트는 보존한다.
 * 입력이 잘못되었거나 기존 데이터가 손상된 경우 아무것도 쓰지 않고 PlaylistStorageError를 던진다.
 */
export function savePlaylist(playlist: Playlist): void {
  const inputError = getPlaylistError(playlist);
  if (inputError) {
    throw new PlaylistStorageError("invalid", `저장할 플레이리스트가 올바르지 않습니다: ${inputError}`);
  }
  // 기존 데이터가 손상되었으면 여기서 오류가 발생하므로 덮어쓰지 않는다.
  const playlists = loadPlaylists();
  const index = playlists.findIndex((item) => item.id === playlist.id);
  if (index === -1) {
    playlists.push(playlist);
  } else {
    playlists[index] = playlist;
  }

  const storage = getStorage();
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch (cause) {
    if (isQuotaExceeded(cause)) {
      throw new PlaylistStorageError("quota", "브라우저 저장 공간이 부족해 플레이리스트를 저장하지 못했습니다.", { cause });
    }
    throw new PlaylistStorageError("access", "플레이리스트를 저장하지 못했습니다. 브라우저 저장소 접근이 거부되었습니다.", {
      cause,
    });
  }
}
