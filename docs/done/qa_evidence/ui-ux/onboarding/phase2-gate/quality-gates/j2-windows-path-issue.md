# J2 - Windows import-lint failure: exact state, baseline identity, intended invariant, replacement, equivalence

## 1. Exact original failure (verbatim from this run's bun test output)

          at updateOne (C:\Projects\loginAICSPortal\src\lib\authz\onboarding-state-write.test.ts:84:39)
      at PATCH (C:\Projects\loginAICSPortal\src\app\api\onboarding\state\route.ts:129:19)
      at async callPatch (C:\Projects\loginAICSPortal\src\lib\authz\onboarding-state-write.test.ts:134:21)
      at async <anonymous> (C:\Projects\loginAICSPortal\src\lib\authz\onboarding-state-write.test.ts:331:36)

Onboarding state read failed: 70 | 
71 | function fakeOnboardingStates() {
72 |   return {
73 |     async findOne(query: Record<string, unknown>) {
74 |       state.findOneQueries.push(query)
75 |       if (state.readFails) throw new Error('simulated onboarding read failure')
                                          ^
error: simulated onboarding read failure
      at findOne (C:\Projects\loginAICSPortal\src\lib\authz\onboarding-state-write.test.ts:75:38)
      at findStored (C:\Projects\loginAICSPortal\src\app\api\onboarding\state\route.ts:66:30)
      at async PATCH (C:\Projects\loginAICSPortal\src\app\api\onboarding\state\route.ts:118:56)
      at async callPatch (C:\Projects\loginAICSPortal\src\lib\authz\onboarding-state-write.test.ts:134:21)
      at async <anonymous> (C:\Projects\loginAICSPortal\src\lib\authz\onboarding-state-write.test.ts:342:36)


src\lib\authz\permissions.test.ts:
29 |     expect(PERMISSIONS.viewReleaseQueue).toBe('grade.releaseQueue.read')
30 |     expect(PERMISSIONS.takeAttendance).toBe('attendance.update')
31 |   })
32 | 
33 |   it('import-lint: the module source has no imports and no server references', () => {
34 |     const src = readFileSync(new URL('./permissions.ts', import.meta.url).pathname, 'utf8')
                     ^
error: ENOENT: no such file or directory, open '/C:/Projects/loginAICSPortal/src/lib/authz/permissions.ts'
      at <anonymous> (C:\Projects\loginAICSPortal\src\lib\authz\permissions.test.ts:34:17)
(fail) permissions mirror > import-lint: the module source has no imports and no server references [0.72ms]

 156 pass
 1 fail

Key error line: readFileSync(...).pathname, path resolved to
/C:/Projects/loginAICSPortal/src/lib/authz/permissions.ts -> ENOENT.
On Windows, the pathname of a file:// URL yields a "/C:/..." form that node's
fs rejects; on POSIX it happens to coincide with a valid absolute path, so
this test passes on POSIX machines only. Unrelated to onboarding changes:
the scanned file permissions.ts is pure constants and has zero onboarding
references.

## 2. The same defect exists at the pinned baseline (proven mechanically)

The failing expression at gate HEAD reads:

    readFileSync(new URL('./permissions.ts', import.meta.url).pathname, 'utf8')

    git show 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f:src/lib/authz/permissions.test.ts
returns the identical line:

        const src = readFileSync(new URL('./permissions.ts', import.meta.url).pathname, 'utf8')

The defect is in the TEST's own path construction, unchanged since the
pinned baseline; on this Windows box the same readFileSync therefore ENOENTs
identically at the baseline (deterministic, platform-level). The full
baseline text of the line above is captured at runtime by this script into
quality-gates.log.

## 3. The test's intended invariant (quoted verbatim from the committed test source)

        const src = readFileSync(new URL('./permissions.ts', import.meta.url).pathname, 'utf8')
    // No import statements at all (pure constants module).
    expect(src).not.toMatch(/^import\s/m)
    expect(src).not.toMatch(/^export\s+.*from\s/m)
    // No server module references anywhere.
    expect(src).not.toContain('@/lib/mongodb')
    expect(src).not.toContain('@/lib/session')
    expect(src).not.toContain('@/lib/authz')
    expect(src).not.toContain('server-only')
  })

## 4. Replacement verification performed by this gate script

The same assertions, applied to the same file read as plain UTF-8 from the
workspace path (no URL resolution involved):

    const permsSrc = readFileSync(resolve(WT, 'src/lib/authz/permissions.ts'), 'utf8')
    const permsClean =
      !/^import\s/m.test(permsSrc) &&
      !/^export\s+.*from\s/m.test(permsSrc) &&
      !permsSrc.includes('@/lib/mongodb') &&
      !permsSrc.includes('@/lib/session') &&
      !permsSrc.includes('@/lib/authz') &&
      !permsSrc.includes('server-only')

## 5. Equivalence analysis (explicit, not an automatic pass)

- Constant under test: IDENTICAL file (src/lib/authz/permissions.ts).
- Assertions: TRANSCRIBED 1:1 (regex literals and membership checks copied
  from the quoted test source above, not paraphrased).
- Environment difference: unavoidable but not invariant-relevant - bun's
  file: URL vs the workspace-absolute path resolve to the same bytes; the
  invariant is about FILE CONTENT, which both reads see identically.

**Verdict: the invariant itself is FULLY VERIFIED at source level for this
gate run.** What is NOT equivalent is the future-proofing of the repo's own
suite: the bun suite still cannot execute the assertion on Windows until its
path construction is fixed (one-line recommendation for the owner, their
decision, NOT applied here because it touches an owner authz test file:
replace '.pathname' with fileURLToPath(url)). Accordingly:
- J2 verdict recorded: suite executed 156 pass / 1 fail; the 1 fail is
  declared FAILING-AT-SUITE-LEVEL (pre-existing, baseline-identical,
  Windows-only) and the invariant PASS is attributed to the gate's source
  verification, documented here - the failing test is NOT counted as green.
