// Ambient declarations for the 'bun:test' module.
//
// Production-branch shim: ships on `main` alongside scopes.test.ts so
// `tsc --noEmit` keeps passing while the CI authz-unit job executes
// that focused suite on production branches. The dev-only authz test
// files that stay on main-full-dev consume the same shim there.
//
// The repo typechecks with tsc (CI + local gate before every commit), but the
// bun test globals are provided by the bun runtime, not by any @types package
// installed here. This shim declares only the surface the authz unit tests
// use, so `tsc --noEmit` passes without pulling @types/bun and its global
// namespace into the Next.js app.

declare module 'bun:test' {
  type TestFn = () => void | Promise<void>

  interface ExpectStatic<T = unknown> {
    toBe(expected: T): void
    toEqual(expected: unknown): void
    toStrictEqual(expected: unknown): void
    toContain(expected: unknown): void
    toHaveLength(n: number): void
    toBeTruthy(): void
    toBeFalsy(): void
    toBeDefined(): void
    toBeNull(): void
    toBeUndefined(): void
    toBeNaN(): void
    toBeGreaterThan(n: number): void
    toBeGreaterThanOrEqual(n: number): void
    toBeLessThan(n: number): void
    toBeLessThanOrEqual(n: number): void
    toThrow(): void
    toThrowError(message?: string | RegExp): void
    toMatch(pattern: string | RegExp): void
    toMatchObject(expected: Record<string, unknown>): void
    toHaveProperty(prop: string, value?: unknown): void
    toBeInstanceOf(constructor: unknown): void
    toHaveBeenCalled(): void
    toHaveBeenCalledTimes(n: number): void
    toHaveBeenCalledWith(...args: unknown[]): void
    resolves: ExpectStatic<T>
    rejects: ExpectStatic<T>
    not: ExpectStatic<T>
  }

  export function describe(name: string, fn: () => void): void
  export function it(name: string, fn: TestFn): void
  export function test(name: string, fn: TestFn): void
  export function beforeAll(fn: () => void | Promise<void>): void
  export function afterAll(fn: () => void | Promise<void>): void
  export function beforeEach(fn: () => void | Promise<void>): void
  export function afterEach(fn: () => void | Promise<void>): void
  export const expect: <T = unknown>(actual: T) => ExpectStatic<T>
}
