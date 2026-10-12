"""
File:     scripts/watch/diff_versions.py
Role:     Compares the extracted text of two rules versions (sources/vo/*.txt)
          paragraph by paragraph and writes a Markdown report: every changed,
          added or removed paragraph with its PDF page in both versions and a
          word level view of the change. The report is the starting point of
          the translation update; it is not a changelog by itself.
Usage:    python3 scripts/watch/diff_versions.py                 (previous vs current, from the manifest)
          python3 scripts/watch/diff_versions.py OLD.txt NEW.txt [--out report.md] [--min-ratio 0.98]
Output:   .cache/watch/diff-<old>-<new>.md by default; the summary goes to stdout.
Author:   Adrien Duclaud
Created:  2026-10-12
License:  MIT
"""

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "sources" / "manifest.json"
CACHE = ROOT / ".cache" / "watch"


def paragraphs(path):
    """Splits a pdftotext file into (pdf_page, normalised_paragraph) items."""
    text = Path(path).read_text(encoding="utf8")
    items = []
    for page_no, page in enumerate(text.split("\f"), start=1):
        for block in re.split(r"\n\s*\n", page):
            # Join lines, mend words cut by a hyphen at the end of a line, squeeze spaces.
            line = re.sub(r"(\w)-\n(\w)", r"\1\2", block)
            line = re.sub(r"\s+", " ", line).strip()
            # A lone page number or an empty block carries nothing.
            if not line or re.fullmatch(r"\d{1,3}", line):
                continue
            items.append((page_no, line))
    return items


def word_diff(old, new):
    """Inline view: [-removed-] {+added+}."""
    a, b = old.split(" "), new.split(" ")
    out = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            out.append(" ".join(a[i1:i2]))
        if tag in ("delete", "replace"):
            out.append("[-" + " ".join(a[i1:i2]) + "-]")
        if tag in ("insert", "replace"):
            out.append("{+" + " ".join(b[j1:j2]) + "+}")
    return " ".join(out)


def pages(items):
    found = sorted({p for p, _ in items})
    if not found:
        return "-"
    return str(found[0]) if len(found) == 1 else f"{found[0]}-{found[-1]}"


def compare(old_items, new_items, min_ratio):
    """Yields change records; near identical paragraphs (spacing, a comma) are kept apart as 'minor'."""
    a = [t for _, t in old_items]
    b = [t for _, t in new_items]
    matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        old_block, new_block = old_items[i1:i2], new_items[j1:j2]
        old_text = " ".join(t for _, t in old_block)
        new_text = " ".join(t for _, t in new_block)
        ratio = difflib.SequenceMatcher(None, old_text, new_text, autojunk=False).ratio() if old_text and new_text else 0
        kind = {"replace": "changed", "delete": "removed", "insert": "added"}[tag]
        yield {
            "kind": "minor" if kind == "changed" and ratio >= min_ratio else kind,
            "oldPages": pages(old_block),
            "newPages": pages(new_block),
            "old": old_text,
            "new": new_text,
            "ratio": round(ratio, 3),
        }


def render(changes, old_name, new_name):
    counts = {k: sum(1 for c in changes if c["kind"] == k) for k in ("changed", "added", "removed", "minor")}
    lines = [
        f"# Rules diff {old_name} > {new_name}",
        "",
        "Produced by scripts/watch/diff_versions.py. Pages are PDF pages (printed page = PDF page - 1).",
        "",
        f"- changed: {counts['changed']}",
        f"- added: {counts['added']}",
        f"- removed: {counts['removed']}",
        f"- minor (wording, punctuation, likely typo fixes): {counts['minor']}",
        "",
    ]
    for title, kinds in (("Changes", ("changed", "added", "removed")), ("Minor changes", ("minor",))):
        lines += [f"## {title}", ""]
        for n, c in enumerate((c for c in changes if c["kind"] in kinds), start=1):
            lines.append(f"### {n}. {c['kind']} - pages {c['oldPages']} > {c['newPages']}")
            lines.append("")
            if c["kind"] in ("changed", "minor"):
                lines += ["```diff", word_diff(c["old"], c["new"]), "```", ""]
            elif c["kind"] == "added":
                lines += ["```text", c["new"], "```", ""]
            else:
                lines += ["```text", c["old"], "```", ""]
    return "\n".join(lines) + "\n", counts


def main():
    parser = argparse.ArgumentParser(description="Paragraph diff of two rules versions.")
    parser.add_argument("old", nargs="?", help="older text file (default: manifest history[0])")
    parser.add_argument("new", nargs="?", help="newer text file (default: manifest current rules)")
    parser.add_argument("--out", help="Markdown report path")
    parser.add_argument("--min-ratio", type=float, default=0.98, help="similarity above which a change is minor")
    args = parser.parse_args()

    if args.old is None or args.new is None:
        m = json.loads(MANIFEST.read_text(encoding="utf8"))
        if not m["history"]:
            sys.exit("No previous version in the manifest.")
        old_path, new_path = ROOT / m["history"][0]["text"], ROOT / m["rules"]["text"]
    else:
        old_path, new_path = Path(args.old), Path(args.new)

    changes = list(compare(paragraphs(old_path), paragraphs(new_path), args.min_ratio))
    report, counts = render(changes, old_path.stem, new_path.stem)
    out = Path(args.out) if args.out else CACHE / f"diff-{old_path.stem}-{new_path.stem}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf8")
    print(f"{out}: {counts}")


if __name__ == "__main__":
    main()
