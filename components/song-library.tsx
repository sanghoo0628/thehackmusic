"use client";

import { useState } from "react";
import type { Song } from "../types/music";

type Filter = "known" | "new" | "all";

const filters: { value: Filter; label: string; match: (song: Song) => boolean }[] = [
  { value: "known", label: "내가 듣던 곡", match: (song) => song.isKnown },
  { value: "new", label: "새로운 곡", match: (song) => !song.isKnown },
  { value: "all", label: "전체", match: () => true },
];

export function SongLibrary({ songs }: { songs: Song[] }) {
  const [filter, setFilter] = useState<Filter>("known");
  const [query, setQuery] = useState("");
  const current = filters.find((item) => item.value === filter) ?? filters[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visible = songs.filter((song) => current.match(song) && `${song.title} ${song.artist} ${song.genre} ${song.mood} ${song.year}`.toLocaleLowerCase().includes(normalizedQuery));

  return (
    <section className="panel library" aria-labelledby="library-title">
      <p className="eyebrow">03 / LIBRARY</p>
      <h2 id="library-title">전체 곡 목록 <span className="counter">{songs.length}</span></h2>
      <p className="hint">‘내가 듣던 곡’은 이미 알고 있는 곡, ‘새로운 곡’은 플레이리스트 생성 시 새로운 발견으로 추천되는 곡입니다.</p>
      <div className="library-tabs" role="group" aria-label="곡 구분">
        {filters.map((item) => (
          <button key={item.value} type="button" aria-pressed={filter === item.value} className={filter === item.value ? "mode selected" : "mode"} onClick={() => setFilter(item.value)}>
            {item.label} <span className="counter">{songs.filter(item.match).length}</span>
          </button>
        ))}
      </div>
      <label className="field" htmlFor="library-search">제목·가수·장르·분위기·연도 검색<input id="library-search" type="search" placeholder="예: 달빛소년, 발라드, 2020" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <p className="hint" role="status">{current.label} {visible.length}곡</p>
      {visible.length === 0 ? <p className="empty-list">조건에 맞는 곡이 없습니다.</p> : (
        <ol className="song-list library-list">
          {visible.map((song) => (
            <li key={song.id}>
              <div className="song-details">
                <div className="song-title"><strong>{song.title}</strong>{!song.isKnown && <span className="new-tag">NEW</span>}</div>
                <p>{song.artist} · {song.genre} · {song.year} · {song.mood}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
