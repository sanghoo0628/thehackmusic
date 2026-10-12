import type { Playlist } from "../types/music";
import { loadPlaylists, PlaylistStorageError, savePlaylist, STORAGE_KEY } from "../lib/storage";
import { assert, assertDeepEqual, assertEqual, assertThrows, test } from "./harness";

/** 실제 브라우저 저장소 대신 사용하는 메모리 mock */
class MemoryStorage {
  data = new Map<string, string>();
  failGet: unknown = null;
  failSet: unknown = null;
  setCalls = 0;

  getItem(key: string): string | null {
    if (this.failGet) throw this.failGet;
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.setCalls++;
    if (this.failSet) throw this.failSet;
    this.data.set(key, String(value));
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

type GlobalWithWindow = { window?: unknown };

function withStorage(fn: (storage: MemoryStorage) => void): void {
  const globalObject = globalThis as unknown as GlobalWithWindow;
  const hadWindow = "window" in globalObject;
  const previous = globalObject.window;
  const storage = new MemoryStorage();
  globalObject.window = { localStorage: storage };
  try {
    fn(storage);
  } finally {
    if (hadWindow) globalObject.window = previous;
    else delete globalObject.window;
  }
}

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: "playlist-1",
    name: "잔잔한 플레이리스트",
    options: { mode: "mood", value: "잔잔한", newSongRatio: 50, count: 10 },
    songIds: ["song-001", "song-002"],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    changes: [],
    ...overrides,
  };
}

function isStorageError(code: string): (error: unknown) => boolean {
  return (error) => error instanceof PlaylistStorageError && error.code === code;
}

test("저장 값이 없으면 빈 배열을 반환한다", () => {
  withStorage(() => {
    assertDeepEqual(loadPlaylists(), [], "빈 배열");
  });
});

test("저장 후 불러오면 같은 데이터가 music-playlists:v1 키에 JSON으로 저장된다", () => {
  withStorage((storage) => {
    const playlist = makePlaylist();
    savePlaylist(playlist);
    assertEqual(STORAGE_KEY, "music-playlists:v1", "저장 키");
    assertDeepEqual(JSON.parse(storage.data.get(STORAGE_KEY) ?? "null"), [playlist], "저장된 JSON");
    assertDeepEqual(loadPlaylists(), [playlist], "불러온 값");
  });
});

test("같은 ID는 갱신하고 새 ID는 추가하며 다른 목록을 보존한다", () => {
  withStorage(() => {
    const first = makePlaylist();
    const second = makePlaylist({ id: "playlist-2", name: "두 번째", songIds: ["song-010"] });
    savePlaylist(first);
    savePlaylist(second);
    const updated = makePlaylist({
      name: "수정됨",
      songIds: ["song-002", "song-003"],
      updatedAt: "2026-10-12T11:00:00.000Z",
    });
    savePlaylist(updated);
    const loaded = loadPlaylists();
    assertEqual(loaded.length, 2, "목록 수");
    assertDeepEqual(loaded[0], updated, "첫 번째 목록 갱신 (순서 유지)");
    assertDeepEqual(loaded[1], second, "다른 목록 보존");
  });
});

test("songIds와 변경 내역(제거된 곡 포함)을 그대로 보존한다", () => {
  withStorage(() => {
    const playlist = makePlaylist({
      songIds: ["song-002", "song-050"],
      changes: [
        { id: "change-1", action: "remove", songId: "song-001", timestamp: "2026-10-12T10:05:00.000Z" },
        { id: "change-2", action: "add", songId: "song-050", timestamp: "2026-10-12T10:06:00.000Z" },
      ],
    });
    savePlaylist(playlist);
    const loaded = loadPlaylists()[0];
    assertDeepEqual(loaded?.songIds, playlist.songIds, "songIds 보존");
    assertDeepEqual(loaded?.changes, playlist.changes, "changes 보존");
  });
});

test("손상된 JSON과 잘못된 구조는 불러오기 오류이며 저장 시 덮어쓰지 않는다", () => {
  const corruptedValues = [
    "{not json",
    "null",
    JSON.stringify({ id: "x" }),
    JSON.stringify([{ ...makePlaylist(), songIds: "song-001" }]),
    JSON.stringify([makePlaylist(), makePlaylist()]),
    JSON.stringify([{ ...makePlaylist(), createdAt: "어제" }]),
    JSON.stringify([{ ...makePlaylist(), changes: [{ id: "c", action: "move", songId: "song-001", timestamp: "2026-10-12T10:00:00.000Z" }] }]),
  ];
  for (const raw of corruptedValues) {
    withStorage((storage) => {
      storage.data.set(STORAGE_KEY, raw);
      assertThrows(() => loadPlaylists(), `손상 데이터 불러오기 ${raw}`, isStorageError("corrupted"));
      assertThrows(() => savePlaylist(makePlaylist({ id: "new" })), `손상 데이터 저장 ${raw}`, isStorageError("corrupted"));
      assertEqual(storage.data.get(STORAGE_KEY), raw, "손상 데이터가 그대로 남아야 함");
      assertEqual(storage.setCalls, 0, "setItem을 호출하지 않아야 함");
    });
  }
});

