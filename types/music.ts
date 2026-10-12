export type GenerationMode = "artist" | "genre" | "year" | "mood";

export type Song = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  year: number;
  mood: string;
  isKnown: boolean;
};

export type GenerateOptions = {
  mode: GenerationMode;
  value: string | number;
  newSongRatio: number;
  count: number;
};

export type GenerationResult = {
  songs: Song[];
  requestedCount: number;
  actualNewSongRatio: number;
  warnings: string[];
};

export type PlaylistChange = {
  id: string;
  action: "add" | "remove";
  songId: string;
  timestamp: string;
};

export type Playlist = {
  id: string;
  name: string;
  options: GenerateOptions;
  songIds: string[];
  createdAt: string;
  updatedAt: string;
  changes: PlaylistChange[];
};
