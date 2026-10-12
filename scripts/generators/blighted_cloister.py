"""
File:     scripts/generators/blighted_cloister.py
Role:     Builds The Blighted Cloister faction data from
          09_the-blighted-cloister.md (French texts extracted and cleaned) and
          the English playtest v1.03 texts typed below (typos fixed, see
          RULES_ASSUMPTIONS.md D03).
Author:   Adrien Duclaud
Created:  2026-10-12
License:  MIT
"""

import re
from common import (
    FULL_PLATE_EN,
    FULL_PLATE_RESTRICTION,
    Source,
    T,
    cap,
    clean,
    gear,
    melee,
    rule,
    tr,
)

FILE = "09_the-blighted-cloister.md"


def build(md_path):
    """Returns the faction data built from the translation file."""
    src = Source(md_path, FILE)
    md = src.md

    # ----------------------------------------------------------------------------
    # Faction
    # ----------------------------------------------------------------------------
    intro = [clean(l[2:]) for l in md[2:6] if l.startswith("> ") and l[2:].strip()]
    data = {
        "_header": {
            "file": "src/data/the-blighted-cloister.json",
            "role": "The Blighted Cloister faction data: origins, strongholds, campaign rules, names, epithets, fighters, Cloister Armoury, skills, spell lores",
            "author": "Adrien Duclaud",
            "created": "2026-10-12",
            "license": "MIT for the file structure. Game content belongs to Sam Pearson (Black Death City).",
        },
        "schemaVersion": 1,
        "id": "the-blighted-cloister",
        "name": T("The Blighted Cloister", "The Blighted Cloister"),
        "description": T(
            "The Blighted Cloister are a secretive monastic order of knights and sorcerer-priests who believe the Black "
            "Rot to be not a curse but a blessing bestowed upon the City. Behind the high stone-walls of their abbeys "
            "they nurse the sick and disease-ridden with no intention to cure them. Instead, they are nurtured into "
            "swollen vessels of pestilence and venerated as living saints.\n"
            "Within the Cloister's innermost circles, their creed has descended further into blasphemy. Prayers have "
            "given way to dark pacts, and hymns to whispered invocations. The Black Rot has drawn the eyes of demonic "
            "entities who seek to walk the mortal world to sow plague and disease. These demons grant strength to the "
            "knights of the Cloister, transforming them into bloated and rotten creatures that tower over lesser men. "
            "The price is their soul, and as the demonic corruption twists their insides there are few who retain their "
            "sanity for long.",
            "\n".join(intro),
        ),
        "armouryName": T("Cloister Armoury", "Armurerie du Cloître"),
        "sourceRef": src.ref(113, "The Blighted Cloister"),
        "assets": {"shield": "bouclier_cloister.webp", "accentColor": None},
    }

    # ----------------------------------------------------------------------------
    # Origins
    # ----------------------------------------------------------------------------
    ORIGINS = [
        ("knights-militant", "Knights-Militant", "Chevaliers militants", "knight-abbot", "fortified-keep",
         "This band of knights have claimed an old keep deep within the City for the Cloister. From here they launch "
         "crusades into the ruins, bringing a swift death to any who do not venerate the Living Saints.",
         [{"fighterId": "cloister-knight", "limit": None}]),
        ("priesthood-of-sorcerers", "Priesthood of Sorcerers", "Clergé de sorciers", "high-sorcerer",
         "secluded-scriptorium",
         "Once renowned for illuminating manuscripts of great beauty, this corrupted priesthood now pores over the "
         "ancient scrolls preserved within their abbey, uncovering plagues and afflictions of yore so they may be "
         "unleashed upon the world anew.", [{"fighterId": "cloister-sorcerer", "limit": 2}]),
        ("the-anointed-one", "The Anointed One", "L'Oint", "knight-abbot", "unholy-altar",
         "From the Cloister's innermost circles comes forth a warrior bearing the mark of a demonic patron. In return "
         "for carrying out its dark designs within the City, he is bestowed with unholy gifts that warp both flesh and "
         "soul.", [{"fighterId": "rot-demon", "limit": None}]),
        ("blessed-rabble", "Blessed Rabble", "Populace bénie", "high-sorcerer", "street-pulpit",
         "Led by one who speaks for the Living Saints, a swelling congregation gather on the streets of the City to "
         "hear his sermons. Ignited with fervour, they venture forth into the city believing themselves blessed with "
         "divine purpose.", []),
    ]
    data["origins"] = [
        {
            "id": oid,
            "name": T(en, fr),
            "flavour": T(flavour, src.quote_of(src.section(fr))),
            "requiredLeaderId": leader,
            "strongholdId": stronghold,
            "specialRules": [],
            "profileLimits": limits,
            "uncappedFighterIds": [],
            "sourceRef": src.ref(114, fr),
        }
        for oid, en, fr, leader, stronghold, flavour, limits in ORIGINS
    ]

    # ----------------------------------------------------------------------------
    # Strongholds
    # ----------------------------------------------------------------------------
    def table_lines(heading):
        """'Roll - Effect' lines of the first result table of a section."""
        out = []
        for l in src.section(heading):
            cells = [c.strip() for c in l.strip("|").split("|")]
            if l.startswith("|") and cells[0] not in ("Résultat", "---") and not set(cells[0]) <= set("-"):
                out.append(f"{cells[0]} - {clean(cells[1])}")
        return out


    COMMUNION_EN = [
        "2 - Damnation: Your leader is killed. You can add a Demonic Rotspawn to your warband without paying any "
        "silver. It bears the name of your former leader.",
        "3-8 - Silence: No effect.",
        "9-12 - Minor Boon: Your leader earns 10 bonus experience.",
        "13-15 - Demonic Ally: You can add a Rot Demon or a Rotling to your warband without paying any silver.",
        "16+ - Major Boon: Your leader earns 30 bonus experience.",
    ]
    STRONGHOLDS = [
        ("fortified-keep", "Fortified Keep", "Donjon fortifié",
         "Once abandoned, this timeworn keep has been reclaimed by the Cloister and fortified against the dangers of "
         "the City. Here, its knights drill tirelessly in the arts of war, ever preparing for the next crusade into the "
         "ruins.",
         [("martial-training", "Martial Training", "Entraînement martial",
           "In step 3 of the Aftermath sequence you can pick up to 3 friendly Knight fighters to take part in martial "
           "training. Each of those fighters earns d6 bonus experience."),
          ("search-the-city", "Search the City", "Fouiller la Cité",
           "In step 5 of the aftermath sequence, if you won the battle, you gain 1 additional re-roll when searching "
           "the City.")], []),
        ("secluded-scriptorium", "Secluded Scriptorium", "Scriptorium isolé",
         "By candlelight, the High Sorcerer oversees a host of hooded scribes as they translate forgotten manuscripts "
         "and corrupt works of medicine into foul treatises on plague and poison.",
         [("blasphemous-study", "Blasphemous Study", "Étude blasphématoire",
           "In each Aftermath sequence, you can pick 1 of the following:\n"
           "- Scry Ancient Scrolls: Roll a dice for each Wizard in your warband. Record an ongoing tally on your Warband "
           "Roster. Each time the tally exceeds a multiple of 20, you can pick a Wizard in your warband to earn enough "
           "experience to receive their next advancement.\n"
           "- Brew Concoctions: Roll a dice for each Wizard in your warband. For each roll of 5+, you can add 1 Vial of "
           "Poison item (pg xx) to your stash.")],
         [{"id": "ancient-scrolls-tally", "name": T("Ancient scrolls tally", "Total des parchemins anciens"),
           "initial": "0"}]),
        ("unholy-altar", "Unholy Altar", "Autel impie",
         "The walls of this hidden sanctum are covered with profane sigils, each daubed in dried blood. The Anointed "
         "One enters alone and kneels before the altar in silent communion, awaiting the judgement of the demon that "
         "lays claim to his soul.",
         [("demonic-communion", "Demonic Communion", "Communion démoniaque",
           "Before the Aftermath sequence, roll on the table below. If you won the battle, roll 3d6. If you lost, roll "
           "2d6:\n" + "\n".join(COMMUNION_EN))], []),
        ("street-pulpit", "Street Pulpit", "Chaire de rue",
         "Each night, beneath this weathered pulpit, those afflicted with the Black Rot gather before the congregation "
         "to receive the Cloister's blessing. Those who have fallen in battle are brought forth and raised upon wooden "
         "crosses, where they are left to fester, their decaying bodies venerated as holy martyrs.",
         [("venerate-living-saints", "Venerate Living Saints", "Vénérer les Saints vivants",
           "Each time a Dreg Cultist in this warband earns a level of Black Rot, they earn 5 additional experience."),
          ("canonise-the-fallen", "Canonise the Fallen", "Canoniser les défunts",
           "Each time a fighter in this warband is killed, every Dreg Cultist in this warband earns 10 additional bonus "
           "experience in step 3 of the aftermath sequence.")], []),
    ]
    data["strongholds"] = []
    for sid, en, fr, flavour, rules, trackers in STRONGHOLDS:
        built = []
        for rid, ren, rfr, rtext in rules:
            fr_text = src.bold_rule(fr, rfr)
            if rid == "demonic-communion":
                fr_text += "\n" + "\n".join(table_lines(fr))
            built.append(rule(rid, ren, rfr, rtext, fr_text))
        data["strongholds"].append(
            {"id": sid, "name": T(en, fr), "flavour": T(flavour, src.quote_of(src.section(fr))), "income": "3d6x5",
             "rules": built, "trackers": trackers, "sourceRef": src.ref(115, fr)}
        )

    # ----------------------------------------------------------------------------
    # Campaign rules, names, epithets
    # ----------------------------------------------------------------------------
    demons_fr = src.paragraphs(src.section("Rot Demons"))
    demons_fr = [p for p in demons_fr if not p.startswith("Table des blessures des Démons")]
    data["campaignRules"] = [
        rule("death-of-a-leader", "Death of a Leader", "Mort d'un Chef",
             "During the campaign, if your leader is killed, and you choose to promote a champion (pg xx), the following "
             "champions are eligible:", src.paragraphs(src.section("Mort d'un Chef"))[0]),
        rule("rot-demons", "Rot Demons", "Rot Demons",
             "Fighters with the Demon keyword do not use the standard injury table (pg xx). Instead they use the "
             "following Demon Injury Table (d66):\n"
             "The exception to this are Rotlings which use the Beasts Injury Table (pg xx).\n"
             "11-16 - Banished: The demon is banished from the mortal world for 666 years. Remove it from your warband "
             "roster. All its wargear is lost.\n"
             "21-36 - Fractured Essence: The demon's grip on its corporeal form is momentarily unravelled. The demon "
             "misses the next battle.\n"
             "41-65 - Unharmed: Mortal weapons are not enough to deal lasting harm to a creature such as this. The demon "
             "suffers no lasting effects.\n"
             "66 - Enraged: The demon suffers no lasting effects. In addition, in step 3 of the Aftermath sequence, after "
             "earning experience, they earn bonus experience to reach the next level.",
             "\n".join(demons_fr).replace("Table des blessures des Démons suivante :",
                                          "Table des blessures des Démons suivante (D66) :")
             + "\n" + "\n".join(table_lines("Rot Demons"))),
    ]
    data["leaderSuccession"] = [
        {"formerLeaderId": "knight-abbot", "eligibleChampionIds": ["cloister-champion"]},
        {"formerLeaderId": "high-sorcerer", "eligibleChampionIds": ["cloister-sorcerer"]},
    ]
    data["nameTable"] = {"die": "d66", "sourceRef": src.ref(116, "Noms du Blighted Cloister"),
                         "entries": src.names("Noms du Blighted Cloister")}
    epithets = {}
    for l in src.section("Épithètes du Blighted Cloister"):
        cells = [c.strip() for c in l.strip("|").split("|")]
        if l.startswith("|") and re.match(r"^\d0$", cells[0]):
            for col, cell in enumerate(cells[1:], start=1):
                m = re.match(r"^(.*?)\s*\(\*(.+?)\*\)$", cell)
                epithets[f"{cells[0][0]}{col}"] = T(m.group(2), m.group(1))
    data["epithetTable"] = {"die": "d66", "sourceRef": src.ref(118, "Épithètes du Blighted Cloister"),
                            "entries": epithets}

    # ----------------------------------------------------------------------------
    # Wargear
    # ----------------------------------------------------------------------------
    MEL = "Armurerie du Cloître - Armes de corps à corps"
    RNG = "Armurerie du Cloître - Armes à distance"
    NOTE_ENS = T("You can use any weapon to represent the Ensorcelled Weapon.",
                 "Vous pouvez utiliser n'importe quelle arme pour représenter l'Arme ensorcelée.")


    def m(*args, **kw):
        return melee(src, *args, 119, MEL, **kw)


    def ranged(gid, en, fr, cost, rng, a, r, d, c, traits):
        return gear(src, gid, en, fr, "ranged", cost, 119, RNG,
                    profile={"range": rng, "attacks": a, "rend": r, "damage": d, "critDamage": c}, traits=tr(*traits))


    wargear = [
        m("arcane-staff", "Arcane Staff", "Bâton arcanique", 10, 2, 0, 1, "d3", ["arcane", "off-hand"]),
        m("axe", "Axe", "Hache", 16, 3, -1, 1, "d3", ["off-hand"]),
        m("club-mace-hammer", "Club/Mace/Hammer", "Gourdin/Masse/Marteau", 14, 3, 0, 1, "d3", ["bludgeon", "off-hand"]),
        m("dagger", "Dagger", "Dague", 10, 3, 0, 1, "d3", ["off-hand"]),
        m("demonic-rot-blade", "Demonic Rot Blade", "Lame de pourriture démoniaque", 45, 3, -1, 1, "d3",
          ["arcane", "guard", "poison"]),
        m("demonic-rot-maw", "Demonic Rot Maw", "Gueule de pourriture démoniaque", 0, 3, -1, 2, "d3+1",
          ["arcane", "bludgeon", "natural-weapon", "poison"], purchasable=False),
        m("demonic-rot-strike", "Demonic Rot Strike", "Frappe de pourriture démoniaque", 0, 3, -1, 1, "d3",
          ["arcane", "natural-weapon", "poison"], purchasable=False),
        m("ensorcelled-weapon", "Ensorcelled Weapon", "Arme ensorcelée", 26, 3, -1, 1, "d3", ["arcane"], note=NOTE_ENS),
        m("flail", "Flail", "Fléau", 14, 3, 0, 1, "d3", ["off-hand", "wrap"]),
        m("great-demonic-rot-blade", "Great Demonic Rot Blade", "Grande lame de pourriture démoniaque", 70, 3, -2, 3,
          "d3+2", ["arcane", "bludgeon", "poison", "two-handed", "unwieldy"]),
        m("great-club", "Great Club", "Grand gourdin", 38, 3, -1, 2, "d3+1", ["bludgeon", "two-handed", "unwieldy"]),
        m("halberd", "Halberd", "Hallebarde", 34, 3, -1, 1, "d3+1", ["brace", "two-handed", "unwieldy"]),
        m("heavy-axe", "Heavy Axe", "Hache lourde", 40, 3, -2, 2, "d3+1", ["two-handed", "unwieldy"]),
        m("proboscis", "Proboscis", "Trompe", 0, 3, 0, 1, 1, ["natural-weapon", "poison"], purchasable=False),
        m("spear", "Spear", "Lance", 16, 3, 0, 1, "d3", ["brace", "two-handed"]),
        m("sword", "Sword", "Épée", 18, 3, 0, 1, "d3", ["guard", "off-hand"]),
        ranged("sling", "Sling", "Fronde", 14, 16, 1, 0, 1, "d3", []),
        ranged("blowpipe", "Blowpipe", "Sarbacane", 16, 12, 1, 0, 1, "d3", ["poison"]),
    ]

    ITEMS = [
        ("cuirass", "Cuirass", "Cuirasse", "armour", 20, 5, None, False, None, {}),
        ("warded-robes", "Warded Robes", "Robe de protection", "armour", 10, 6, None, False,
         "Roll a dice each time a fighter equipped with this armour is targeted by a spell cast by an enemy fighter. "
         "On a 4+, the spell has no effect on this fighter.", {}),
        ("full-plate", "Full-plate", "Armure de plates", "armour", 40, 4, None, False, FULL_PLATE_EN,
         {"restrictions": FULL_PLATE_RESTRICTION}),
        ("cauldron", "Cauldron", "Chaudron", "item", 40, None, 1, True,
         "[Action] This fighter can use this item as an action. The fighter takes a Willpower test. If they pass, pick "
         "a spell from a spell lore they know to be prepared.", {}),
        ("cloister-icon", "Cloister Icon", "Icône du Cloître", "item", 25, None, 1, True,
         "While this fighter is on the battlefield, you can re-roll flee tests.\n"
         "You can re-roll Willpower tests made by friendly fighters while they are within 12\" of this fighter and this "
         "fighter is visible to them.", {}),
        ("demonic-familiar", "Demonic Familiar", "Familier démoniaque", "item", 20, None, 1, False,
         "Each time this fighter makes a melee attack, they can make 1 additional attack with the following weapon:",
         {"grants": {"rend": 0, "damage": 1, "critDamage": "d3",
                     "traits": [{"key": "arcane"}, {"key": "natural-weapon"}, {"key": "poison"}]},
          "note_en": "This item is designed for miniatures that feature other small demonic creatures on the same base. "
                     "The demonic familiar is not considered a separate fighter for any rules."}),
        ("ensorcelled-bell", "Ensorcelled Bell", "Cloche ensorcelée", "item", 10, None, 1, False,
         "Once per battle, you can re-roll a miscast roll made for this fighter.", {}),
        ("grimoire", "Grimoire", "Grimoire", "item", 15, None, 1, False,
         "Once per battle, after this fighter has made casting roll, you can re-roll the casting roll.", {}),
        ("shield", "Shield", "Bouclier", "item", 10, None, None, True,
         "Improve this fighter's Armour value by 1, to a maximum of 2+. (For example, 6+ becomes 5+).",
         {"improvement": 1}),
    ]
    for gid, en, fr, kind, cost, armour, rarity, held, en_text, extra in ITEMS:
        fr_text, fr_note = src.item_text(fr)
        note_en = extra.pop("note_en", None)
        wargear.append(
            gear(src, gid, en, fr, kind, cost, 120, fr, armour=armour, rarity=rarity,
                 keywords=["held-item"] if held else [],
                 text=None if en_text is None else T(en_text, fr_text),
                 note=None if note_en is None else T(note_en, fr_note), **extra)
        )
    data["wargear"] = wargear

    by_fr = {w["name"]["fr"]: w for w in wargear}
    LISTS = [
        ("main", "Main List", "Liste principale"),
        ("champion", "Champion List", "Liste des Champions"),
        ("dreg", "Dreg List", "Liste des Dregs"),
        ("practitioner", "Practitioner List", "Liste des Praticiens"),
        ("practitioner-items", "Practitioner Item List", "Liste d'objets des Praticiens"),
    ]
    data["armouryLists"] = [
        {"id": lid, "name": T(en, fr), "sourceRef": src.ref(118, fr), "entries": src.armoury_list(fr, by_fr)}
        for lid, en, fr in LISTS
    ]

    # ----------------------------------------------------------------------------
    # Fighters
    # ----------------------------------------------------------------------------
    WARDS = ("demonic-wards", "Demonic Wards", "Protections démoniaques",
             "This fighter ignores Rend when making armour rolls.")
    FEAR = ("fear", "Fear", "Peur",
            "This fighter causes fear. Enemy fighters that start their activation engaged in melee with a fighter that "
            "causes fear must pass a Willpower test. If they fail, their activation immediately ends.\n"
            "Enemy fighters that also cause fear can ignore this rule.")
    RAM = ("ram-horns", "Ram Horns", "Cornes de bélier",
           "After this fighter finishes a Charge Move, pick 1 enemy fighter engaged in melee with them to be the "
           "target. The target is hit by 2 attacks as follows: Rend -1, Damage 1.")


    def caster(rid, en, fr, lore_en, n):
        spells = "2 spells from it to be their signature spells" if n == 2 else "1 spell from it to be their signature spell"
        return (rid, en, fr, f"This fighter knows the {lore_en}. When they are recruited, pick {spells}. In addition, at "
                             "the start of each battle they prepare 1 random spell from it.")


    PLATE_MAIN_CHAMP = ("This fighter is equipped with Full-Plate armour (included in their recruit cost). They can be "
                        "equipped with additional wargear from the Main List and Champion List from the Cloister Armoury.")
    PRACT = ("This fighter can be equipped with wargear from the Practitioner List and Practitioner Item List from the "
             "Cloister Armoury.")

    FIGHTERS = [
        ("knight-abbot", "Knight-Abbot", "leader", ["leader", "cloister", "human", "knight"], 190, None,
         (5, 3, 4, 4, 4, 4, 7), ["main", "champion"], ["full-plate"], (60, "d6"), [], (2, 0, None),
         [("lord-of-the-cloister", "Lord of the Cloister", "Seigneur du Cloître",
           "When this fighter is recruited, pick 2 skills for them.")],
         PLATE_MAIN_CHAMP, "Blessed are they whom the Black Rot hath chosen.", 125),
        ("high-sorcerer", "High Sorcerer", "leader", ["leader", "cloister", "human", "wizard"], 175, None,
         (5, 4, 6, 6, 3, 5, 6), ["practitioner", "practitioner-items"], [], (60, "d6"), ["lore-of-blessed-maggots"],
         (0, 2, "lore-of-blessed-maggots"),
         [caster("master-of-dark-spellcraft", "Master of Dark Spellcraft", "Maître du sombre art de la magie",
                 "Lore of Blessed Maggots", 2)],
         PRACT, "Count thy afflictions as blessings.", 125),
        ("cloister-sorcerer", "Cloister Sorcerer", "champion", ["champion", "cloister", "human", "wizard"], 140, 1,
         (5, 4, 6, 6, 3, 4, 5), ["practitioner", "practitioner-items"], [], (40, "d6"), ["lore-of-blessed-maggots"],
         (0, 1, "lore-of-blessed-maggots"),
         [caster("dark-spellcraft", "Dark Spellcraft", "Sombre art de la magie", "Lore of Blessed Maggots", 1)],
         PRACT, "I'll see thy flesh boil and burn.", 126),
        ("cloister-champion", "Cloister Champion", "champion", ["champion", "cloister", "human", "knight"], 145, None,
         (5, 3, 4, 4, 4, 4, 6), ["main", "champion"], ["full-plate"], (40, "d6"), [], (1, 0, None),
         [("lord-of-the-cloister", "Lord of the Cloister", "Seigneur du Cloître",
           "When this fighter is recruited, pick 1 skill for them.")],
         PLATE_MAIN_CHAMP, "Corruption grants me strength.", 126),
        ("darkcloven-shaman", "Darkcloven Shaman", "champion", ["champion", "cloister", "beastman", "wizard"], 145, 1,
         (6, 4, 6, 6, 4, 4, 5), ["practitioner", "practitioner-items"], [], (40, "d6"),
         ["lore-of-blessed-maggots", "demonic-lore-of-rot"], (0, 0, None),
         [("darkcloven-magic", "Darkcloven Magic", "Magie Darkcloven",
           "This fighter knows the Lore of Blessed Maggots and the Demonic Lore of Rot. However, when they are "
           "recruited they have no signature spells. At the start of each battle they prepare 1 random spell from each "
           "lore."), RAM],
         PRACT, "Tonight the herd shall feast on blood and marrow.", 127),
        ("demonic-rot-herald", "Demonic Rot-Herald", "champion", ["champion", "cloister", "demon", "wizard"], 175, 1,
         (4, 3, 6, 5, 4, 4, 6), ["practitioner-items"], ["demonic-rot-blade"], (40, "d6"), ["demonic-lore-of-rot"],
         (0, 1, "demonic-lore-of-rot"),
         [caster("demonic-spellcraft", "Demonic Spellcraft", "Art démoniaque de la magie", "Demonic Lore of Rot", 1),
          WARDS, FEAR],
         "This fighter is equipped with a Demonic Rot Blade (included in their recruit cost). They can be equipped "
         "with additional wargear from the Practitioner Item List from the Cloister Armoury.",
         "Thy flesh and thy soul shall know corruption, mortal.", 127),
        ("cloister-knight", "Cloister Knight", "henchman", ["henchman", "cloister", "human", "knight"], 95, 3,
         (5, 4, 6, 4, 3, 3, 5), ["main"], ["full-plate"], (30, "d6"), [], (0, 0, None), [],
         "This fighter is equipped with Full-Plate armour (included in their recruit cost). They can be equipped with "
         "additional wargear from the Main List from the Cloister Armoury.",
         "My blade serves the Living Saints.", 128),
        ("dreg-cultist", "Dreg Cultist", "henchman", ["henchman", "cloister", "human"], 30, None, (5, 5, 5, 6, 2, 2, 3),
         ["main", "dreg"], [], (0, "d6"), [], (0, 0, None), [],
         "This fighter can be equipped with wargear from the Main List and Dreg List from the Cloister Armoury.",
         "The afflicted shall inherit the City.", 128),
        ("darkcloven-beastman", "Darkcloven Beastman", "henchman", ["henchman", "cloister", "beastman"], 55, None,
         (5, 4, 5, 6, 3, 3, 4), ["main"], [], (20, "d6"), [], (0, 0, None), [RAM],
         "This fighter can be equipped with wargear from the Main List from the Cloister Armoury.",
         "Feast on flesh!", 129),
        ("rot-demon", "Rot Demon", "henchman", ["henchman", "cloister", "demon"], 120, 3, (4, 3, 6, 5, 4, 4, 5), [],
         ["demonic-rot-blade"], (30, "d6"), [], (0, 0, None), [WARDS, FEAR],
         "This fighter is equipped with a Demonic Rot Blade (included in their recruit cost). They cannot be equipped "
         "with any other wargear.", "Once more do I tread the mortal plane.", 129),
        ("demonic-rotspawn", "Demonic Rotspawn", "brute", ["brute", "cloister", "demon"], 130, None,
         (5, 3, 6, 5, 4, 4, 8), [], ["demonic-rot-maw"], (30, "d6"), [], (0, 0, None), [WARDS, FEAR],
         "This fighter is equipped with a Demonic Rot Maw (see below), they cannot be equipped with any other wargear.",
         "Sate... my... hunger...", 130),
        ("demonic-rot-colossal", "Demonic Rot-Colossal", "brute", ["brute", "cloister", "demon"], 200, None,
         (5, 4, 6, 5, 4, 4, 10), [], ["great-demonic-rot-blade"], (30, "d6"), [], (0, 0, None), [WARDS, FEAR],
         "This fighter is equipped with a Great Demonic Rot Blade (included in their recruit cost). They cannot be "
         "equipped with any other wargear.", "Come hither, little mortal.", 130),
        ("bloat-fly", "Bloat Fly", "beast", ["beast", "cloister", "fly"], 50, None, (10, 5, None, 6, 4, 1, 2), [],
         ["proboscis"], (0, None), [], (0, 0, None), [],
         "This fighter is equipped with a proboscis (see below), they cannot be equipped with any other wargear.",
         None, 131),
        ("rotling", "Rotling", "beast", ["beast", "cloister", "demon"], 25, None, (4, 4, None, 5, 3, 2, 3), [],
         ["demonic-rot-strike"], (0, None), [], (0, 0, None), [],
         "This fighter is equipped with a demonic rot strike (see below), they cannot be equipped with any other "
         "wargear.", None, 131),
    ]

    data["fighters"] = []
    for (fid, name, cat, kws, cost, limit, st, lists, fixed, xp, lores, grants, rules, wg_en, quote_en,
         page) in FIGHTERS:
        lines = src.scroll(name)
        special = []
        for rid, ren, rfr, rtext in rules:
            fr_text = src.bullet_rule(lines, rfr)
            if rid == "ram-horns":
                fr_text = fr_text.rstrip(":").rstrip() + " : Perforation -1, Dégâts 1."
            special.append(rule(rid, ren, rfr, rtext, fr_text))
        q = src.quote_of(lines)
        data["fighters"].append(
            {
                "id": fid,
                "name": T(name, name),
                "category": cat,
                "keywords": kws,
                "cost": cost,
                "limit": limit,
                "stats": dict(zip(["mv", "bl", "bw", "ar", "in", "wl", "lf"], st)),
                "allowedWargearLists": lists,
                "fixedWargearIds": fixed,
                "startingExperience": {"base": xp[0], "dice": xp[1]},
                "knownSpellLoreIds": lores,
                "recruitmentGrants": {"skills": grants[0], "fixedSkillIds": [], "spells": grants[1],
                                      "spellLoreId": grants[2]},
                "specialRules": special,
                "wargearText": T(wg_en, src.wargear_text(lines)),
                "quote": None if quote_en is None else T(quote_en, q),
                "sourceRef": src.ref(page, name),
            }
        )

    # ----------------------------------------------------------------------------
    # Skills
    # ----------------------------------------------------------------------------
    SKILLS = {
        "ordained-of-the-cloister": [
            ("shepherd-the-afflicted", "Shepherd the Afflicted", "Guider les affligés",
             "Add 1 to the maximum distance other friendly fighters can move if they started the move within 6\" of this "
             "fighter."),
            ("demonic-conduit", "Demonic Conduit", "Conduit démoniaque",
             "Once per battle, when a friendly Demon fighter would be set up from reserve, they can instead be set up "
             "within 3\" of this fighter, not engaged in melee with any enemy fighters."),
            ("rite-of-contagion", "Rite of Contagion", "Rite de contagion",
             "Once per battle, if this fighter is not engaged, this fighter can use the following bonus action:\n"
             "Rite of Contagion [Bonus Action]: Each enemy fighter within 12\" of this fighter must pass a Willpower test "
             "else suffer 1 point of damage and be poisoned (see the Poison weapon trait)."),
            ("last-rites", "Last Rites", "Derniers sacrements",
             "Each time another fighter is taken down within 6\" of this fighter, this fighter can heal 1 life point."),
            ("unholy-sermon", "Unholy Sermon", "Sermon impie",
             "Once per battle, if this fighter is not engaged, this fighter can use the following bonus action:\n"
             "Unholy Sermon [Bonus Action]: Until the end of the round, add 1 to attack rolls for melee attacks made by "
             "friendly fighters while they are within 6\" of this fighter."),
            ("the-black-benediction", "The Black Benediction", "La Bénédiction noire",
             "Subtract 1 from the Damage and Critical Damage values of weapons while they target this fighter (to a "
             "minimum of 1)."),
        ],
        "blessings-of-saint-rot": [
            ("infested-with-maggots", "Infested with Maggots", "Infesté d'asticots",
             "Each time this fighter activates, if it has suffered any damage, roll a dice. On a 4+, they heal 1 life "
             "point."),
            ("black-blood", "Black Blood", "Sang noir", "This fighter cannot be poisoned."),
            ("toxic-miasma", "Toxic Miasma", "Miasme toxique",
             "Each time an enemy fighter activates while they are engaged in melee with this fighter, they must pass a "
             "Willpower test or suffer 1 point of damage."),
            ("shroud-of-flies", "Shroud of Flies", "Linceul de mouches",
             "Subtract 1 from attack rolls that target this fighter."),
            ("vessel-of-black-rot", "Vessel of Black Rot", "Réceptacle de la Pourriture noire",
             "When this fighter is taken down, roll a dice for each enemy fighter within 6\". On a 4+ they become "
             "poisoned (see Poison weapon trait)."),
            ("vector-of-entropy", "Vector of Entropy", "Vecteur d'entropie",
             "Worsen the Armour value of enemy fighters by 1 (to a minimum of '-') while they are engaged in melee with "
             "this fighter."),
        ],
    }
    TABLES = [
        ("ordained-of-the-cloister", "Ordained of the Cloister", "Ordonnés du Cloître", 123,
         {"kind": "keywords", "anyOf": [["cloister", "leader"], ["cloister", "champion"]]},
         T("Cloister Leaders and Champions only", "Chefs et Champions Cloister uniquement")),
        ("blessings-of-saint-rot", "Blessings of Saint Rot", "Bénédictions de Sainte Pourriture", 124,
         {"kind": "keywords", "anyOf": [["cloister"]]}, T("Any Cloister fighter", "N'importe quel combattant Cloister")),
    ]
    data["skillTables"] = []
    for tid, en, fr, page, elig, label in TABLES:
        skills = [{"id": sid, "name": T(sen, sfr), "text": T(text, "\n".join(src.paragraphs(src.section(sfr)))),
                   "sourceRef": src.ref(page, sfr)} for sid, sen, sfr, text in SKILLS[tid]]
        data["skillTables"].append({"id": tid, "name": T(en, fr), "eligibility": elig, "eligibilityLabel": label,
                                    "sourceRef": src.ref(page, fr), "skills": skills})

    # ----------------------------------------------------------------------------
    # Spell lores
    # ----------------------------------------------------------------------------
    SPELLS = {
        "lore-of-blessed-maggots": [
            (1, "swollen-form", "Swollen Form", "Forme boursouflée", "enchant", 7, 10,
             "Pick a visible friendly fighter within 9\" of the caster to be the target. That fighter is swollen until "
             "the end of the round. While a fighter is swollen, they can ignore the first 3 points of damage they suffer.",
             "Increase the range to 12\".", None),
            (2, "black-mire", "Black Mire", "Bourbier noir", "hex", 8, 12,
             "Pick a visible point on the battlefield floor within 6\" of the caster. Until the end of the round, the "
             "battlefield floor within 6\" of that point is a mire. Subtract 2 from the maximum distance a non-Cloister "
             "fighter can move each time they move across the mire.",
             "The battlefield floor within 9\" of that point is a mire, instead of 6\".", None),
            (3, "erupting-sores", "Erupting Sores", "Plaies éruptives", "attack", 8, 12,
             "The closest visible enemy fighter within 9\" is targeted and suffers d3 damage. If they are not taken down, "
             "they must pass a Willpower test, else scatter d6\".", "Increase the range to 12\".", None),
            (4, "rain-of-filth", "Rain of Filth", "Pluie d'immondices", "healing", 7, 12,
             "Place the blast template centred on a point within 12\" of the caster, it then scatters d6\".\n"
             "Each fighter in the template is targeted and heals d3 life.", "It does not scatter.", None),
            (5, "putrid-blessing", "Putrid Blessing", "Bénédiction putride", "enchant", 8, 10,
             "Pick a friendly fighter within 6\" of the casting fighter to be the target. That fighter has a putrid "
             "blessing until the end of the round. While a fighter has a putrid blessing, their melee weapons gain the "
             "Arcane and Poison weapon traits.", "Increase the range of the spell from 6\" to 12\".", None),
            (6, "black-bile", "Black Bile", "Bile noire", "attack", 9, 14,
             "Place the flame template from the caster. Each fighter in the template is targeted and hit with the "
             "following attack:",
             "Each fighter hit by the attack must pass a Willpower test else they become poisoned, (see the Poison "
             "weapon trait).", {"rend": -1, "damage": "d3"}),
        ],
        "demonic-lore-of-rot": [
            (1, "summon-rotling", "Summon Rotling", "Invoquer un Rotling", "summon", 9, 14,
             "A summoned Rotling fighter (pg xx) is added to the caster's warband until it is taken down. Set up the "
             "fighter within 3\" of the caster and not engaged in melee.\n"
             "A warband cannot have more than 3 summoned fighters at any time. If the caster's warband already has 3 "
             "summoned fighters, they cannot cast this spell.",
             "The fighter can be set up within 9\" of the caster and not engaged in melee.", None),
            (2, "demonic-strength", "Demonic Strength", "Force démoniaque", "enchant", 8, 12,
             "Pick a friendly Demon or Beastman fighter within 6\" of the caster to be the target. That fighter has "
             "demonic strength until the end of the round. While a fighter has demonic strength, add 1 to the Damage and "
             "Critical Damage values of their melee weapons.", "You can pick 2 fighters to be targets instead of 1.",
             None),
            (3, "rotten-insides", "Rotten Insides", "Entrailles pourries", "hex", 6, 12,
             "The closest visible enemy fighter within 9\" is targeted and suffers 1 damage. If they are not taken down, "
             "they have rotten insides. While a fighter has rotten insides their Move value is 2\". At the end of the "
             "activation of a fighter with rotten insides they take a Willpower test. If they pass, they no longer have "
             "rotten insides.", "Increase the range to 12\".", None),
            (4, "plague-wind", "Plague Wind", "Vent de peste", "hex", 6, 10,
             "Place the blast template centred on a point within 15\" of the caster. Each enemy fighter in the template "
             "is targeted and must pass a Willpower test else they become poisoned, (see the Poison weapon trait).",
             "Subtract 1 from any Willpower tests made for this spell.", None),
            (5, "protective-shroud", "Protective Shroud", "Linceul protecteur", "enchant", 8, 12,
             "Pick a friendly Demon or Beastman fighter within 6\" of the caster to be the target. That fighter has a "
             "protective shroud until the end of the round. While a fighter has a protective shroud, improve their "
             "Armour value by 1.", "Increase the range to 12\".", None),
            (6, "plague-pit", "Plague Pit", "Fosse de peste", "cantrip", 9, 14,
             "Place the blast template centred on a visible point on the battlefield floor within 9\" of the caster. A "
             "pit opens here. In an order chosen by the commanding player of the caster, each fighter in the template is "
             "removed from the battlefield and set up again at the edge of the pit by its commanding player, not engaged "
             "in melee. If there is no space, they are set up as close to the edge of the pit as possible, not engaged "
             "in melee.\n"
             "After being set up, the fighter must pass an Initiative test else suffer d3 damage and become poisoned "
             "(see the Poison weapon trait).\n"
             "The pit remains in play until the end of the round. Fighters cannot move across the pit while they are on "
             "the battlefield floor. Any treasure tokens on the pit are destroyed.",
             "Increase the range from 9\" to 12\".", None),
        ],
    }
    LORES = [
        ("lore-of-blessed-maggots", "Lore of Blessed Maggots", "Domaine des Asticots bénis", 121),
        ("demonic-lore-of-rot", "Demonic Lore of Rot", "Domaine démoniaque de la Pourriture", 122),
    ]
    data["spellLores"] = []
    for lid, en, fr, page in LORES:
        spells = []
        for roll, sid, sen, sfr, stype, cv, ccv, text, crit, attack in SPELLS[lid]:
            heading = f"{roll} - {sfr}"
            fr_main, fr_crit = src.spell(heading)
            spells.append({"id": sid, "roll": roll, "name": T(sen, sfr), "spellType": stype, "castingValue": cv,
                           "criticalCastValue": ccv, "text": T(text, fr_main), "criticalText": T(crit, fr_crit),
                           "attack": attack, "sourceRef": src.ref(page, heading)})
        data["spellLores"].append({"id": lid, "name": T(en, fr), "die": "d6", "sourceRef": src.ref(page, fr),
                                   "spells": spells})
    return data
