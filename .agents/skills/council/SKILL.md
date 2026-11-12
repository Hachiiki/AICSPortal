---
name: council
description: Use when the user explicitly asks for a council or invokes $council for an independent review, audit, or feedback on a decision.
---

# Council

Adapted from [t3dotgg/tstack](https://github.com/t3dotgg/tstack/blob/main/skills/council/SKILL.md). See [LICENSE.txt](LICENSE.txt).

## Prepare the review

Read the repository instructions. Identify the user's question, the files or diff to review, and the relevant checks. For an implementation audit, account for known issues and outstanding PR feedback before assigning reviewers. If the user has authorized fixes, make the known fixes and run the relevant checks first. For a review-only request, include the known issues in the brief and keep the checkout read-only. When exploring replacements, skip fixes to the code being replaced.

## Run independent reviews

- Use the user's named reviewers when available. Report any unavailable named model or provider and continue with the available requested reviewers. If none can run, report that and offer your own review with clear attribution.
- By default, use three strong models from different providers if available. In Codex, if fewer than three providers are available, use three independent native Codex subagents and disclose the providers actually used. Use high reasoning effort where supported. If fewer than three reviewers can run, report the actual count and proceed with the results available.
- In Codex, use `collaboration.spawn_agent` for each reviewer, start them before waiting, and give each a self-contained brief. Use the supported default model if a model override is unavailable. Give reviewers the same question and checkout or diff, with distinct emphasis where helpful, such as correctness, regression coverage, or maintainability. Keep the reviews independent and read-only.
- Ask each reviewer for prioritized findings with evidence, suggested fixes, and unresolved questions. For code reviews, ask for a score out of 10 with a short rationale. If a reviewer is unavailable or fails, record that status. If a reviewer omits a score, record `no score`.
- Verify returned findings against the code while other reviewers work. Keep the reviewed files stable until the round ends. Honor any non-blocking reviewer designated by the user. If their result arrives late, treat it as feedback and omit its score from the round.

## Resolve and report

Summarize verified findings, meaningful disagreements, and recommended next steps. Apply agreed fixes within the user's scope and request a fresh round after material fixes. Count each completed review pass as a round. Stop when the in-scope findings are resolved, or report the remaining disagreements or blockers.

For code reviews, report the round count and a Markdown table with a row per reviewer and a column per round. Label reviewers with their actual model or role and preserve the scores they supplied. Include the results in the final reply. If the task already includes an authorized update to an open PR description, put the same results under `## Council review` there, before the model and harness line when present.
