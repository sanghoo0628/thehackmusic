"use client";

import { useEffect, useState } from "react";
import type { GenerateOptions, GenerationMode, Playlist, Song } from "../types/music";
import { generatePlaylist, isPreview, loadPlaylists, savePlaylist, songs } from "./music-services";
import { SongLibrary } from "./song-library";

const modes: { value: GenerationMode; label: string }[] = [
  { value: "artist", label: "가수별" }, { value: "genre", label: "장르별" },
  { value: "year", label: "연도별" }, { value: "mood", label: "분위기별" },
];
const songMap = new Map(songs.map((song) => [song.id, song]));
const choices = (mode: GenerationMode) => [...new Set(songs.map((song) => song[mode]))].sort((a, b) => typeof a === "number" && typeof b === "number" ? b - a : String(a).localeCompare(String(b), "ko"));
const message = (error: unknown) => error instanceof Error ? error.message : "작업을 완료하지 못했습니다. 다시 시도해주세요.";
const formatTime = (value: string) => new Date(value).toLocaleString("ko-KR");

export function PlaylistStudio() {
  const [mode, setMode] = useState<GenerationMode>("artist");
  const [value, setValue] = useState<string>(String(choices("artist")[0] ?? ""));
  const [count, setCount] = useState(10);
  const [ratio, setRatio] = useState(50);
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Playlist[]>([]);
  const [active, setActive] = useState<Playlist | null>(null);
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try { setSaved(loadPlaylists()); }
    catch (cause) { setStorageBlocked(true); setError(message(cause)); }
    finally { setReady(true); }
  }, []);

  function persist(playlist: Playlist) {
    setActive(playlist);
    setDirty(true);
    setNotice("");
    if (!ready || storageBlocked) {
      setError("저장 목록을 읽지 못해 자동 저장이 중단되었습니다. 불러오기를 재시도해주세요.");
      return;
    }
    try {
      savePlaylist(playlist);
      setSaved((items) => [playlist, ...items.filter((item) => item.id !== playlist.id)]);
      setDirty(false);
      setError("");
      setNotice(isPreview ? "현재 세션에 임시 저장했습니다." : "저장했습니다.");
    } catch (cause) { setError(message(cause)); }
  }

  function reloadStorage() {
    try {
      setSaved(loadPlaylists());
      setStorageBlocked(false);
      setError("");
      setNotice("저장 목록을 불러왔습니다. 저장되지 않은 편집은 저장 재시도로 보관해주세요.");
    } catch (cause) { setStorageBlocked(true); setError(message(cause)); }
  }

  function generate() {
    if (dirty && !window.confirm("저장되지 않은 편집이 있습니다. 새 플레이리스트를 생성할까요?")) return;
    try {
      if (!value) throw new Error("생성 조건을 선택해주세요.");
      const options: GenerateOptions = { mode, value: mode === "year" ? Number(value) : value, count, newSongRatio: ratio };
      const result = generatePlaylist(options);
      const now = new Date().toISOString();
      setWarnings(result.warnings);
      setQuery("");
      persist({ id: crypto.randomUUID(), name: `${value} 믹스`, options, songIds: result.songs.map((song) => song.id), createdAt: now, updatedAt: now, changes: [] });
    } catch (cause) { setError(message(cause)); }
  }

  function edit(song: Song, action: "add" | "remove") {
    if (!active) return;
    if (action === "add" && active.songIds.includes(song.id)) return;
    const now = new Date().toISOString();
    persist({ ...active, songIds: action === "add" ? [...active.songIds, song.id] : active.songIds.filter((id) => id !== song.id), updatedAt: now,
      changes: [...active.changes, { id: crypto.randomUUID(), action, songId: song.id, timestamp: now }] });
    setWarnings([]);
  }

  function selectPlaylist(playlist: Playlist) {
    if (dirty && !window.confirm("저장되지 않은 편집이 있습니다. 다른 목록으로 이동할까요?")) return;
    setActive(playlist); setDirty(false); setWarnings([]); setNotice(""); setQuery("");
    if (!storageBlocked) setError("");
  }

  const currentSongs = active?.songIds.map((id) => songMap.get(id)).filter((song): song is Song => Boolean(song)) ?? [];
  const actualRatio = currentSongs.length ? currentSongs.filter((song) => !song.isKnown).length / currentSongs.length * 100 : 0;
  const missingCount = (active?.songIds.length ?? 0) - currentSongs.length;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = songs.filter((song) => `${song.title} ${song.artist}`.toLocaleLowerCase().includes(normalizedQuery));

  return (
    <main className="studio mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <header className="masthead"><a href="/" className="brand" aria-label="모음 홈"><span aria-hidden="true">♫</span> 모음<span className="brand-dot">.</span></a><span className="eyebrow">YOUR PERSONAL MUSIC MIX</span></header>
      <section className="intro"><p className="eyebrow">취향에 발견을 더하다</p><h1>오늘의 기분을<br />플레이리스트로.</h1><p>익숙한 노래와 새로운 발견, 원하는 만큼 섞어보세요.</p></section>
      {isPreview && <aside className="preview-banner"><strong>UI 개발용 미리보기</strong><span>임시 {songs.length}곡과 메모리 저장을 사용합니다. 새로고침하면 목록이 사라집니다. 실제 100곡·영구 저장 모듈은 아직 연결되지 않았습니다.</span></aside>}
      <div className="feedback" aria-live="polite" role="status">{notice}</div>
      {error && <div className="error" role="alert"><p>{error}</p>{storageBlocked && <button className="secondary" onClick={reloadStorage}>불러오기 재시도</button>}</div>}
      <div className="workspace">
        <aside className="sidebar">
          <section className="panel"><p className="eyebrow">01 / CREATE</p><h2>취향 설정</h2>
            <form onSubmit={(event) => { event.preventDefault(); generate(); }}>
              <fieldset><legend>어떤 기준으로 만들까요?</legend><div className="mode-grid">{modes.map((item) => <button key={item.value} type="button" aria-pressed={mode === item.value} className={mode === item.value ? "mode selected" : "mode"} onClick={() => { setMode(item.value); setValue(String(choices(item.value)[0] ?? "")); }}>{item.label}</button>)}</div></fieldset>
              <label className="field" htmlFor="condition">{modes.find((item) => item.value === mode)?.label} 조건<select id="condition" value={value} onChange={(event) => setValue(event.target.value)} required><option value="" disabled>조건 선택</option>{choices(mode).map((option) => <option key={String(option)} value={String(option)}>{option}{mode === "year" ? "년" : ""}</option>)}</select></label>
              <label className="field" htmlFor="count">플레이리스트 곡 수<input id="count" type="number" min={5} max={30} step={1} required value={Number.isNaN(count) ? "" : count} onChange={(event) => setCount(event.target.valueAsNumber)} /></label>
              <label className="field" htmlFor="ratio"><span className="label-row">새로운 노래 비율<strong>{ratio}%</strong></span><input id="ratio" type="range" min={0} max={100} step={1} value={ratio} onChange={(event) => setRatio(Number(event.target.value))} aria-describedby="ratio-help" /></label>
              <div className="range-labels"><span>익숙한 곡</span><span>새로운 발견</span></div><p id="ratio-help" className="hint">새로운 곡은 샘플에서 ‘아직 모르는 곡’으로 지정한 노래입니다.</p>
              <button className="primary" type="submit" disabled={!ready || !value}>플레이리스트 만들기 <span aria-hidden="true">↗</span></button>
            </form>
          </section>
          <section className="panel saved"><p className="eyebrow">MY COLLECTION</p><h2>저장된 플레이리스트 <span className="counter">{saved.length}</span></h2>{!ready ? <p className="hint">목록을 불러오는 중입니다.</p> : saved.length === 0 ? <p className="hint">첫 번째 믹스를 만들어보세요.</p> : <ul>{saved.map((playlist) => <li key={playlist.id}><button className={active?.id === playlist.id ? "saved-item selected" : "saved-item"} aria-pressed={active?.id === playlist.id} onClick={() => selectPlaylist(playlist)}><strong>{playlist.name}</strong><span>{playlist.songIds.length}곡 · {formatTime(playlist.updatedAt)}</span></button></li>)}</ul>}</section>
        </aside>
        <section className="results panel"><div className="section-title"><div><p className="eyebrow">02 / YOUR MIX</p><h2>{active?.name ?? "나만의 믹스"}</h2></div>{active && <span className="save-state">{dirty ? "저장되지 않음" : isPreview ? "임시 저장됨" : "저장됨"}</span>}</div>
          {!active ? <div className="empty"><span className="record" aria-hidden="true">♫</span><h3>어떤 음악으로 시작할까요?</h3><p>왼쪽에서 취향을 선택하면<br />여기에 당신만의 플레이리스트가 펼쳐집니다.</p></div> : <>
            <div className="mix-stats"><span><strong>{currentSongs.length}</strong>곡</span><span>새로운 곡 <strong>{Math.round(actualRatio)}%</strong></span><span>요청 비율 {active.options.newSongRatio}%</span></div>
            {dirty && <button className="secondary retry" disabled={storageBlocked} onClick={() => persist(active)}>저장 재시도</button>}
            {warnings.length > 0 && <ul className="warning" aria-label="생성 안내">{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
            {missingCount > 0 && <p className="warning" role="status">현재 데이터에 없는 곡 {missingCount}개는 표시할 수 없습니다. 저장된 ID는 유지됩니다.</p>}
            {currentSongs.length === 0 ? <p className="empty-list">담긴 곡이 없습니다. 아래에서 곡을 검색해 추가해보세요.</p> : <ol className="song-list">{currentSongs.map((song, index) => <li key={song.id}><span className="track-number">{String(index + 1).padStart(2, "0")}</span><SongDetails song={song} /><button className="icon-button" onClick={() => edit(song, "remove")} aria-label={`${song.title} 제거`}>×</button></li>)}</ol>}
            <section className="search-section"><h3>노래 더하기</h3><label className="field" htmlFor="song-search">제목 또는 가수 검색<input id="song-search" type="search" placeholder="찾고 싶은 노래를 입력하세요" value={query} onChange={(event) => setQuery(event.target.value)} /></label><p className="hint">검색 결과 {matches.length}곡 · 선택 조건과 관계없이 추가할 수 있습니다.</p><ul className="search-results">{matches.map((song) => { const included = active.songIds.includes(song.id); return <li key={song.id}><SongDetails song={song} /><button className="add-button" disabled={included} onClick={() => edit(song, "add")} aria-label={`${song.title} ${included ? "이미 포함됨" : "추가"}`}>{included ? "담김" : "+ 추가"}</button></li>; })}</ul>{matches.length === 0 && <p className="hint">검색 결과가 없습니다. 다른 제목이나 가수를 입력해주세요.</p>}</section>
            <details className="history"><summary>편집 내역 <span className="counter">{active.changes.length}</span></summary>{active.changes.length === 0 ? <p className="hint">아직 추가·제거한 내역이 없습니다.</p> : <ol>{[...active.changes].reverse().map((change) => <li key={change.id}><span className={change.action === "add" ? "history-add" : "history-remove"}>{change.action === "add" ? "추가" : "제거"}</span><span>{songMap.get(change.songId)?.title ?? change.songId}</span><time dateTime={change.timestamp}>{formatTime(change.timestamp)}</time></li>)}</ol>}</details>
          </>}
        </section>
      </div>
      <SongLibrary songs={songs} />
      <footer>모음 · 작은 취향들이 모여, 나만의 음악이 됩니다.</footer>
    </main>
  );
}

function SongDetails({ song }: { song: Song }) {
  return <div className="song-details"><div className="song-title"><strong>{song.title}</strong>{!song.isKnown && <span className="new-tag">NEW</span>}</div><p>{song.artist} · {song.genre} · {song.year} · {song.mood}</p></div>;
}
