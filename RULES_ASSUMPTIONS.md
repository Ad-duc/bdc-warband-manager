<!--
  File:     RULES_ASSUMPTIONS.md
  Role:     Register of rule readings, data decisions and open questions
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# Rules assumptions

Source: Black Death City playtest v1.02 (VO pages as printed) and the French
translation files. Each entry states what the book says, what the code does, and
whether it is settled (`settled`), an assumption waiting for a decision
(`open`) or a data decision (`data`).

Status after step 0: entries marked `open` are implemented as described and
will switch with a single flag if the decision changes.

## Recruitment and equipment

### A01 - Rare scope (settled)
p. 28: "This trait limits the number of fighters in a warband that can be
equipped with this type of weapon at the same time."
Code: the limit applies per warband, counted in fighters equipped with the item.

### A02 - Rare on items (open)
Items print "Rare: 0-1" or "Rare 0-1" (Bomb-bolt, Guild Banner, Loyal
Companion, Wooden Stakes, Grappling Hook 0-2) but the Rare definition (p. 28)
only speaks of weapons.
Code: same per-warband reading as A01.

### A03 - One two-handed weapon per fighter, melee and ranged together (settled)
p. 28: "A fighter can only be equipped with 1 two-handed weapon." The sentence
does not distinguish melee from ranged.
Code: literal reading, an error as soon as a fighter carries two two-handed
weapons of any kind. Consequence: Halberd + Crossbow or Spear + Long Bow are
refused. Decision 2026-10-12: literal reading confirmed.

### A04 - Off-hand weapon carried with a two-handed weapon (settled)
p. 24 and p. 28 only forbid off-hand attacks while a two-handed weapon is
equipped; nothing forbids carrying the off-hand weapon (it stays usable as the
main melee weapon if the two-handed one is a ranged weapon).
Code: warning, not error. Decision 2026-10-12: warning confirmed.

### A05 - Carrying limit and held items (settled)
p. 13: 2 melee weapons, 1 ranged weapon, 1 set of armour, 2 items.
p. 15 and p. 60: held items (Shield, Guild Banner, Lantern/Torch) count as melee
weapons, not items. A held item with a two-handed melee weapon is allowed with
-1 Attacks on that weapon (computed modifier). A held item with a two-handed
ranged weapon is forbidden (error).

### A06 - Full-plate (settled)
p. 59: no two-handed ranged weapon except the Brace of Pistols. Encoded as a
`forbid-trait` restriction.

### A07 - Bomb-bolt (settled)
p. 59: requires a Crossbow, not the Arbalest (translator note p. 59).

### A08 - Recruitment skills (settled)
Guild Captain 2, Noble Duellist + 1, Witch Hunter 1, Guild Champion 1, every
other profile 0. Picked skills can come from any table the fighter is eligible
for, Veteran Skills included. The Noble's Duellist counts for the No Duplicates
rule (p. 49): no other fighter can take Duellist while he is in the warband.

### A09 - Signature spells (open)
The No Duplicates rule covers skills only. The High Wizard picks 2 distinct
spells. Two casters may share the same signature spell (info message only).

### A10 - Leader in campaign mode (open)
The origin imposes the leader at the start of the campaign only. In campaign
mode the code accepts the imposed leader or a champion promoted through the
faction `leaderSuccession` table.

### A11 - Warband rating of a free recruit (settled)
p. 48: rating = silver cost of all fighters and wargear + experience. Eager to
Prove (Guild Barracks) recruits a Guild Recruit for 0 silver.
Code: the rating uses the profile cost (30), the silver actually paid is kept
in `recruitCostPaid` and only affects the stash. Decision 2026-10-12:
profile cost confirmed.

### A12 - Fighters without a weapon (settled)
p. 24: a fighter without a melee weapon uses the Unarmed Strike. The app warns
but does not block. The Hunting Dog always has its Vicious Bite and no list.

### A13 - Hunting Dog skills (open, campaign only)
Soldier's Cunning reads "Any Mercenary" and the Hunting Dog has the Mercenary
keyword, Veteran Skills read "Any fighter". Code: literal reading, the dog is
eligible to both tables.

### A14 - Black Rot (settled for v1.02)
No general rule in the playtest; the roster has 3 boxes. The app keeps a 0-3
counter and warns at 3. Faction rules using Black Rot levels (Blighted
Cloister) will be added with that faction.

### A15 - Jars of Canal Leeches (settled for v1.02)
Roster field without rules. Stored as a counter in the stash, excluded from the
warband rating like the rest of the stash.

### A16 - Ranged weapon warning for one-use weapons (settled)
The brief asked for a warning on "ranged weapons without possible reload".
Decision 2026-10-12: an info message on weapons with the One-use trait
(Fire Bombs): 1 attack per battle (p. 27).

## Data decisions

### D01 - Number of Guild Mercenaries profiles (data)
The book lists 13 profiles (4 leaders, 5 champions, 2 henchmen, 1 brute,
1 beast). The step 0 brief said 12.

### D02 - French texts without the original terms (data)
The translation files write every game term as "bande (*warband*)". The JSON
keeps clean French text; the original term is shown in the interface through
the keyword and trait tables.

### D03 - English typos fixed in the data (data)
"a attack" (Blessed by the Saints), "it's Rend" and "to ignited" (Flaming
Weapon), "actionmust" (Point Blank Shot), "[1o+]" (Will of The Saints), the
long s in the quotes. "Torchlight/Lantern" is stored as "Lantern/Torch", the
list spelling. "Chapter house" is stored as "Chapter House".

### D04 - Club/Mace/Hammer (data)
One wargear entry. The rules chapter example (p. 14) calls it "Club" with the
same profile.

### D05 - Accent colour per faction (settled)
The brief asks for one accent colour per faction; the style guide
(CHARTE_GRAPHIQUE_BDC.md, section 2) forbids any colour, including to tell
factions apart. Decision 2026-10-12: strict grayscale everywhere, factions are
told apart by their shield and name. `assets.accentColor` stays null.

### D06 - Wizard and Witch Hunter keyword names (data)
"Witch Hunter" and "Mercenary" stay in English in French (glossary). "Wizard"
becomes "Sorcier", "Priest" "Prêtre", "Dog" "Chien", "Aristocrat"
"Aristocrate".

### D07 - Recruitment steps (data)
The book numbers "Step 5" twice (p. 48). The app uses 6 steps as listed p. 47.
