#!/bin/bash
# Bump the Vithanco Obsidian plugin's version and rebuild artifacts.
# Does NOT commit, tag, push, or publish — those are manual on purpose so the
# version bump can be folded into whatever commit makes sense.
#
# Usage:
#   ./release.sh                  # auto patch bump (e.g. 1.0.4 → 1.0.5)
#   ./release.sh --minor          # auto minor bump (e.g. 1.0.4 → 1.1.0)
#   ./release.sh --major          # auto major bump (e.g. 1.0.4 → 2.0.0)
#   ./release.sh <version>        # explicit version (e.g. 1.0.7)
#   VGRAPH_REPO=/path/to/VGraph ./release.sh [args]
#
# What it does:
#   1. Picks the next version (patch unless --minor/--major/explicit given)
#   2. (Optional) Refreshes VGraphWasm.wasm from $VGRAPH_REPO
#   3. Lints and builds main.js with the WASM embedded
#   4. Writes the new version into manifest.json, package.json, versions.json
#   5. Prints the artifacts and the suggested git command — you commit when ready
#
# Prerequisites:
#   - npm (and node_modules; auto-installed on first run)
#   - For publishing to the Obsidian marketplace later: gh CLI + tag + GH Release

set -euo pipefail

# ---- 1. Parse / derive version --------------------------------------------

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR"

CURRENT=$(node -p "require('./manifest.json').version")

ARG="${1:-}"
case "$ARG" in
    ""|--patch) BUMP=patch ;;
    --minor)    BUMP=minor ;;
    --major)    BUMP=major ;;
    v*)
        echo "Error: version must not start with 'v' (Obsidian rejects 'v'-prefixed tags)"
        exit 1
        ;;
    *)
        if ! [[ "$ARG" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Error: version must be semver (e.g. 1.0.1) or one of --patch/--minor/--major, got '$ARG'"
            exit 1
        fi
        BUMP=explicit
        VERSION="$ARG"
        ;;
esac

if [[ "$BUMP" != "explicit" ]]; then
    VERSION=$(node -e "
        const [maj, min, pat] = '$CURRENT'.split('.').map(Number);
        const bump = '$BUMP';
        const v = bump === 'major' ? [maj+1, 0, 0]
                : bump === 'minor' ? [maj, min+1, 0]
                :                    [maj, min, pat+1];
        console.log(v.join('.'));
    ")
fi

echo "Bumping $CURRENT → $VERSION  ($BUMP)"

# ---- 2. (Optional) Copy VGraphWasm.wasm from the VGraph monorepo ----------

if [[ -n "${VGRAPH_REPO:-}" ]]; then
    if [[ ! -d "$VGRAPH_REPO" ]]; then
        echo "Error: VGRAPH_REPO ('$VGRAPH_REPO') does not exist."
        exit 1
    fi

    SRC_WASM="$VGRAPH_REPO/website/Package/VGraphWasm.wasm"
    if [[ ! -f "$SRC_WASM" ]]; then
        echo "Error: $SRC_WASM not found. Run 'just build' (or 'just wasm') in the VGraph repo first."
        exit 1
    fi

    cp "$SRC_WASM" ./VGraphWasm.wasm
    echo "VGraphWasm.wasm refreshed from VGRAPH_REPO."
else
    echo "VGRAPH_REPO not set — using the existing VGraphWasm.wasm as-is."
fi

# ---- 3. Lint --------------------------------------------------------------

if [[ ! -d node_modules ]]; then
    echo "Installing dependencies..."
    npm install --silent
fi

echo "Running lint..."
npm run lint --silent

# ---- 4. Write the new version to manifest.json, package.json, versions.json

MIN_APP=$(node -p "require('./manifest.json').minAppVersion")

node -e "
const fs = require('fs');
for (const f of ['manifest.json', 'package.json']) {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    j.version = '$VERSION';
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
const v = JSON.parse(fs.readFileSync('versions.json', 'utf8'));
v['$VERSION'] = '$MIN_APP';
fs.writeFileSync('versions.json', JSON.stringify(v, null, 2) + '\n');
"

# ---- 5. Build -------------------------------------------------------------

echo "Building production bundle..."
npm run build --silent

for f in main.js manifest.json styles.css; do
    if [[ ! -f "$f" ]]; then
        echo "Error: expected artifact '$f' not found after build."
        exit 1
    fi
done

echo ""
echo "Build artifacts:"
for f in main.js manifest.json styles.css VGraphWasm.wasm; do
    SIZE=$(stat -f "%z" "$f" 2>/dev/null || stat -c "%s" "$f")
    printf "  %-18s  %s bytes\n" "$f" "$SIZE"
done

echo ""
echo "✓ Bumped to $VERSION. Commit / tag / publish when you're ready, e.g.:"
echo "    git add manifest.json package.json versions.json VGraphWasm.wasm"
echo "    git commit -m \"chore: bump to $VERSION\""
echo "    git tag $VERSION && git push origin HEAD $VERSION"
echo "    gh release create $VERSION --title $VERSION --notes \"Release $VERSION\" main.js manifest.json styles.css"
