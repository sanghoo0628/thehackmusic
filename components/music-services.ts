// 2번 모듈 준비 후 아래 mock export를 제거하고 다음 export를 활성화하세요.
// export { songs } from "../data/songs";
// export { generatePlaylist } from "../lib/generator";
// export { loadPlaylists, savePlaylist } from "../lib/storage";
export { songs, generatePlaylist, loadPlaylists, savePlaylist } from "./dev/mock";
export const isPreview = true; // 실제 모듈 연동 시 false로 변경
