#!/usr/bin/env python3
"""PreToolUse hook: block edits to .env files."""
import sys, json

d = json.load(sys.stdin)
path = d.get("file_path", "")
basename = path.split("/")[-1]

if basename == ".env" or (basename.startswith(".env.") and not basename.endswith(".example")):
    print(f"Blocked: {path} contains live credentials. Edit manually or use .env.example.", file=sys.stderr)
    sys.exit(2)

sys.exit(0)
