#!/usr/bin/env bash
# bazel_test.sh -- real, sandboxable `bazel test` wrapper for dist/tests/humanness.test.js.
#
# Runs the already-COMPILED output (see BUILD.bazel's own doc comment on :test for why -- Bazel's
# own sandbox has no network/typescript to run `tsc` itself). Real, deliberate scope: this test
# only exercises HumannessLayer + SkinManager, both of which use nothing beyond Node.js built-ins
# (crypto, https) -- no mineflayer/network dependency at runtime, only at compile time.
#
# TEST_SRCDIR/TEST_WORKSPACE are real, standard Bazel test-runner env vars pointing at this
# test's own real runfiles tree; falling back to a plain relative path covers running this script
# directly (not through `bazel test`) for local debugging.
set -euo pipefail
if [ -n "${TEST_SRCDIR:-}" ] && [ -n "${TEST_WORKSPACE:-}" ]; then
    cd "${TEST_SRCDIR}/${TEST_WORKSPACE}"
fi
exec node dist/tests/humanness.test.js
