## 2026-08-30
- Full TypeScript upgrade: all src/tests .js rewritten as real, typed .ts, tsc build pipeline, Bazel/CI updated; found and fixed 2 real pre-existing bugs (entitySwing->entitySwingArm, dead craftBasic() filter) that plain JS's lack of type-checking had hidden (sess-20260825-1938-f6bd411e)
- Auto-release CI job added (non-prerelease, matching monorepo convention) -- ships the full construct bundle (txt/tar.gz/zip) as the release asset, no compiled binary to attach (sess-20260825-1938-f6bd411e)

- Real Bazel build (bazel test //:test, bazel run //:install/:mishri), CI construct-bundle artifact, honest README author/license acknowledgment, own CLAUDE.md (sess-20260825-1938-f6bd411e)

