from pathlib import Path
import shutil
import subprocess

root = Path.cwd()
out = root / "_pages"
out.mkdir(exist_ok=True)
blocked = {"server", "backend", "data", "runtime", "node_modules", "android", "firmware", "hardware", "database", "tools", "scripts", "agent-records", "paypal-sandbox"}
extensions = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2", ".ttf", ".xml", ".webmanifest", ".apk", ".pdf"}
files = subprocess.check_output(["git", "ls-files", "-z"]).decode().split(chr(0))
count = 0
for item in files:
    if not item:
        continue
    rel = Path(item)
    if any(part.startswith(".") or part.lower() in blocked for part in rel.parts):
        continue
    if rel.name in {"config.js", "config.example.js", "package.json", "package-lock.json"}:
        continue
    if rel.suffix.lower() not in extensions and rel.name not in {"CNAME", "robots.txt", "LICENSE", "manifest.json"}:
        continue
    target = out / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / rel, target)
    count += 1
assert (out / "index.html").is_file()
print("Packaged", count, "tracked public assets; backend, local state and configuration excluded.")
