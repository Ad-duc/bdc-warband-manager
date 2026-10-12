<!--
  File:     RULES_ASSUMPTIONS.md
  Role:     Register of rule readings, data decisions and open questions
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# Rules assumptions

Source: Black Death City playtest v1.03 (VO pages as printed) and the French
translation files (version updated for v1.03, glossary version 5). Each entry states what the book says, what the code does, and
whether it is settled (`settled`), an assumption waiting for a decision
(`open`) or a data decision (`data`).

Status after step 0: entries marked `open` are implemented as described and
will switch with a single flag if the decision changes.

## Recruitment and equipment

### A01 - Rare scope (settled)

p. 30: "This trait limits the number of fighters in a warband that can be
equipped with this type of weapon at the same time."
Code: the limit applies per warband, counted in fighters equipped with the item.

### A02 - Rare on items (open)

Items print "Rare: 0-1" or "Rare 0-1" (Bomb-bolt, Guild Banner, Loyal
Companion, Wooden Stakes, Grimoire, Grappling Hook 0-2) but the Rare definition (p. 30)
only speaks of weapons.
Code: same per-warband reading as A01.

### A03 - One two-handed weapon per fighter, melee and ranged together (settled)

p. 30: "A fighter can only be equipped with 1 two-handed weapon." The sentence
does not distinguish melee from ranged.
Code: literal reading, an error as soon as a fighter carries two two-handed
weapons of any kind. Consequence: Halberd + Crossbow or Spear + Long Bow are
refused. Decision 2026-10-12: literal reading confirmed.

### A04 - Off-hand weapon carried with a two-handed weapon (settled)

p. 23 and p. 30 only forbid off-hand attacks while a two-handed weapon is
equipped; nothing forbids carrying the off-hand weapon (it stays usable as the
main melee weapon if the two-handed one is a ranged weapon).
Code: warning, not error. Decision 2026-10-12: warning confirmed.

### A05 - Carrying limit and held items (settled)

p. 13: 2 melee weapons, 1 ranged weapon, 1 set of armour, 2 items.
p. 15 and p. 62: held items (Shield, Guild Banner, Lantern/Torch) count as melee
weapons, not items. A held item with a two-handed melee weapon is allowed with
-1 Attacks on that weapon (computed modifier). A held item with a two-handed
ranged weapon is forbidden (error).

### A06 - Full-plate (settled)

p. 61: no two-handed ranged weapon except the Brace of Pistols. Encoded as a
`forbid-trait` restriction.

### A07 - Bomb-bolt (settled)

