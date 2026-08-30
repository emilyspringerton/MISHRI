#!/usr/bin/env bash
# bazel_build.sh -- `bazel run //:build` convenience wrapper for `npm run build` (tsc).
#
# Same real BUILD_WORKSPACE_DIRECTORY escape hatch as scripts/bazel_install.sh's own doc comment:
# a real tsc compile needs real, already-`npm ci`'d node_modules (specifically the `typescript`
# devDependency) and writes real output into dist/ in the actual source tree -- neither belongs
# inside a sandboxed Bazel action. Run this (or plain `npm run build`) before `bazel test //:test`
# -- see BUILD.bazel's own doc comment on :test for why.
set -euo pipefail
if [ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]; then
    echo "ERROR: BUILD_WORKSPACE_DIRECTORY not set -- run this via 'bazel run //:build', not directly." >&2
    exit 1
fi
cd "${BUILD_WORKSPACE_DIRECTORY}"
exec npm run build
