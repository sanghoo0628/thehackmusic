// 의존성 없는 검증 실행 파일 (Node.js 22.6 이상, 타입 제거 기능 사용).
//   node --experimental-strip-types --import ./tests/register.mjs tests/run.ts
// Node 23.6 이상에서는 --experimental-strip-types를 생략할 수 있다.
// register.mjs는 앱 코드의 확장자 없는 상대 import("../data/songs")를 .ts 파일로 연결한다.
import "./songs.test";
import "./generator.test";
import "./storage.test";
import { runAll } from "./harness";

const failed = runAll();
if (failed > 0) {
  (globalThis as unknown as { process: { exitCode: number } }).process.exitCode = 1;
}
