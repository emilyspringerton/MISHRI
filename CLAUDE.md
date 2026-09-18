# MISHRI

## What this is

A human-like Minecraft bot (mineflayer-based), forked from
[arpitrajjj/Mishri](https://github.com/arpitrajjj/Mishri) — arpitrajjj is external to this
organization, not a member of the EINHORN_INDUSTRIAL team. Intended for use against this org's own
`EINHORN_SURVIVAL` server; use at your own risk. `package.json` declares an ISC license, but no
`LICENSE` file is present in this fork, so the actual terms are ambiguous rather than formally
established — see `README.md`'s own "Author & License" section before redistributing or relying on
this code's licensing.

## Stack

TypeScript (compiled via `tsc` to CommonJS, `src/`/`tests/` → `dist/`), `mineflayer` + plugin
ecosystem (pathfinder, pvp, auto-eat, collectblock, tool). Real, layered architecture:
`src/core/MishriBot.ts` (main bot class) →
`src/{movement,perception,social,behavior,skills,humanness}/` (one manager per concern) — see
`README.md`'s own "Architecture" diagram. `src/types/` holds the shared `MishriConfig` shape
(`config.ts`) and an ambient shim for `mineflayer-pathfinder` (`mineflayer-pathfinder.d.ts`,
the one plugin in the ecosystem here with no upstream `.d.ts` of its own).

**Build: Bazel** (`bazel run //:install` → `bazel run //:build` (real `tsc` compile) →
`bazel test //:test` — real, hermetic humanness-layer + skin-manager coverage against the
already-compiled `dist/`; `bazel run //:mishri` wraps the real, non-hermetic `npm start`). See
`README.md`'s own "Build" section and `BUILD.bazel`'s own doc comments for the real
hermetic/non-hermetic split.

## Related Repos

- `EINHORN_SURVIVAL` — the real server this bot is intended to connect to.
- `EMILY` — RSI loop / backlog coordination for cross-repo work.

## Founder Real-Time Direction

Whenever the founder gives real-time direction — a new ask, a correction, a "can we also..." —
route it through `emily observe -s info "Founder real-time: <summary>"` first, even if it isn't
this repo's usual domain, then sprint-plan it into `EMILY/BACKLOG.md` (`emily backlog curate`,
scoped into a real SECTION/sub-item, not just a one-line log), and only then implement. See
`EMILY/docs/THE_EMILY_WAY.md` Principle 18 ("Pave the Cow Paths").

## Apple Filing Protocol

After any meaningful change, file an Apple:
```bash
emily apples post -t completion -repo MISHRI "<title>" "<body with commit hash>"
```
Then mark the item done in `EMILY/BACKLOG.md` and commit.

## CHANGELOG Protocol

After any meaningful change, update CHANGELOG.md:
```bash
emily changelog add MISHRI "<what changed>"
# or manually: append a dated bullet under ## YYYY-MM-DD in MISHRI/CHANGELOG.md
```

## README Reality — SAGA reconciliation (standing instruction, monorepo-wide)

Founder real-time, 2026-09-18: if a change of yours **substantially changes the claim of this project's core README**,
then per SAGA protocols (`EMILY/docs/SAGA_SYSTEM_AUDIT_2026-07-18.md`, HQ-SPEC-DOC-102: intent ↔ claim ledger ↔ reality)
you **must update `README.md` in the same unit of work** so it reflects current reality. The README is the project's public
claim; it must not lag behind the code.

- **When it applies:** a capability is added or removed; status moves ("design only" → "working", "planned" → "shipped");
  the stack, build, run or install steps change; a claim in the README is now false or stale; or you add a **meaningful,
  genuinely interesting piece of kit** (a new tool, engine capability, protocol, pipeline, game system). For that last case
  especially: put it in the README — what it is, how to run it, and its honest status and limits.
- **When it does not:** ordinary fixes, refactors and small features that leave the README's claims true.
- **How:** re-read the README against what you just changed; fix or delete stale lines (including "not built yet" notes that
  are now built); verify any new claim by actually running it, and mark anything untested as untested; commit the README
  with (or immediately after) the change, and mention it in the CHANGELOG entry.

## Frame-Break Reframing

Founder-sourced prompting technique (REDGARDEN/NORTHSTAR.md §28, full origin in
REDGARDEN/docs2/MULTI_AGENT_RD_RESEARCH_NOTES.md §5): given a request, name the underlying
structural/systemic pattern it's one instance of — one level of abstraction up — as an added
lens during planning/triage/judgment calls. Use it to spot the general case behind a specific
ask. It augments judgment, it does not replace doing the work: direct, concrete execution of
the literal task asked for still happens every time.

## Commit Protocol (standing instruction)

Always commit and push completed work immediately — don't wait to be asked. This is the default for every repo in this monorepo.

Every commit — human-written or produced by automated code paths (git-commit helpers in emily-agent, emily.cli, IDUNA handlers, etc.) — must carry the active `emily session` fingerprint as a `session: <tag>` trailer (blank line, then the trailer). This was silently missing from several independently-implemented automated commit helpers across the monorepo until an audit on 2026-08-10 (founder, real-time: "where in the fuck is my llm session id anywhere"). If you add a new automated git-commit code path anywhere, wire in the session tag the same way — don't assume an existing helper already does it.
