// "../lib/generator"처럼 확장자 없는 상대 경로를 "../lib/generator.ts"로 해석한다.
export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
  if (isRelative && !/\.[cm]?[jt]s$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      // .ts 파일이 없으면 기본 해석으로 넘긴다.
    }
  }
  return nextResolve(specifier, context);
}
