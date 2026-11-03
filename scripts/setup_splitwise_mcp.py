"""Build the pinned Splitwise MCP dependency. No account access or third-party install scripts."""
from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import urllib.request
import zipfile

COMMIT = "046eb5745c1031fbdc47444bfd4cfa87f65da303"
ARCHIVE_SHA256 = "6f24c204259374bb7a1ff0330a052b3540aea652779c794cef8ae6ad6d82de90"
LOCK_SHA256 = "6a07584db338460d128f574e52984a64e2a5fa212f9a493907aee6443481528c"
ROOT = Path(__file__).resolve().parents[1] / ".cache" / "splitwise-mcp"
UPSTREAM = ROOT / "upstream"
NODE = Path(r"C:\Program Files\nodejs\node.exe")
NPM = NODE.with_name("npm.cmd")


def main() -> None:
    if not NODE.is_file() or not NPM.is_file():
        raise SystemExit("Install Node >=22 at the documented location before MCP setup.")
    ROOT.mkdir(parents=True, exist_ok=True)
    archive = ROOT / "source.zip"
    if archive.exists():
        data = archive.read_bytes()
    else:
        with urllib.request.urlopen(
            f"https://codeload.github.com/chrischall/splitwise-mcp/zip/{COMMIT}", timeout=30
        ) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != ARCHIVE_SHA256:
            raise SystemExit("Archive hash changed; review required. Nothing executed.")
        archive.write_bytes(data)
    if hashlib.sha256(data).hexdigest() != ARCHIVE_SHA256:
        raise SystemExit("Archive hash mismatch; review required.")
    with zipfile.ZipFile(io.BytesIO(data)) as source:
        for member in source.infolist():
            relative = PurePosixPath(member.filename)
            destination = UPSTREAM.joinpath(*relative.parts[1:])
            if not destination.resolve().is_relative_to(UPSTREAM.resolve()):
                raise SystemExit("Unsafe archive path.")
            if member.is_dir():
                destination.mkdir(parents=True, exist_ok=True)
                continue
            content = source.read(member)
            if destination.exists() and destination.read_bytes() != content:
                raise SystemExit(f"Source differs from reviewed archive: {destination.name}. Review required.")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
    lock_bytes = (UPSTREAM / "package-lock.json").read_bytes()
    if hashlib.sha256(lock_bytes).hexdigest() != LOCK_SHA256:
        raise SystemExit("Lock hash mismatch.")
    lock = json.loads(lock_bytes)
    for name, package in lock["packages"].items():
        if package.get("resolved") and (
            not package["resolved"].startswith("https://registry.npmjs.org/")
            or not package.get("integrity", "").startswith("sha512-")
        ):
            raise SystemExit(f"Unreviewed dependency origin/integrity: {name}")
    if (UPSTREAM / ".npmrc").exists() or (UPSTREAM / ".env").exists():
        raise SystemExit("Remove private/local npm or dotenv configuration from the audit build before setup.")
    # Do not pass credentials, NODE_OPTIONS, proxy overrides or user npm config.
    env = {k: v for k, v in os.environ.items() if k.upper() in {
        "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT", "PROCESSOR_ARCHITECTURE", "PROGRAMFILES"
    }}
    env["PATH"] = str(NODE.parent) + r";C:\Windows\system32;C:\Windows"
    temporary = ROOT / "temp"
    temporary.mkdir(exist_ok=True)
    env["TEMP"] = env["TMP"] = str(temporary)
    for name in ("empty-user.npmrc", "empty-global.npmrc"):
        (ROOT / name).write_text("", encoding="utf-8")
    subprocess.run([
        str(NPM), "ci", "--ignore-scripts", "--no-audit", "--no-fund",
        "--cache", str(ROOT / "npm-cache"),
        "--userconfig", str(ROOT / "empty-user.npmrc"),
        "--globalconfig", str(ROOT / "empty-global.npmrc"),
    ], cwd=UPSTREAM, env=env, check=True, timeout=180)
    subprocess.run([
        str(NODE), str(UPSTREAM / "node_modules/typescript/bin/tsc")
    ], cwd=UPSTREAM, env=env, check=True, timeout=60)
    print("Pinned TypeScript build complete; no key supplied, no account calls.")


if __name__ == "__main__":
    main()
