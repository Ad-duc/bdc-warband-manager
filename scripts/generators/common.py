"""
File:     scripts/generators/common.py
Role:     Helpers shared by the faction data generators: reading the French
          translation (sections, paragraphs, bullet rules, spells, armoury
          lists), building entries in the src/data JSON format and writing
          the files.
Author:   Adrien Duclaud
Created:  2026-10-12
License:  MIT
"""

import json
import re


def T(en, fr):
    return {"en": en, "fr": fr}


def clean(s):
    """Removes the original terms and the Markdown emphasis of the translation."""
    s = re.sub(r"\s*\(\*[^)]*?\*\)", "", s)
    s = s.replace("**", "")
    s = re.sub(r"(?<![\w])\*([^*]+)\*(?![\w])", r"\1", s)
    return re.sub(r"[ \t]+", " ", s).strip()


def cap(s):
    return s[:1].upper() + s[1:]


def tr(*keys):
    return [{"key": k} for k in keys]


class Source:
    """One translation file, read as lines."""

    def __init__(self, path, name):
        self.md = open(path, encoding="utf8").read().split("\n")
        self.name = name

    def ref(self, page, heading):
        return {"page": page, "md": f"{self.name} > {heading}"}

    def section(self, heading, level=3):
        mark = "#" * level + " "
        start = next(i for i, l in enumerate(self.md) if l.startswith(mark + heading))
        end = next(
            (i for i in range(start + 1, len(self.md)) if re.match(r"^#{1,%d} " % level, self.md[i])),
            len(self.md),
        )
        return self.md[start + 1 : end]

    @staticmethod
    def paragraphs(lines):
        out = []
        for l in lines:
            if not l.strip() or l.startswith("|") or l.startswith(">") or l.startswith("---"):
                continue
            out.append(clean(l))
        return out

    @staticmethod
    def quote_of(lines):
        q = [l for l in lines if l.startswith("> ")]
        return clean(q[0][2:]).strip('"') if q else None

    def bold_rule(self, heading, rule_fr):
        """Text of '**Rule :** text' and what follows, up to the next bold rule line."""
        lines = self.section(heading)
        out, on = [], False
        for raw in lines:
            if not raw.strip() or raw.startswith(">") or raw.startswith("|"):
                continue
            c = clean(raw)
            if raw.startswith("**") and on:
                break
            if raw.startswith("**") and c.startswith(rule_fr + " :"):
                on = True
                rest = c[len(rule_fr) + 2 :].strip()
                if rest:
                    out.append(cap(rest))
                continue
            if on:
                out.append(c)
        return "\n".join(out)

    @staticmethod
    def bullet_rule(lines, fr_name, sub_bullets=True):
        """French text of a '- **Name :** text' bullet with its indented continuation."""
        for i, l in enumerate(lines):
            c = clean(l)
            if not (c.startswith("- " + fr_name + " :") or c.startswith("- " + fr_name + " [")):
                continue
            text = re.sub(r"^" + re.escape(fr_name) + r" : ", "", c[2:])
            body = [cap(text)]
            for nxt in lines[i + 1 :]:
                if not nxt.strip():
                    continue
                n = clean(nxt)
                if nxt.startswith("  - "):
                    if sub_bullets:
                        body.append("- " + n[2:])
                elif nxt.startswith("  "):
                    body.append(n)
                elif nxt.startswith("- ") and "[Action bonus]" in n:
                    body.append(n[2:])
                else:
                    break
            return "\n".join(body)
        raise KeyError(fr_name)

    @staticmethod
    def sub_bullets(lines, fr_name):
        """Sub-bullets ('  - ...') under the '- **Name :**' bullet."""
        out, on = [], False
        for l in lines:
            c = clean(l)
            if c.startswith("- " + fr_name + " :"):
                on = True
                continue
            if on and l.startswith("  - "):
                out.append(c[2:])
            elif on and l.strip() and not l.startswith("  "):
                break
        return out

    def item_text(self, heading):
        """Rule text and designer's note of an armour or item (first paragraph = type line)."""
        ps = self.paragraphs(self.section(heading))[1:]
        note = [p for p in ps if p.startswith("Note du concepteur :")]
        text = [p for p in ps if not p.startswith("Note du concepteur :")]
        return "\n".join(text), (cap(note[0].split(" : ", 1)[1]) if note else None)

    def spell(self, heading):
        ps = self.paragraphs(self.section(heading))
        main, crit = [], ""
        for p in ps[1:]:
            if p.startswith("Valeur de Lancement") or p.startswith("Rappels des traits") or p.startswith(
                "Voir les règles"
            ):
                continue
            if p.startswith("Lancement critique"):
                crit = cap(p.split(" : ", 1)[1])
                continue
            main.append(p)
        return "\n".join(main), crit

    def armoury_list(self, heading, by_fr):
        entries = []
        for l in self.section(heading):
            cells = [c.strip() for c in l.strip("|").split("|")]
            if not l.startswith("|") or cells[0] == "Nom" or set(cells[0]) <= set("-"):
                continue
            entries.append({"wargearId": by_fr[clean(cells[0])]["id"], "cost": int(re.sub(r"\D", "", cells[1]))})
        return entries

    def names(self, heading):
        names = {}
        for l in self.section(heading):
            cells = [c.strip() for c in l.strip("|").split("|")]
            if l.startswith("|") and re.match(r"^\d0$", cells[0]):
                for col, name in enumerate(cells[1:], start=1):
                    names[f"{cells[0][0]}{col}"] = name
        return names

    def scroll(self, name):
        heading = next(
            l[4:] for l in self.md if l.startswith("### ") and re.sub(r"^0-\d+ ", "", l[4:]) == name
        )
        return self.section(heading)

    @staticmethod
    def wargear_text(lines):
        w = clean(next(l for l in lines if l.startswith("**Équipement :**")).split(":**", 1)[1])
        return cap(w)


