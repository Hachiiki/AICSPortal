# Done — closed campaign archive (2026-09-10)

- `qa_reports/` + `qa_evidence/`: auth-hardening campaign 001–017 Fixed-Verified, 018 Observed-accepted. Reports link each other and the evidence folder as siblings — paths are relative, so the move preserved them.
- Entry points: `qa_reports/15_CAMPAIGN_CLOSEOUT.md` (plan + registry table) and `qa_reports/16_GOLIVE_RUNBOOK.md` (go-live steps; smoke table stays blank until the owner runs Vercel smoke).
- `main` is the single source of truth. The `fix/bug-fixes-findings` branch is retired frozen — do not add commits to it.
- Closeout tag `campaign-closeout-2026-09-10` stays on its commit; it was not retagged.
