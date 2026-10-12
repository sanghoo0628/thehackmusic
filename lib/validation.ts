import type { GenerateOptions, GenerationMode } from "../types/music";

export const GENERATION_MODES: readonly GenerationMode[] = ["artist", "genre", "year", "mood"];
export const MIN_COUNT = 5;
export const MAX_COUNT = 30;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** GenerateOptions 형식을 검사하고, 문제가 있으면 한국어 오류 메시지를 반환한다. */
export function getGenerateOptionsError(options: unknown): string | null {
  if (!isRecord(options)) {
    return "생성 옵션이 객체가 아닙니다.";
  }
  const { mode, value, newSongRatio, count } = options;
  if (typeof mode !== "string" || !GENERATION_MODES.includes(mode as GenerationMode)) {
    return `생성 방식은 ${GENERATION_MODES.join(", ")} 중 하나여야 합니다.`;
  }
  if (mode === "year") {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return "연도 조건은 정수 숫자여야 합니다.";
    }
  } else if (!isNonEmptyString(value)) {
    return "가수·장르·분위기 조건은 비어 있지 않은 문자열이어야 합니다.";
  }
  if (typeof count !== "number" || !Number.isInteger(count) || count < MIN_COUNT || count > MAX_COUNT) {
    return `곡 수는 ${MIN_COUNT}~${MAX_COUNT} 사이의 정수여야 합니다.`;
  }
  if (typeof newSongRatio !== "number" || !Number.isFinite(newSongRatio) || newSongRatio < 0 || newSongRatio > 100) {
    return "새로운 곡 비율은 0~100 사이의 숫자여야 합니다.";
  }
  return null;
}

export function assertGenerateOptions(options: unknown): asserts options is GenerateOptions {
  const error = getGenerateOptionsError(options);
  if (error) {
    throw new Error(error);
  }
}

const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-](\d{2}):(\d{2}))$/;

/** new Date().toISOString() 형식(시간대 포함)의 실제 존재하는 시각인지 확인한다. */
export function isIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const match = ISO_DATE_TIME.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  // Date.parse는 2월 30일 같은 날짜를 다음 달로 넘기므로 직접 범위를 확인한다.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth &&
    hour <= 23 && minute <= 59 && second <= 59 &&
    offsetHour <= 23 && offsetMinute <= 59 &&
    !Number.isNaN(Date.parse(value))
  );
}
