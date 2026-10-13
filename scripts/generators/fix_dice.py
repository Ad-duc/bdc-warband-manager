"""
File:     scripts/generators/fix_dice.py
Role:     Writes every die with its number of dice in the French translation
          (sources/fr/*.md) and in the texts of the data files
          (src/data/*.json): "D6" -> "1D6". Machine fields such as "dice":
          "d6" are left as they are. Run it after importing a new
          translation; check-data reports any die left without its count.
Usage:    npm run fix:dice [-- --check]
Author:   Adrien Duclaud
Created:  2026-10-13
License:  MIT
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from dice import fix_json_text, with_dice_count  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description="Write every die with its number of dice.")
    parser.add_argument("--check", action="store_true", help="fail if a file would change, write nothing")
    args = parser.parse_args()

    targets = [(p, with_dice_count) for p in sorted((ROOT / "sources" / "fr").glob("*.md"))]
    targets += [(p, fix_json_text) for p in sorted((ROOT / "src" / "data").glob("*.json"))]
    changed = []
    for path, fix in targets:
        text = path.read_text(encoding="utf8")
        fixed = fix(text)
        if fixed != text:
            changed.append(path.relative_to(ROOT).as_posix())
            if not args.check:
                path.write_text(fixed, encoding="utf8")
    if args.check and changed:
        sys.exit("Dice without their count in: " + ", ".join(changed))
    for name in changed:
        print(f"fixed {name}")
    if not changed:
        print("Every die states its number of dice.")


if __name__ == "__main__":
    main()
