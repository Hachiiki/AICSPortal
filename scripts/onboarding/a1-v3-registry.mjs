// Separate trust registry for the owner-approved student-production scope.
// Populate only after reviewing source and independently comparing byte hashes.
export const REVIEWED_A1_V3_PRODUCERS = Object.freeze({
  'eff10ad5670996354784839ab953bc135a8553c9eeafa55485b51dce4a359e4f': {
    kind: 'isolated-student-v3', reviewedOn: '2026-11-05',
    review: 'Closure source review of the nine archived producer files, including request guards, owned cleanup and corrected timing helper. Executing Node hashes independently match PowerShell/.NET hashes. Identity registration only; A1 and performance outcomes remain separate.',
  },
  '10ce67cf38447f0a8fc3aa337d78ffe6d56c76ab87acdbe152bdf69c0410fbc1': {
    kind: 'isolated-student-v3', reviewedOn: '2026-11-03',
    review: 'Agent-reviewed completion response synchronization and baseline/execution manifests; independent Node and PowerShell/.NET identities agree. Registration does not approve an outcome.',
  },
  'bcb30b92030de14830e1024857f1318cbbdef57ed3d9a15af21a723f8c484eb5': {
    kind: 'isolated-student-v3', reviewedOn: '2026-11-03',
    review: 'Agent source review; independent Node crypto and PowerShell/.NET byte identities agree. Registration does not approve an outcome.',
  },
})
