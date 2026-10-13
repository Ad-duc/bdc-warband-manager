"""
File:     scripts/generators/dice.py
Role:     Dice notation of the data and translation files: every roll states
          its number of dice ("D6" -> "1D6", "d3+1" -> "1D3+1", "2d6" ->
          "2D6", "+1 D6" -> "+1D6"). D66 tables keep their name. Same rule as
          src/i18n/dice.ts.
Author:   Adrien Duclaud
Created:  2026-10-13
License:  MIT
"""

import re

BARE_DIE = re.compile(r"(?<![A-Za-z0-9])[dD](3|6|12)(?=x\d|[^0-9A-Za-z]|$)")
# A count separated from its die: "+1 D6".
SPACED_COUNT = re.compile(r"(?<![A-Za-z0-9])(\d+) [dD](3|6|12)(?=x\d|[^0-9A-Za-z]|$)")
LOWER_COUNTED_DIE = re.compile(r"(?<![A-Za-z0-9])(\d+)d(3|6|12)(?=x\d|[^0-9A-Za-z]|$)")
# Any JSON string that is not a key, for the interface and print text files.
JSON_STRING = re.compile(r'"((?:[^"\\]|\\.)*)"(\s*:)?')
# Displayable strings of the JSON data files: localized texts and translation headings.
TEXT_FIELD = re.compile(r'("(?:en|fr|md)": ")((?:[^"\\]|\\.)*)"')


def with_dice_count(text):
    text = SPACED_COUNT.sub(r"\1D\2", text)
    return BARE_DIE.sub(r"1D\1", LOWER_COUNTED_DIE.sub(r"\1D\2", text))


def fix_json_text(text):
    """Applies the rule to the "en", "fr" and "md" strings of a JSON file only."""
    return TEXT_FIELD.sub(lambda m: m.group(1) + with_dice_count(m.group(2)) + '"', text)


def fix_json_values(text):
    """Applies the rule to every string value of a JSON file, never to its keys."""
    # Strings are matched one after the other; a string followed by ":" is a key.
    return JSON_STRING.sub(
        lambda m: m.group(0) if m.group(2) is not None else '"' + with_dice_count(m.group(1)) + '"', text
    )


def fix_value(value, key=None):
    """Applies the rule to the "en", "fr" and "md" strings of a JSON value."""
    if isinstance(value, dict):
        return {k: fix_value(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [fix_value(v, key) for v in value]
    if isinstance(value, str) and key in ("en", "fr", "md"):
        return with_dice_count(value)
    return value
