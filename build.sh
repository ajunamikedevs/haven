#!/bin/sh
# Builds index.html (the GitHub Pages site) from haven.html, the source you edit.
# haven.html has no document shell of its own, so this wraps it in one.
set -e
cd "$(dirname "$0")"
{
cat <<'EOF'
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
:root { color-scheme: light; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
img { max-width: 100%; }
[hidden] { display: none !important; }
</style>
</head>
<body>
EOF
cat haven.html
printf '\n</body>\n</html>\n'
} > index.html
echo "Built index.html"