test("잘못된 Playlist 입력은 저장하지 않고 오류를 던진다", () => {
  const invalid: unknown[] = [
    null,
    { ...makePlaylist(), id: "" },
    { ...makePlaylist(), name: 1 },
    { ...makePlaylist(), songIds: ["song-001", "song-001"] },
    { ...makePlaylist(), songIds: ["song-001", ""] },
    { ...makePlaylist(), options: { mode: "mood", value: "잔잔한", newSongRatio: 150, count: 10 } },
    { ...makePlaylist(), options: { mode: "year", value: "2020", newSongRatio: 50, count: 10 } },
    { ...makePlaylist(), createdAt: "2026-10-12" },
    { ...makePlaylist(), updatedAt: "2026-02-30T10:00:00.000Z" },
    { ...makePlaylist(), changes: "없음" },
    { ...makePlaylist(), changes: [{ id: "c1", action: "add", songId: "song-001" }] },
    { ...makePlaylist(), changes: [{ id: "c1", action: "delete", songId: "song-001", timestamp: "2026-10-12T10:00:00.000Z" }] },
    {
      ...makePlaylist(),
      changes: [
        { id: "c1", action: "add", songId: "song-001", timestamp: "2026-10-12T10:00:00.000Z" },
        { id: "c1", action: "remove", songId: "song-001", timestamp: "2026-10-12T10:01:00.000Z" },
      ],
    },
  ];
  for (const playlist of invalid) {
    withStorage((storage) => {
      assertThrows(
        () => savePlaylist(playlist as Playlist),
        `잘못된 입력 ${JSON.stringify(playlist)}`,
        isStorageError("invalid"),
      );
      assertEqual(storage.setCalls, 0, "setItem을 호출하지 않아야 함");
    });
  }
});

test("시간대 오프셋이 있는 ISO 시각도 허용한다", () => {
  withStorage(() => {
    savePlaylist(makePlaylist({ createdAt: "2026-10-12T19:00:00+09:00", updatedAt: "2026-10-12T19:00:00.123+09:00" }));
    assertEqual(loadPlaylists().length, 1, "저장됨");
  });
});

test("용량 초과와 접근 거부는 명시적인 오류이며 기존 데이터는 유지된다", () => {
  withStorage((storage) => {
    const original = makePlaylist();
    savePlaylist(original);
    const saved = storage.data.get(STORAGE_KEY);

    const quota = new Error("quota");
    quota.name = "QuotaExceededError";
    storage.failSet = quota;
    assertThrows(() => savePlaylist(makePlaylist({ id: "playlist-2" })), "용량 초과", isStorageError("quota"));

    storage.failSet = new Error("SecurityError");
    assertThrows(() => savePlaylist(makePlaylist({ id: "playlist-2" })), "쓰기 거부", isStorageError("access"));
    assertEqual(storage.data.get(STORAGE_KEY), saved, "기존 데이터 유지");

    storage.failSet = null;
    storage.failGet = new Error("SecurityError");
    assertThrows(() => loadPlaylists(), "읽기 거부", isStorageError("access"));
  });
});

test("localStorage 속성 접근 자체가 거부되면 access 오류다", () => {
  const globalObject = globalThis as unknown as GlobalWithWindow;
  const hadWindow = "window" in globalObject;
  const previous = globalObject.window;
  globalObject.window = {
    get localStorage(): never {
      throw new Error("SecurityError");
    },
  };
  try {
    assertThrows(() => loadPlaylists(), "접근 거부", isStorageError("access"));
  } finally {
    if (hadWindow) globalObject.window = previous;
    else delete globalObject.window;
  }
});

test("서버 환경(window 없음)에서 호출하면 명확한 오류를 던진다", () => {
  const globalObject = globalThis as unknown as GlobalWithWindow;
  assert(!("window" in globalObject), "테스트 환경에 window가 없어야 함");
  assertThrows(() => loadPlaylists(), "서버 불러오기", isStorageError("unavailable"));
  assertThrows(() => savePlaylist(makePlaylist()), "서버 저장", isStorageError("unavailable"));
});
