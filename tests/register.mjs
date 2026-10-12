// 테스트 실행 전용: 확장자 없는 상대 import를 .ts 파일로 해석하는 Node 모듈 훅을 등록한다.
import { register } from "node:module";

register("./ts-resolve-hooks.mjs", import.meta.url);
