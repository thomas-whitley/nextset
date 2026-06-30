#!/usr/bin/env python3
"""PostToolUse hook: run tsc --noEmit after editing .ts/.tsx files."""
import sys, json, subprocess, os

d = json.load(sys.stdin)
path = d.get("file_path", "")

if not (path.endswith(".ts") or path.endswith(".tsx")):
    sys.exit(0)

project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
result = subprocess.run(
    ["npx", "tsc", "--noEmit"],
    capture_output=True,
    text=True,
    cwd=project_root,
)

output = (result.stdout + result.stderr).strip()
if output:
    # Show last 40 lines to avoid flooding
    lines = output.splitlines()
    print("\n".join(lines[-40:]))

sys.exit(result.returncode)
