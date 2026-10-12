// 의존성 없는 최소 테스트 도구. 실행 방법은 tests/run.ts 상단 주석을 참고한다.

type TestCase = { name: string; fn: () => void };

const cases: TestCase[] = [];

export function test(name: string, fn: () => void): void {
  cases.push({ name, fn });
}

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new AssertionError(`${message} (기대값: ${String(expected)}, 실제값: ${String(actual)})`);
  }
}

export function assertDeepEqual(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new AssertionError(`${message}\n  기대값: ${e}\n  실제값: ${a}`);
  }
}

/** fn이 오류를 던지는지 확인하고 그 오류를 반환한다. check로 오류 내용을 추가 검사할 수 있다. */
export function assertThrows(fn: () => unknown, message: string, check?: (error: unknown) => boolean): unknown {
  try {
    fn();
  } catch (error) {
    if (check && !check(error)) {
      throw new AssertionError(`${message} (예상과 다른 오류: ${String(error)})`);
    }
    return error;
  }
  throw new AssertionError(`${message} (오류가 발생하지 않음)`);
}

/** 등록된 테스트를 모두 실행하고 실패 수를 반환한다. */
export function runAll(): number {
  let failed = 0;
  for (const { name, fn } of cases) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
    } catch (error) {
      failed++;
      console.log(`  ✗ ${name}`);
      console.log(`    ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`\n${cases.length - failed}/${cases.length} 통과${failed > 0 ? `, ${failed} 실패` : ""}`);
  return failed;
}
