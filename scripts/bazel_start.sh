#!/usr/bin/env bash
# bazel_start.sh -- `bazel run //:mishri` convenience wrapper for `npm start`. Same real
# BUILD_WORKSPACE_DIRECTORY escape hatch as scripts/bazel_install.sh's own doc comment -- the
# real bot process needs a real, live network connection to whatever Minecraft server
# config/default.json points at, real npm-installed node_modules, and reads real config off
# disk, none of which belong inside a sandboxed Bazel action.
set -euo pipefail
if [ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]; then
    echo "ERROR: BUILD_WORKSPACE_DIRECTORY not set -- run this via 'bazel run //:mishri', not directly." >&2
    exit 1
fi
cd "${BUILD_WORKSPACE_DIRECTORY}"
exec npm start