def rule(rid, en_name, fr_name, en, fr, tag=None):
    return {"id": rid, "name": T(en_name, fr_name), "tag": tag, "text": T(en, fr)}


def gear(src, gid, en, fr, kind, cost, page, md, **kw):
    return {
        "id": gid,
        "name": T(en, fr),
        "kind": kind,
        "cost": cost,
        "purchasable": kw.get("purchasable", True),
        "profile": kw.get("profile"),
        "traits": kw.get("traits", []),
        "armourValue": kw.get("armour"),
        "armourImprovement": kw.get("improvement", 0),
        "itemKeywords": kw.get("keywords", []),
        "rarity": kw.get("rarity"),
        "requires": None,
        "restrictions": kw.get("restrictions", []),
        "grantsAttack": kw.get("grants"),
        "statModifiers": kw.get("stat_modifiers", {}),
        "weaponImprovements": kw.get("improvements", []),
        "text": kw.get("text"),
        "designerNote": kw.get("note"),
        "sourceRef": src.ref(page, md),
    }


def melee(src, gid, en, fr, cost, a, r, d, c, traits, page, md, **kw):
    prof = {"attacks": a, "rend": r, "damage": d, "critDamage": c}
    return gear(src, gid, en, fr, "melee", cost, page, md, profile=prof, traits=tr(*traits), **kw)


FULL_PLATE_EN = (
    "Fighters equipped with this armour cannot be equipped with two-handed ranged weapons with the exception of a "
    "Brace of Pistols."
)
FULL_PLATE_RESTRICTION = [{"type": "forbid-trait", "kind": "ranged", "trait": "two-handed", "exceptWargearIds": []}]
UNSHAKEABLE_EN = (
    "This fighter ignores the Fear special rule and all rules that would make them scatter (eg. the Scare weapon "
    "trait)."
)

ORDER = ["_header", "schemaVersion", "id", "name", "description", "armouryName", "sourceRef", "assets", "origins",
         "strongholds", "campaignRules", "leaderSuccession", "nameTable", "epithetTable", "fighters", "wargear",
         "armouryLists", "skillTables", "spellLores"]


def to_json(data):
    """JSON text in the key order of the data files, with a blank line before each top-level list.

    Prettier (objectWrap: collapse) then gives the final layout.
    """
    ordered = {k: data[k] for k in ORDER if k in data}
    lines = json.dumps(ordered, ensure_ascii=False, indent=2).split("\n")
    out = []
    for line in lines:
        if re.match(r'^  "[^"]+": \[', line) and out and not out[-1].endswith("{"):
            out.append("")
        out.append(line)
    return "\n".join(out) + "\n"
