#!/usr/bin/env bash
# bazel_install.sh -- `bazel run //:install` convenience wrapper for `npm ci`.
#
# Deliberately NOT a `bazel build`/`bazel test` action: real `npm install`/`npm ci` needs real
# network access to fetch mineflayer + its own dependency tree, which a real, sandboxed Bazel
# action doesn't get (and shouldn't -- side-effecting `node_modules` installation isn't a
# hermetic build output). `bazel run` targets get BUILD_WORKSPACE_DIRECTORY, a real, standard
# Bazel env var pointing at the actual source tree (not a sandboxed copy) -- exactly the real
# escape hatch this kind of non-hermetic step is meant to use.
set -euo pipefail
if [ -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]; then
    echo "ERROR: BUILD_WORKSPACE_DIRECTORY not set -- run this via 'bazel run //:install', not directly." >&2
    exit 1
fi
cd "${BUILD_WORKSPACE_DIRECTORY}"
exec npm ci
