"""
File:     scripts/watch/release.py
Role:     Watches the official Black Death City publications and keeps
          sources/manifest.json in step with them.
            check    probe the website and files.blackdeathcity.com, report
                     anything newer than the manifest (writes nothing tracked)
            fetch    download a rules PDF, extract its text into sources/vo/
                     and make it the current version in the manifest
            mark     record that the translation and the app data now follow
                     a given rules version
Usage:    python3 scripts/watch/release.py check [--json]
          python3 scripts/watch/release.py fetch --version 1.04 [--url <pdf url>]
          python3 scripts/watch/release.py mark --translated 1.04 --app-data 1.04
Exit:     check returns 0 when nothing changed, 10 when a new rules version is
          available, 11 when only secondary files or the site changed, 2 on a
          network failure. Other commands return 0 on success.
Requires: Python 3.10+, standard library only; pdftotext (poppler-utils) for fetch.
Author:   Adrien Duclaud
Created:  2026-10-12
License:  MIT
"""

import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "sources" / "manifest.json"
VO_DIR = ROOT / "sources" / "vo"
CACHE = ROOT / ".cache" / "watch"
USER_AGENT = "bdc-warband-manager release watcher (+https://github.com/Ad-duc/bdc-warband-manager)"
TIMEOUT = 30

# File name patterns tried for a rules version, most likely first.
RULES_PATTERNS = [
    "BlackDeathCity-Playtest-{v}.pdf",
    "BlackDeathCity-{v}.pdf",
    "BlackDeathCity-Rules-{v}.pdf",
]
# Site changelog entries look like "[03.10.2026] Playtest v1.02 is live!".
CHANGELOG_RE = re.compile(r"\[(\d{2}\.\d{2}\.\d{4})\]\s*(?:<[^>]+>\s*)*[^<\[]*?v(\d+\.\d+)\s+is\s+live", re.I)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def load_manifest():
    return json.loads(MANIFEST.read_text(encoding="utf8"))


def save_manifest(data):
    MANIFEST.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf8")


def request(url, method="GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": USER_AGENT})
    return urllib.request.urlopen(req, timeout=TIMEOUT)


def head(url):
    """Returns the fingerprint of a remote file, or None when it does not exist."""
    try:
        with request(url, "HEAD") as resp:
            return {
                "size": int(resp.headers.get("Content-Length", "0")),
                "etag": resp.headers.get("ETag"),
                "lastModified": resp.headers.get("Last-Modified"),
            }
    except urllib.error.HTTPError as err:
        if err.code in (403, 404, 410):
            return None
        raise


def version_key(v):
    major, minor = v.split(".")
    # "1.1" and "1.10" are both read as minor 10, as the author numbers 1.00, 1.01...
    return (int(major), int(minor.ljust(2, "0")))


def candidate_versions(current):
    """Versions worth probing after the current one: next minors, next major."""
    major, minor = version_key(current)
    found = [f"{major}.{minor + n:02d}" for n in range(1, 4)]
    found += [f"{major}.{(minor // 10 + 1) * 10:02d}", f"{major}.{(minor // 10 + 1)}"]
    found += [f"{major + 1}.00", f"{major + 1}.0"]
    return list(dict.fromkeys(found))


def site_versions(base_url):
    """Versions announced in the 'Latest Updates' block of the website."""
    with request(base_url) as resp:
        html = resp.read().decode("utf8", "replace")
    return [{"date": d, "version": v} for d, v in CHANGELOG_RE.findall(html)]


def same_file(a, b):
    if a is None or b is None:
        return a is b
    if a.get("etag") and b.get("etag"):
        return a["etag"] == b["etag"]
    return a.get("size") == b.get("size") and a.get("lastModified") == b.get("lastModified")


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------

