"""
File:     scripts/generators/generate.py
Role:     Rebuilds src/data/<faction>.json for the Verminkin, the Death Covens
          and The Blighted Cloister from the French translation files, then
          formats them with Prettier. The Guild Mercenaries and common.json
          are kept by hand and never overwritten.
Usage:    npm run generate:data [-- --sources "<Traduction FR folder>"] [--only verminkin]
          The folder defaults to sources/fr; BDC_SOURCES or --sources override it.
Author:   Adrien Duclaud
Created:  2026-10-12
License:  MIT
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import blighted_cloister  # noqa: E402
import death_covens  # noqa: E402
import verminkin  # noqa: E402
from common import to_json  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src" / "data"

# faction id -> (module, translation file)
FACTIONS = {
    "verminkin": (verminkin, "07_verminkin.md"),
    "death-covens": (death_covens, "08_death-covens.md"),
    "the-blighted-cloister": (blighted_cloister, "09_the-blighted-cloister.md"),
}


def main():
    parser = argparse.ArgumentParser(description="Rebuild faction data from the French translation.")
    parser.add_argument("--sources", default=os.environ.get("BDC_SOURCES") or str(ROOT / "sources" / "fr"),
                        help="Traduction FR folder (default: sources/fr)")
    parser.add_argument("--only", choices=sorted(FACTIONS), help="rebuild a single faction")
    parser.add_argument("--check", action="store_true", help="fail if a file would change, write nothing")
    args = parser.parse_args()
    if args.sources is None or not Path(args.sources).is_dir():
        sys.exit("A --sources folder (or BDC_SOURCES) holding the translation files is required.")

    written = []
    changed = []
    for faction_id, (module, md_name) in FACTIONS.items():
        if args.only is not None and faction_id != args.only:
            continue
        md_path = Path(args.sources) / md_name
        if not md_path.is_file():
            sys.exit(f"{md_name} not found in {args.sources}")
        text = to_json(module.build(str(md_path)))
        target = DATA / f"{faction_id}.json"
        if args.check:
            # Compare after formatting, through a temporary file next to the target.
            tmp = target.with_suffix(".generated.json")
            tmp.write_text(text, encoding="utf8")
            prettier([tmp])
            if tmp.read_text(encoding="utf8") != target.read_text(encoding="utf8"):
                changed.append(target.name)
            tmp.unlink()
            continue
        target.write_text(text, encoding="utf8")
        written.append(target)

    if args.check:
        if changed:
            sys.exit("Out of date: " + ", ".join(changed))
        print("All generated files are up to date.")
        return
    prettier(written)
    for path in written:
        print(f"written {path.relative_to(ROOT)}")


def prettier(paths):
    """Formats the files with the project Prettier (same options as the repository)."""
    npx = shutil.which("npx")
    if npx is None:
        sys.exit("npx not found: install Node.js, then run npm ci.")
    subprocess.run([npx, "prettier", "--write", *[str(p) for p in paths]], cwd=ROOT, check=True,
                   stdout=subprocess.DEVNULL)


if __name__ == "__main__":
    main()
