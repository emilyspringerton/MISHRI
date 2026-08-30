#!/usr/bin/env bash
# bazel_test.sh -- real, sandboxable `bazel test` wrapper for tests/humanness.test.js.
#
# Real, deliberate scope: this test only exercises src/humanness/HumannessLayer.js and
# src/core/SkinManager.js, both of which use nothing beyond Node.js built-ins (crypto, https) --
# no mineflayer/network dependency, no `npm install` needed at all. That's what makes it safe to
# run as a real, hermetic, sandboxed `bazel test` action (no network access, no side effects on
# the real workspace) -- unlike :install/:run below, which are deliberately NOT wrapped this way.
#
# TEST_SRCDIR/TEST_WORKSPACE are real, standard Bazel test-runner env vars pointing at this
# test's own real runfiles tree; falling back to a plain relative path covers running this script
# directly (not through `bazel test`) for local debugging.
set -euo pipefail
if [ -n "${TEST_SRCDIR:-}" ] && [ -n "${TEST_WORKSPACE:-}" ]; then
    cd "${TEST_SRCDIR}/${TEST_WORKSPACE}"
fi
exec node tests/humanness.test.js