def cmd_check(args):
    m = load_manifest()
    base = m["filesBase"]
    current = m["rules"]["version"]
    report = {
        "checkedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "currentVersion": current,
        "newRules": [],
        "currentPdfChanged": False,
        "siteAnnounces": [],
        "resourcesChanged": [],
        "pendingTranslation": m["rules"].get("translatedVersion") != current,
        "pendingAppData": m["rules"].get("appDataVersion") != current,
    }
    try:
        # 1. Same version re-uploaded (silent fix).
        now = head(base + m["rules"]["file"])
        report["currentPdfChanged"] = now is not None and not same_file(now, m["rules"])

        # 2. Website changelog.
        announced = site_versions(m["site"])
        newer_site = [e for e in announced if version_key(e["version"]) > version_key(m.get("siteChangelogLatest", "0.00"))]
        report["siteAnnounces"] = newer_site

        # 3. Newer rules PDF: probe candidates and every version the site announces.
        versions = candidate_versions(current) + [e["version"] for e in announced]
        seen = set()
        for v in sorted(set(versions), key=version_key):
            if version_key(v) <= version_key(current):
                continue
            for pattern in RULES_PATTERNS:
                name = pattern.format(v=v)
                if name in seen:
                    continue
                seen.add(name)
                info = head(base + name)
                if info is not None:
                    report["newRules"].append({"version": v, "file": name, "url": base + name, **info})
                    break

        # 4. Roster, fighter cards, reminder sheet.
        for name, old in m["resources"].items():
            info = head(base + name)
            if not same_file(info, old):
                report["resourcesChanged"].append({"file": name, "url": base + name, "old": old, "new": info})
    except (urllib.error.URLError, TimeoutError) as err:
        print(f"network failure: {err}", file=sys.stderr)
        return 2

    CACHE.mkdir(parents=True, exist_ok=True)
    (CACHE / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_report(report)

    if report["newRules"] or report["currentPdfChanged"]:
        return 10
    if report["siteAnnounces"] or report["resourcesChanged"]:
        return 11
    return 0


def print_report(r):
    print(f"Current rules version: {r['currentVersion']}")
    for n in r["newRules"]:
        print(f"NEW RULES  v{n['version']}  {n['url']}  ({n['size']} bytes, {n['lastModified']})")
    if r["currentPdfChanged"]:
        print("CHANGED    the current rules PDF was re-uploaded with different content")
    for s in r["siteAnnounces"]:
        print(f"SITE       v{s['version']} announced on {s['date']}")
    for c in r["resourcesChanged"]:
        print(f"RESOURCE   {c['file']} changed")
    if r["pendingTranslation"]:
        print("PENDING    the French translation does not follow the current version yet")
    if r["pendingAppData"]:
        print("PENDING    the app data does not follow the current version yet")
    if not (r["newRules"] or r["currentPdfChanged"] or r["siteAnnounces"] or r["resourcesChanged"]):
        print("Nothing new.")


def cmd_fetch(args):
    m = load_manifest()
    version = args.version
    name = Path(args.url).name if args.url else RULES_PATTERNS[0].format(v=version)
    url = args.url or m["filesBase"] + name
    if shutil.which("pdftotext") is None:
        sys.exit("pdftotext not found: install poppler-utils (apt-get install -y poppler-utils).")

    CACHE.mkdir(parents=True, exist_ok=True)
    pdf = CACHE / name
    print(f"downloading {url}")
    digest = hashlib.sha256()
    with request(url) as resp, open(pdf, "wb") as out:
        info = {
            "size": int(resp.headers.get("Content-Length", "0")),
            "etag": resp.headers.get("ETag"),
            "lastModified": resp.headers.get("Last-Modified"),
        }
        while chunk := resp.read(1 << 20):
            digest.update(chunk)
            out.write(chunk)

    # Reading order mode (no -layout): two-column pages come out one column at a
    # time, which keeps paragraphs whole and the diff readable. Pages are split
    # by form feeds.
    text = VO_DIR / f"{Path(name).stem}.txt"
    VO_DIR.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pdftotext", "-enc", "UTF-8", str(pdf), str(text)], check=True)

    old = m["rules"]
    same_version = old["version"] == version
    if not same_version:
        m["history"].insert(0, {k: old[k] for k in ("version", "file", "text", "sha256")})
    m["rules"] = {
        "version": version,
        "file": name,
        "text": str(text.relative_to(ROOT)).replace("\\", "/"),
        "sha256": digest.hexdigest(),
        **info,
        "translatedVersion": old.get("translatedVersion"),
        "appDataVersion": old.get("appDataVersion"),
    }
    m["lastCheck"] = dt.date.today().isoformat()
    save_manifest(m)
    print(f"pdf      {pdf.relative_to(ROOT)}")
    print(f"text     {text.relative_to(ROOT)}")
    print(f"previous {m['history'][0]['text'] if m['history'] else 'none'}")


def cmd_mark(args):
    m = load_manifest()
    if args.translated:
        m["rules"]["translatedVersion"] = args.translated
    if args.app_data:
        m["rules"]["appDataVersion"] = args.app_data
    if args.site:
        m["siteChangelogLatest"] = args.site
    if args.resources:
        for name in m["resources"]:
            info = head(m["filesBase"] + name)
            if info is not None:
                m["resources"][name] = info
    m["lastCheck"] = dt.date.today().isoformat()
    save_manifest(m)
    print(json.dumps(m["rules"], indent=2))


def main():
    parser = argparse.ArgumentParser(description="Black Death City release watcher.")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("check", help="report anything newer than the manifest")
    p.add_argument("--json", action="store_true", help="print the report as JSON")
    p.set_defaults(func=cmd_check)

    p = sub.add_parser("fetch", help="download a rules PDF and extract its text")
    p.add_argument("--version", required=True, help="rules version, eg. 1.04")
    p.add_argument("--url", help="PDF url, when it does not follow the usual name")
    p.set_defaults(func=cmd_fetch)

    p = sub.add_parser("mark", help="record what the repository now follows")
    p.add_argument("--translated", help="version the French translation follows")
    p.add_argument("--app-data", help="version src/data follows")
    p.add_argument("--site", help="latest version seen in the website changelog")
    p.add_argument("--resources", action="store_true", help="store the current roster, cards and sheet fingerprints")
    p.set_defaults(func=cmd_mark)

    args = parser.parse_args()
    sys.exit(args.func(args) or 0)


if __name__ == "__main__":
    main()