p. 61: requires a Crossbow, not the Arbalest (translator note p. 61). Since
v1.03 the item no longer modifies the Crossbow: it gives its own ranged profile
(20", 1, -1, d3+1, -, Blast) usable once per battle. The app shows it as an
extra ranged weapon line.

### A08 - Recruitment skills (settled)

Guild Captain 2, Noble Duellist + 1, Witch Hunter 1, Guild Champion 1, every
other profile 0. Picked skills can come from any table the fighter is eligible
for, Veteran Skills included. The Noble's Duellist counts for the No Duplicates
rule (p. 51): no other fighter can take Duellist while he is in the warband.

### A09 - Signature spells (open)

The No Duplicates rule covers skills only. The High Wizard picks 2 distinct
spells. Two casters may share the same signature spell (info message only).

### A10 - Leader in campaign mode (open)

The origin imposes the leader at the start of the campaign only. In campaign
mode the code accepts the imposed leader or a champion promoted through the
faction `leaderSuccession` table, flagged with `promotedToLeader` on the
fighter. A promoted fighter counts as the Leader for the composition limits
and gains the Leader keyword for skill eligibility.

### A11 - Warband rating of a free recruit (settled)

p. 50: rating = silver cost of all fighters and wargear + experience. Eager to
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

### A14 - Black Rot (settled for v1.03)

No general rule in the playtest; the roster has 3 boxes. The app keeps a 0-3
counter and warns at 3. Faction rules using Black Rot levels (Blighted
Cloister) will be added with that faction.

### A15 - Jars of Canal Leeches (settled for v1.03)

Roster field without rules. Stored as a counter in the stash, excluded from the
warband rating like the rest of the stash.

### A16 - Ranged weapon warning for one-use weapons (settled)

The brief asked for a warning on "ranged weapons without possible reload".
Decision 2026-10-12: an info message on weapons with the One-use trait
(Fire Bombs): 1 attack per battle (p. 29).

### A17 - Start of campaign mode (settled)

The book does not say when the recruitment rules stop applying. Decision
2026-10-12: the first battle recorded in the log switches the warband to
campaign mode; undoing that battle switches it back to recruitment.

### A18 - Purchases during the campaign (open)

Chapter 5 (income, trading) is not published. Fighters and wargear added in
campaign mode are not taken from the stash automatically: the stash silver is
edited by hand, or entered as negative silver in a battle.

### A19 - Fighters lost in battle (open)

"Fighters lost" is a roster counter without rules in v1.03. A fighter ticked
as lost in a battle gets the status "dead", leaves the warband rating and is
kept in the "dead or retired" list with its history. The status can be
changed by hand (eg. back to active once Chapter 5 says a fighter recovers).

### A20 - Injuries and advancements (open)

The lasting injury table and advancements belong to Chapter 5. Both are free
text with optional effects on the characteristics, entered with
"improve" / "worsen" buttons (stored as raw deltas, -1 Blade meaning 4+ to 3+).

## Verminkin

### A21 - Profile limits raised by an origin (settled)

p. 74: Acolytes of Plague "can include 0-2 Pox Priest Apprentices", Sparkseer
Coven "0-2 Rolling Contraptions", while the scrolls print 0-1.
Code: the origin's `profileLimits` replace the scroll limit for that warband
(wizard catalogue and `composition.profileLimit`). The wizard writes the
official profile names (Pox Priest's Apprentice, Rolling-Contraption) rather
than the plural spelling of p. 74.

### A22 - Move value rolled for each move (settled)

p. 92: the Rolling-Contraption has a Move value of 2d6". Code: the Move is
stored as the dice expression "2d6" and displayed 2D6" in French; a Move
modifier is carried by the expression (eg. "2d6-1"), never rolled in advance.

### A23 - Full-plate in the Verminkin Armoury (open)

p. 81 copies the Guild text: no two-handed ranged weapon "with the exception of
a Brace of Pistols", a weapon the Verminkin cannot buy. Code: the restriction
applies to every two-handed ranged weapon, with no exception. Today only
Verminkin Champions, Assassins and Sparkseers can take Full-plate; the
Sparkseer List two-handed guns are therefore refused with it.

### A24 - Wargear changing characteristics and weapons (settled)

Heavy Plating: -1 Move, applied to the displayed and printed characteristics
(Rat-Mutant 5" becomes 4"). Wheel-Spikes: the Crushing Bulk weapon line shows
Rend -2; the Splat! attack stays described in the special rule text.

### A25 - Battle-time effects not tracked (settled)

Engineering points (d3, 3 with Mad Tinkerers), the Giant Rat summoned by a
Bomb Rat, entwined and doomed fighters, the Fighting Pits fight: none of these
is stored on the roster. Fighting Pits experience is entered like any bonus
experience, in the battle log.

### A26 - Rat-Mutant keywords (data)

p. 91 prints "Brute, Verminkin, Ogre": the Ogre keyword is kept. v1.03 removed
Incredible Strength, so the keyword has no effect in the app.

## Data decisions

### D01 - Number of Guild Mercenaries profiles (data)

The book lists 13 profiles (4 leaders, 5 champions, 2 henchmen, 1 brute,
1 beast). The step 0 brief said 12.

### D02 - French texts without the original terms (data)

The translation files write every game term as "bande (_warband_)". The JSON
keeps clean French text; the original term is shown in the interface through
the keyword and trait tables.

### D03 - English typos fixed in the data (data)

"to ignited" (Flaming Weapon), "[1o+]" (Will of The Saints), the long s in
the quotes ("a attack", "it's Rend" and "actionmust" are fixed in v1.03 itself).
Verminkin: "equal or less than than" and "in the template it is hit" (Bomb
Rat), "it's Rend" (Engineer), "doomed ." (Doom), missing final stops (Rickety
Workshop origin, Tunnel from Below). The single "half" character of Shadow
Lurker is written 1/2". "Torchlight/Lantern" is stored as "Lantern/Torch", the
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

The book numbers "Step 5" twice (p. 50). The app uses 6 steps as listed p. 49.

### D08 - Move to playtest v1.03 (data)

Decision 2026-10-12: the app follows v1.03. Changes carried into the data:
blackpowder weapons deal 2 damage; Blast weapons have their former critical
damage as Damage and no critical hits; no ranged weapon has both Heavy and
Reload; Unwieldy is gone from ranged weapons (it stays on melee weapons and in
the trait list); new prices; new Ogre Arbalest in the Ogre List; Grimoire
Rare 0-1; Incredible Strength removed from the Mercenary Ogre; Witch Hunter's
Recite Holy Litanies tagged [Action]; Reload reminder "Forgo a Move or Action
to reload"; Duellist and Shooting Drills reworded. Pages printed from p. 26 on
moved by 2, the off-hand weapon rule moved from p. 24 to p. 23. `npm run
check:data -- --sources` checks every `sourceRef.md` heading against the
translation.

### D09 - Attack tables inside rule texts (data)

Rules that print a small Rend / Damage table in the middle of a text (Bomb
Rat, Splat!) keep it as a sentence at the end of the text: "Rend -2, Damage
d3" / "Perforation -2, Dégâts D3". Spells keep their table in the `attack`
field, as for the Guild Mercenaries.
