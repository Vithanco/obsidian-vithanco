#!/bin/bash
# Cut a release of the Vithanco Obsidian plugin.
#
# Usage:
#   ./release.sh <version>
#   VGRAPH_REPO=/path/to/VGraph ./release.sh <version>
#
# Examples:
#   ./release.sh 1.0.1
#   VGRAPH_REPO=~/private/swift/VGraph ./release.sh 1.0.2
#
# What it does:
#   1. Validates the version string (semver, no 'v' prefix — Obsidian's rule)
#   2. (Optional) If $VGRAPH_REPO is set, rebuilds VGraph there and refreshes
#      VGraphWasm.wasm so the plugin ships against the latest engine.
#   3. Bumps version in manifest.json, package.json, versions.json
#   4. Runs npm run build to produce main.js with the WASM embedded
#   5. Verifies main.js, manifest.json, styles.css exist
#   6. Commits (incl. updated WASM), tags, pushes
#   7. Creates a GitHub Release with the three files attached as loose assets
#
# Prerequisites:
#   - Run from inside the standalone obsidian-vithanco repo (NOT the VGraph monorepo)
#   - gh CLI authenticated (`gh auth status`)
#   - Working tree clean

set -euo pipefail

# ---- 1. Parse and validate version ----------------------------------------

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
    echo "Usage: $0 <version>"
    echo "       VGRAPH_REPO=/path/to/VGraph $0 <version>   (also refresh WASM)"
    exit 1
fi

if [[ "$VERSION" == v* ]]; then
    echo "Error: version must not start with 'v' (Obsidian rejects 'v'-prefixed tags)"
    exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: version must be semver (e.g. 1.0.1), got '$VERSION'"
    exit 1
fi

# ---- 2. Safety checks -----------------------------------------------------

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR"

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ "$GIT_ROOT" != "$SCRIPT_DIR" ]]; then
    echo "Error: release.sh must be run from the standalone obsidian-vithanco repo root."
    echo "  Script dir: $SCRIPT_DIR"
    echo "  Git root:   ${GIT_ROOT:-<not a git repo>}"
    echo ""
    echo "If you're still in the VGraph monorepo, sync this folder to the standalone repo first."
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: working tree is not clean. Commit or stash changes first."
    git status --short
    exit 1
fi

if git rev-parse "$VERSION" >/dev/null 2>&1; then
    echo "Error: tag '$VERSION' already exists."
    exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
    echo "Error: gh CLI not found. Install from https://cli.github.com/"
    exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
    echo "Error: gh CLI not authenticated. Run: gh auth login"
    exit 1
fi

# ---- 3. (Optional) Refresh VGraphWasm.wasm from the VGraph monorepo -------

if [[ -n "${VGRAPH_REPO:-}" ]]; then
    if [[ ! -d "$VGRAPH_REPO" ]]; then
        echo "Error: VGRAPH_REPO ('$VGRAPH_REPO') does not exist."
        exit 1
    fi
    if [[ ! -x "$VGRAPH_REPO/build.sh" ]]; then
        echo "Error: $VGRAPH_REPO/build.sh not found or not executable."
        exit 1
    fi

    echo "Rebuilding VGraph (release) at $VGRAPH_REPO..."
    (cd "$VGRAPH_REPO" && ./build.sh --release)

    SRC_WASM="$VGRAPH_REPO/website/Package/VGraphWasm.wasm"
    if [[ ! -f "$SRC_WASM" ]]; then
        echo "Error: $SRC_WASM not produced by build.sh."
        exit 1
    fi

    cp "$SRC_WASM" ./VGraphWasm.wasm

    if [[ -n "$(git status --porcelain VGraphWasm.wasm)" ]]; then
        WASM_SIZE=$(stat -f "%z" VGraphWasm.wasm 2>/dev/null || stat -c "%s" VGraphWasm.wasm)
        echo "VGraphWasm.wasm refreshed ($WASM_SIZE bytes) — will be committed with the release."
    else
        echo "VGraphWasm.wasm unchanged."
    fi
else
    echo "VGRAPH_REPO not set — using the committed VGraphWasm.wasm as-is."
    echo "  (Set VGRAPH_REPO to refresh the engine before releasing.)"
fi

# ---- 4. Bump versions in manifest.json, package.json, versions.json -------

MIN_APP=$(node -p "require('./manifest.json').minAppVersion")
echo "Bumping version → $VERSION  (minAppVersion: $MIN_APP)"

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

if [[ ! -d node_modules ]]; then
    echo "Installing dependencies..."
    npm install --silent
fi

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
for f in main.js manifest.json styles.css; do
    SIZE=$(stat -f "%z" "$f" 2>/dev/null || stat -c "%s" "$f")
    printf "  %-15s  %s bytes\n" "$f" "$SIZE"
done
echo ""

# ---- 6. Commit, tag, push -------------------------------------------------

git add manifest.json package.json versions.json VGraphWasm.wasm
git commit -m "Release $VERSION"
git tag "$VERSION"

echo "Pushing commit and tag..."
git push origin HEAD
git push origin "$VERSION"

# ---- 7. Create GitHub release with loose assets ---------------------------

echo "Creating GitHub release..."
gh release create "$VERSION" \
    --title "$VERSION" \
    --notes "Release $VERSION" \
    main.js manifest.json styles.css

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Release $VERSION published"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "If this is your first release, submit to the marketplace:"
echo "  https://github.com/obsidianmd/obsidian-releases (PR to community-plugins.json)"
