"""
File:     scripts/generators/death_covens.py
Role:     Builds the Death Covens faction data from 08_death-covens.md (French
          texts extracted and cleaned) and the English playtest v1.03 texts
          typed below (typos fixed, see RULES_ASSUMPTIONS.md D03).
Author:   Adrien Duclaud
Created:  2026-10-12
License:  MIT
"""

from common import (
    FULL_PLATE_EN,
    FULL_PLATE_RESTRICTION,
    UNSHAKEABLE_EN,
    Source,
    T,
    cap,
    clean,
    gear,
    melee,
    rule,
)

FILE = "08_death-covens.md"


def build(md_path):
    """Returns the faction data built from the translation file."""
    src = Source(md_path, FILE)
    md = src.md

    # ----------------------------------------------------------------------------
    # Faction
    # ----------------------------------------------------------------------------
    intro = [clean(l[2:]) for l in md[2:10] if l.startswith("> ") and l[2:].strip()]
    data = {
        "_header": {
            "file": "src/data/death-covens.json",
            "role": "Death Covens faction data: origins, strongholds, campaign rules, names, fighters, Coven Armoury, skills, spell lores",
            "author": "Adrien Duclaud",
            "created": "2026-10-12",
            "license": "MIT for the file structure. Game content belongs to Sam Pearson (Black Death City).",
        },
        "schemaVersion": 1,
        "id": "death-covens",
        "name": T("Death Covens", "Death Covens"),
        "description": T(
            "The City is a place of death. The Black Rot has left the population decimated, with bodies piled high in "
            "the streets or cast into mass graves. Their stench now permeates the very soil where it has taken on a dark "
            "will of its own.\n"
            "Each night, as the sun sinks beneath the western horizon and the moon rises in its stead, the long dead "
            "awaken from their slumber. Ancient barrows beyond the City's eastern limits stir once more, while the soil "
            "of the City's many cemeteries churns with the rising dead.\n"
            "Such a forsaken place has become a haven for the creatures of the night. Vampyres, once forced to conceal "
            "their cursed lineage, now stalk the streets openly. Necromancers, exiled from the lands of Men for their "
            "blasphemous craft, find not only sanctuary within the City but an endless supply of corpses to swell their "
            "ranks.\n"
            "Then there are those drawn from the far north, nobles with the blood of wolves coursing through their "
            "veins. They come seeking the thrill of the hunt amidst the City's ruin, and will not rest until they have "
            "had their fill.",
            "\n".join(intro),
        ),
        "armouryName": T("Coven Armoury", "Armurerie du Coven"),
        "sourceRef": src.ref(93, "Death Covens"),
        "assets": {"shield": "bouclier_death.png", "accentColor": None},
    }

    # ----------------------------------------------------------------------------
    # Origins
    # ----------------------------------------------------------------------------
    ORIGINS = [
        ("aristocrats-of-blood", "Aristocrats of Blood", "Aristocrates du sang", "bloodcursed-noble", "opulent-manor",
         "For centuries, this noble house concealed its vampyric curse behind titles and wealth. With the City's fall, "
         "there is no longer any need for pretence. Their masquerade has ended. Now the revelry begins.",
         [{"fighterId": "bloodcursed-knight", "limit": 3}], []),
        ("rogue-necromancer", "Rogue Necromancer", "Nécromancien renégat", "necromancer", "embalmers-hall",
         "Outlawed and relentlessly pursued by the Witch Hunters Guild, this powerful Necromancer has sought refuge "
         "within the City, where the recent dead provide an endless supply of \"specimens\".", [], []),
        ("the-hunt-descends", "The Hunt Descends", "La chasse s'abat", "lycanfell-noble", "grand-pavilion",
         "From the snow-capped peaks and dark forests of the north, word has reached an ancient aristocrat of fresh "
         "hunting grounds.", [], ["dire-wolf"]),
        ("awakened-lord", "Awakened Lord", "Seigneur éveillé", "barrow-lord", "ancient-barrows",
         "The City's fall stirred this ancient lord from his long slumber. To his banner gather clansmen still bound "
         "by oaths sworn in life. He vows to reclaim his former domain.", [], []),
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
            "uncappedFighterIds": uncapped,
            "sourceRef": src.ref(94, fr),
        }
        for oid, en, fr, leader, stronghold, flavour, limits, uncapped in ORIGINS
    ]

    # ----------------------------------------------------------------------------
    # Strongholds
    # ----------------------------------------------------------------------------
    STRONGHOLDS = [
        ("opulent-manor", "Opulent Manor", "Manoir opulent",
         "Situated in the noble's district, this estate has seemingly survived the plague untouched. Behind its high "
         "walls can be seen the glimmer of firelight, and the sounds of decadent feasting.",
         [("banquet-of-blood", "Banquet of Blood", "Banquet de sang",
           "In step 3 of the Aftermath sequence pick up to 3 friendly Vampyre fighters to sit at the table. Each of "
           "those fighters earns d6 bonus experience. If you won the battle, each of those fighters earns 2d6 bonus "
           "experience instead.")]),
        ("embalmers-hall", "Embalmer's Hall", "Salle de l'embaumeur",
         "Shelves laden with fragrant herbs, posies, and hardened pine resin fill the Embalmers' Hall with a sweet "
         "aroma. Beneath it lingers the unmistakable stench of corpses.",
         [("necromantic-study", "Necromantic Study", "Étude nécromantique",
           "In each Aftermath sequence, pick 1 of the following:\n"
           "- Read Forbidden Scrolls: In step 3, your Leader gains 5 bonus experience.\n"
           "- Create a Zombie: In step 6, roll a dice. On a 5+, your Leader has successfully created a Zombie from one "
           "of the hall's corpses. You can recruit a Zombie to your warband for 0 silver.")]),
        ("grand-pavilion", "Grand Pavilion", "Grand pavillon",
         "Hidden amongst the northern forests, the Lycanfell Noble's grand pavilion serves as the heart of his hunting "
         "court. Rich tapestries and grisly trophies adorn its walls, while iron braziers burn long into the night. "
         "Beyond the firelight, the howls of gathering wolves echo through the trees.",
         [("bestial-trophies", "Bestial Trophies", "Trophées de Bêtes",
           "Each time a Beast that was taken down by your Leader is killed, your Leader earns 10 bonus experience."),
          ("a-howl-in-the-night", "A Howl in the Night", "Un hurlement dans la nuit",
           "In step 6 of the Aftermath sequence, roll a dice. On a 6, a Dire Wolf emerges from the forest. You can "
           "recruit a Dire Wolf to your warband for 0 silver.")]),
        ("ancient-barrows", "Ancient Barrows", "Tumulus anciens",
         "Set beneath the eastern hills on the City's outskirts, these ancient barrows have long stood silent. Now, "
         "rumours spread of the restless dead and an undead lord gathering his forgotten host, preparing to march upon "
         "the City once more.",
         [("barrow-offering", "Barrow Offering", "Offrande au tumulus",
           "In step 5 of the Aftermath sequence, roll a dice. On a 6, mortals from the City have left an offering. Roll "
           "once on the treasure table (pg xx)."),
          ("immortal-slumber", "Immortal Slumber", "Sommeil immortel",
           "If your Leader is Laid to Rest (see opposite), they are not removed from your warband. Instead they miss "
           "the next d3 battles as they slumber. Pick a Champion in your warband to be the Leader in their absence. "
           "That fighter temporarily gains the Leader keyword and loses the Champion keyword until the Leader returns.")]),
    ]
    data["strongholds"] = [
        {
            "id": sid,
            "name": T(en, fr),
            "flavour": T(flavour, src.quote_of(src.section(fr))),
            "income": "3d6x5",
            "rules": [rule(rid, ren, rfr, rtext, src.bold_rule(fr, rfr)) for rid, ren, rfr, rtext in rules],
            "trackers": [],
            "sourceRef": src.ref(95, fr),
        }
        for sid, en, fr, flavour, rules in STRONGHOLDS
    ]

    # ----------------------------------------------------------------------------
    # Campaign rules, names
    # ----------------------------------------------------------------------------
    thralls = src.section("Squelettes et Asservis")
    thrall_fr = [p for p in src.paragraphs(thralls) if not p.startswith("Table des blessures")]
    table_fr = []
    for l in thralls:
        cells = [c.strip() for c in l.strip("|").split("|")]
        if l.startswith("|") and cells[0] not in ("Résultat", "---"):
            table_fr.append(f"{cells[0]} - {clean(cells[1])}")
    data["campaignRules"] = [
        rule("death-of-a-leader", "Death of a Leader", "Mort d'un Chef",
             "During the campaign, if your leader is killed, and you choose to promote a champion (pg xx), the following "
             "champions are eligible:", src.paragraphs(src.section("Mort d'un Chef"))[0]),
        rule("skeletons-and-thralls", "Skeletons & Thralls", "Squelettes et Asservis",
             "Fighters with the Thrall keyword do not gain experience. They cannot advance levels.\n"
             "In addition Skeletons and Thralls do not use the standard injury table (pg xx). Instead they use the "
             "following Skeleton & Thrall Injury Table (d6):\n"
             "1 - Laid to Rest: The undead creature is undone. Treat this result as killed (pg xx).\n"
             "2-6 - Unscathed: The fighter suffers no lasting effects.",
             "\n".join(thrall_fr).replace("Table des blessures des Squelettes et des Asservis suivante :",
                                          "Table des blessures des Squelettes et des Asservis suivante (D6) :")
             + "\n" + "\n".join(table_fr)),
    ]
    data["leaderSuccession"] = [
        {"formerLeaderId": "bloodcursed-noble", "eligibleChampionIds": ["bloodcursed-courtesan", "bloodcursed-knight"]},
        {"formerLeaderId": "necromancer", "eligibleChampionIds": ["necromancers-apprentice"]},
        {"formerLeaderId": "barrow-lord", "eligibleChampionIds": ["barrow-champion"]},
    ]
    data["nameTable"] = {"die": "d66", "sourceRef": src.ref(96, "Noms des Death Coven"),
                         "entries": src.names("Noms des Death Coven")}

    # ----------------------------------------------------------------------------
    # Wargear
    # ----------------------------------------------------------------------------
    MEL = "Armurerie du Coven - Armes de corps à corps"
    NOTE_ENS = T("You can use any weapon to represent the Ensorcelled Weapon.",
                 "Vous pouvez utiliser n'importe quelle arme pour représenter l'Arme ensorcelée.")


    def m(*args, page=99, md_ref=MEL, **kw):
        return melee(src, *args, page, md_ref, **kw)


    wargear = [
        m("arcane-staff", "Arcane Staff", "Bâton arcanique", 10, 2, 0, 1, "d3", ["arcane", "off-hand"]),
        m("axe", "Axe", "Hache", 16, 3, -1, 1, "d3", ["off-hand"]),
        m("biting-fangs", "Biting Fangs", "Crocs mordants", 0, 4, 0, 1, 1, ["natural-weapon"],
          page=112, md_ref="Dire Bat", purchasable=False),
        m("club-mace-hammer", "Club/Mace/Hammer", "Gourdin/Masse/Marteau", 14, 3, 0, 1, "d3", ["bludgeon", "off-hand"]),
        m("cursed-blade", "Cursed Blade", "Lame maudite", 40, 3, -1, 1, "d3", ["arcane", "guard", "off-hand", "poison"]),
        m("dagger", "Dagger", "Dague", 10, 3, 0, 1, "d3", ["off-hand"]),
        m("ensorcelled-weapon", "Ensorcelled Weapon", "Arme ensorcelée", 26, 3, -1, 1, "d3", ["arcane"], note=NOTE_ENS),
        m("flail", "Flail", "Fléau", 14, 3, 0, 1, "d3", ["off-hand", "wrap"]),
        m("great-mace", "Great Mace", "Grande masse", 38, 3, -1, 2, "d3+1", ["bludgeon", "two-handed", "unwieldy"]),
        m("halberd", "Halberd", "Hallebarde", 34, 3, -1, 1, "d3+1", ["brace", "two-handed", "unwieldy"]),
        m("heavy-axe", "Heavy Axe", "Hache lourde", 40, 3, -2, 2, "d3+1", ["two-handed", "unwieldy"]),
        m("necrotic-bite", "Necrotic Bite", "Morsure nécrotique", 0, 3, -1, 1, "d3", ["natural-weapon"],
          page=112, md_ref="Dire Wolf", purchasable=False),
        m("ogre-blade", "Ogre Blade", "Lame d'ogre", 36, 3, -1, 2, "d3+1", ["off-hand"]),
        m("ogre-great-weapon", "Ogre Great Weapon", "Grande arme d'ogre", 50, 3, -2, 3, "d3+2", ["two-handed"]),
        m("ogre-mace", "Ogre Mace", "Masse d'ogre", 38, 3, -1, 2, "d3+1", ["bludgeon", "off-hand"]),
        m("spear", "Spear", "Lance", 16, 3, 0, 1, "d3", ["brace", "two-handed"]),
        m("stone-talons", "Stone Talons", "Serres de pierre", 0, 3, -1, 2, "d3+1", ["bludgeon", "natural-weapon"],
          page=111, md_ref="Gargoyle", purchasable=False),
        m("sword", "Sword", "Épée", 18, 3, 0, 1, "d3", ["guard", "off-hand"]),
        m("wulfen-claws", "Wulfen Claws", "Griffes de loup", 0, 3, -1, 2, "d3+1", ["bludgeon", "natural-weapon"],
          page=106, md_ref="Lycanfell Beast", purchasable=False),
        m("zombie-bite", "Zombie Bite", "Morsure de zombie", 0, 3, 0, 1, "d3", ["natural-weapon", "poison"],
          page=110, md_ref="Zombie", purchasable=False),
    ]

    ITEMS = [
        ("cuirass", "Cuirass", "Cuirasse", "armour", 20, 5, None, False, None, {}),
        ("warded-robes", "Warded Robes", "Robe de protection", "armour", 10, 6, None, False,
         "Roll a dice each time a fighter equipped with this armour is targeted by a spell cast by an enemy fighter. "
         "On a 4+, the spell has no effect on this fighter.", {}),
        ("full-plate", "Full-plate", "Armure de plates", "armour", 40, 4, None, False, FULL_PLATE_EN,
         {"restrictions": FULL_PLATE_RESTRICTION}),
        ("ancient-banner", "Ancient Banner", "Bannière ancienne", "item", 25, None, 1, True,
         "While this fighter is on the battlefield, you can re-roll flee tests.\n"
         "You can re-roll Willpower tests made by friendly fighters while they are within 12\" of this fighter and this "
         "fighter is visible to them.", {}),
        ("bestial-companion", "Bestial Companion", "Compagnon bestial", "item", 30, None, 1, False,
         "Each time this fighter makes a melee attack, they can make 1 additional attack with the following weapon:",
         {"grants": {"rend": -1, "damage": 2, "critDamage": "d3+1", "traits": [{"key": "natural-weapon"}]},
          "note_en": "This item is designed for miniatures that feature other creatures such as dire wolves on the same "
                     "base. The Bestial Companion is not considered a separate fighter for any rules."}),
        ("grimoire", "Grimoire", "Grimoire", "item", 15, None, 1, False,
         "Once per battle, after this fighter has made casting roll, you can re-roll the casting roll.", {}),
        ("spirit-guardian", "Spirit Guardian", "Esprit gardien", "item", 45, None, 1, False,
         "Once per battle this fighter can use the following bonus action:\n"
         "Invoke Ethereal Protection [Bonus Action]: Until the end of the round, this fighter ignores Rend for attacks "
         "that target them. In addition, each time they make a successful armour roll against a melee attack, the "
         "attacking fighter suffers 1 damage.",
         {"note_en": "This item is designed for miniatures that feature other creatures such as spirits and ghosts on "
                     "the same base. The Spirit Guardian is not considered a separate fighter for any rules."}),
        ("shield", "Shield", "Bouclier", "item", 10, None, None, True,
         "Improve this fighter's Armour value by 1, to a maximum of 2+. (For example, 6+ becomes 5+).",
         {"improvement": 1}),
        ("winged-familiar", "Winged Familiar", "Familier ailé", "item", 12, None, 1, False,
         "Once per battle this fighter can use the following bonus action:\n"
         "Harry [Bonus Action]: Pick a visible enemy fighter within 24\". Until the end of the round, that enemy fighter "
         "is harried. While a fighter is harried, each time they make a Move or Action they must pass a Willpower test, "
         "else they lose that Move or Action.", {}),
    ]
    for gid, en, fr, kind, cost, armour, rarity, held, en_text, extra in ITEMS:
        fr_text, fr_note = src.item_text(fr)
        note_en = extra.pop("note_en", None)
        wargear.append(
            gear(src, gid, en, fr, kind, cost, 100, fr, armour=armour, rarity=rarity,
                 keywords=["held-item"] if held else [],
                 text=None if en_text is None else T(en_text, fr_text),
                 note=None if note_en is None else T(note_en, fr_note), **extra)
        )
    data["wargear"] = wargear

    by_fr = {w["name"]["fr"]: w for w in wargear}
    LISTS = [
        ("main", "Main List", "Liste principale"),
        ("champion", "Champion List", "Liste des Champions"),
        ("zombie-ogre", "Zombie Ogre List", "Liste des Zombie Ogres"),
        ("practitioner", "Practitioner List", "Liste des Praticiens"),
    ]
    data["armouryLists"] = [
        {"id": lid, "name": T(en, fr), "sourceRef": src.ref(98, fr), "entries": src.armoury_list(fr, by_fr)}
        for lid, en, fr in LISTS
    ]

    # ----------------------------------------------------------------------------
    # Fighters
    # ----------------------------------------------------------------------------
    NOBLE_BLOOD = ("noble-blood", "Noble Blood", "Sang noble", "When this fighter is recruited, pick 1 skill for them.")
    UNSHAKEABLE = ("unshakeable", "Unshakeable", "Inébranlable", UNSHAKEABLE_EN)


    def spellcaster(rid, en, fr, lore_en, n):
        spells = "2 spells from it to be their signature spells" if n == 2 else "1 spell from it to be their signature spell"
        return (rid, en, fr, f"This fighter knows the {lore_en}. When they are recruited, pick {spells}. In addition, at "
                             "the start of each battle they prepare 1 random spell from it.")


    MAIN_CHAMP = "This fighter can be equipped with wargear from the Main List and Champion List from the Coven Armoury."
    PRACT = "This fighter can be equipped with wargear from the Practitioner List from the Coven Armoury."

    FIGHTERS = [
        # id, name, category, keywords, cost, limit, stats, lists, fixed, xp, lores, grants, rules, wargear, quote, page
        ("bloodcursed-noble", "Bloodcursed Noble", "leader", ["leader", "undead", "wizard", "vampyre", "aristocrat"], 185,
         None, (5, 3, 5, 6, 5, 4, 6), ["main", "champion"], [], (60, "d6"), ["lore-of-blood"], (1, 1, "lore-of-blood"),
         [NOBLE_BLOOD, spellcaster("spellcraft", "Spellcraft", "Art de la magie", "Lore of Blood", 1)],
         MAIN_CHAMP, "The City belongs to the night.", 105),
        ("necromancer", "Necromancer", "leader", ["leader", "human", "wizard"], 165, None, (5, 4, 6, 6, 3, 5, 5),
         ["practitioner"], [], (60, "d6"), ["lore-of-necromancy"], (0, 2, "lore-of-necromancy"),
         [spellcaster("master-of-necromancy", "Master of Necromancy", "Maître de la nécromancie", "Lore of Necromancy", 2)],
         PRACT, "I have studied the art of death longer than you have drawn breath.", 105),
        ("lycanfell-noble", "Lycanfell Noble", "leader", ["leader", "undead", "werwulf", "aristocrat"], 170, None,
         (5, 3, 4, 6, 4, 4, 6), ["main", "champion"], [], (60, "d6"), [], (1, 0, None),
         [NOBLE_BLOOD,
          ("bestial-transformation", "Bestial Transformation", "Transformation bestiale",
           "Once per battle, at the start of this fighter's activation it can transform. If it does so, remove this "
           "fighter from the battlefield and set up the Lycanfell Beast at the same location (or as close to it as "
           "possible). Any damage the Lycanfell Noble has suffered, the Lycanfell Beast has also suffered.\n"
           "The Lycanfell Beast immediately makes its activation.")],
         MAIN_CHAMP, "The wind bears the scent of blood. The hunt calls me once more.", 106),
        ("lycanfell-beast", "Lycanfell Beast", "leader", ["leader", "undead", "werwulf"], 0, None,
         (5, 2, 6, 5, 5, 4, 8), [], ["wulfen-claws"], (0, None), [], (0, 0, None),
         [("temperamental-transformation", "Temperamental Transformation", "Transformation capricieuse",
           "Each time this fighter activates, at the end of its activation it must pass a Willpower test else the "
           "transformation ends.\n"
           "When the transformation ends, remove this fighter from the battlefield then set up the Lycanfell Noble at "
           "the same location (or as close to it as possible). Any damage the Lycanfell Beast has suffered, the "
           "Lycanfell Noble has also suffered. If this would reduce the Lycanfell Noble to zero life, they are taken "
           "down."),
          ("vestiges-of-the-noble", "Vestiges of the Noble", "Vestiges du Noble",
           "While this fighter is on the battlefield, it is treated as a new fighter that is added to the warband. It "
           "has none of the Lycanfell Noble's wargear, skills or injuries etc. If the Lycanfell Noble was under the "
           "effects of a spell or another rule, this fighter is not affected. In addition, the following rules apply:\n"
           "- Scenarios: If the scenario gave the Lycanfell Noble a mark (such as being the Hit in Street of Death), "
           "this fighter has that mark.\n"
           "- Treasure: If the Lycanfell Noble was carrying treasure when it transformed, this fighter is carrying the "
           "treasure. Likewise, if this fighter is carrying treasure when the transformation ends, the Lycanfell Noble "
           "is now carrying that treasure.\n"
           "- Taken Down: If this fighter is taken down, the Lycanfell Noble is also taken down, (together they count "
           "as 1 for the purposes of flee tests).\n"
           "- Experience: Any bonus experience this fighter would have earned is granted to the Lycanfell Noble "
           "instead.")],
         "This fighter comes equipped with Wulfen Claws (see below).", "Flesh... blood... marrow...", 106),
        ("barrow-lord", "Barrow Lord", "leader", ["leader", "undead", "skeleton"], 130, None, (4, 3, 6, 6, 3, 4, 6),
         ["main", "champion"], [], (60, "d6"), [], (2, 0, None),
         [("noble-lineage", "Noble Lineage", "Noble lignée", "When this fighter is recruited, pick 2 skills for them."),
          UNSHAKEABLE],
         MAIN_CHAMP, "I command thee to rise again.", 107),
        ("bloodcursed-courtesan", "Bloodcursed Courtesan", "champion",
         ["champion", "undead", "wizard", "vampyre", "aristocrat"], 125, 1, (5, 4, 6, 6, 5, 4, 4), ["practitioner"], [],
         (40, "d6"), ["lore-of-blood"], (0, 1, "lore-of-blood"),
         [spellcaster("blood-magic", "Blood Magic", "Magie du sang", "Lore of Blood", 1)],
         PRACT, "Come hither... I insist.", 107),
        ("bloodcursed-knight", "Bloodcursed Knight", "champion", ["champion", "undead", "vampyre", "aristocrat"], 95, 1,
         (5, 3, 5, 6, 5, 4, 5), ["main", "champion"], [], (40, "d6"), [], (1, 0, None),
         [("martial-lineage", "Martial Lineage", "Lignée martiale",
           "When this fighter is recruited, pick 1 skill for them.")],
         MAIN_CHAMP, "Kneel, and I may grant you a swift death.", 108),
        ("misbegotten", "Misbegotten", "champion", ["champion", "undead", "vampyre"], 65, 1, (5, 4, 5, 6, 5, 2, 4),
         ["main", "champion"], [], (30, "d6"), [], (0, 0, None),
         [("bloodline-mutations", "Bloodline Mutations", "Mutations de lignée",
           "When this fighter is recruited, you can pick 1 of the following bloodline mutations, (each comes with a "
           "silver cost):")],
         MAIN_CHAMP, "No... look not upon me...", 108),
        ("necromancers-apprentice", "Necromancer's Apprentice", "champion", ["champion", "human", "wizard"], 120, 1,
         (5, 4, 6, 6, 3, 4, 4), ["practitioner"], [], (40, "d6"), ["lore-of-necromancy"], (0, 1, "lore-of-necromancy"),
         [spellcaster("spellcraft", "Spellcraft", "Art de la magie", "Lore of Necromancy", 1)],
         PRACT, "The secrets of the grave shall be mine in time.", 109),
        ("barrow-champion", "Barrow Champion", "champion", ["champion", "undead", "skeleton"], 85, None,
         (4, 3, 6, 6, 3, 4, 5), ["main", "champion"], [], (40, "d6"), [], (1, 0, None),
         [("veteran-in-life", "Veteran in Life", "Vétéran de son vivant",
           "When this fighter is recruited, pick 1 skill for them."), UNSHAKEABLE],
         MAIN_CHAMP, "Death does not relinquish duty.", 109),
        ("skeleton-warrior", "Skeleton Warrior", "henchman", ["henchman", "undead", "skeleton", "thrall"], 40, None,
         (4, 4, 6, 6, 3, 2, 4), ["main"], [], (0, None), [], (0, 0, None), [UNSHAKEABLE],
         "This fighter can be equipped with wargear from the Main List from the Coven Armoury.", None, 110),
        ("zombie", "Zombie", "henchman", ["henchman", "undead", "zombie", "thrall"], 35, None, (4, 5, 6, 6, 1, 2, 4), [],
         ["zombie-bite"], (0, None), [], (0, 0, None), [UNSHAKEABLE],
         "This fighter is equipped with a zombie bite (see below), they cannot be equipped with any other wargear.",
         None, 110),
        ("zombie-ogre", "Zombie Ogre", "brute", ["brute", "undead", "zombie", "thrall"], 95, None, (4, 4, 6, 6, 1, 2, 8),
         ["zombie-ogre"], [], (0, None), [], (0, 0, None), [UNSHAKEABLE],
         "This fighter can be equipped with wargear from the Zombie Ogre List from the Coven Armoury.", None, 111),
        ("gargoyle", "Gargoyle", "brute", ["brute", "undead", "gargoyle", "thrall", "fly"], 150, None,
         (6, 3, 6, 6, 3, 3, 8), [], ["stone-talons"], (0, None), [], (0, 0, None), [UNSHAKEABLE],
         "This fighter is equipped with stone talons (see below), they cannot be equipped with any other wargear.",
         None, 111),
        ("dire-bat", "Dire Bat", "beast", ["beast", "undead", "bat", "fly"], 60, None, (10, 5, None, 6, 3, 1, 3), [],
         ["biting-fangs"], (0, None), [], (0, 0, None),
         [("vampyric-bite", "Vampyric Bite", "Morsure vampirique",
           "Each time an enemy suffers 1 or more damage from a melee attack made by this fighter, heal this fighter 1 "
           "life point.")],
         "This fighter is equipped with biting fangs (see below), they cannot be equipped with any other wargear.",
         None, 112),
        ("dire-wolf", "Dire Wolf", "beast", ["beast", "undead", "dog"], 50, None, (7, 3, None, 6, 4, 1, 5), [],
         ["necrotic-bite"], (0, None), [], (0, 0, None),
         [("sniff-em-out", "Sniff 'em Out", "Débusquez-les !",
           "Enemy fighters that are hidden are not hidden while they are within 9\" of this fighter."),
          ("trackers", "Trackers", "Pisteurs",
           "Each aftermath sequence, when you search the city, if your search party includes any Dire Wolves, you can "
           "re-roll the exploration roll.")],
         "This fighter is equipped with a necrotic bite (see below), they cannot be equipped with any other wargear.",
         None, 112),
    ]

    MUTATIONS = [
        ("bat-wings", "Bat Wings", "Ailes de chauve-souris", 15, {}, ["fly"], "This fighter has the Fly keyword."),
        ("wulfen-legs", "Wulfen Legs", "Pattes de loup", 10, {"mv": 7}, [], "This fighter's Move value is 7\"."),
        ("hulking-form", "Hulking Form", "Carrure massive", 30, {"lf": 8}, [], "This fighter's Life value is 8."),
    ]

    data["fighters"] = []
    for (fid, name, cat, kws, cost, limit, st, lists, fixed, xp, lores, grants, rules, wg_en, quote_en,
         page) in FIGHTERS:
        lines = src.scroll(name)
        special = []
        for rid, ren, rfr, rtext in rules:
            fr_text = src.bullet_rule(lines, rfr, sub_bullets=rid != "bloodline-mutations")
            special.append(rule(rid, ren, rfr, rtext, fr_text))
        options = None
        if fid == "misbegotten":
            subs = src.sub_bullets(lines, "Mutations de lignée")
            choices = []
            for (oid, oen, ofr, ocost, stat_set, add_kw, otext), sub in zip(MUTATIONS, subs):
                assert sub.startswith(ofr), sub
                choices.append({"id": oid, "name": T(oen, ofr), "cost": ocost, "statSet": stat_set,
                                "addKeywords": add_kw, "text": T(otext, cap(sub.split(" : ", 1)[1]))})
            options = {"max": 1, "choices": choices}
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
                "options": options,
                "formOf": "lycanfell-noble" if fid == "lycanfell-beast" else None,
                "wargearText": T(wg_en, src.wargear_text(lines)),
                "quote": None if quote_en is None else T(quote_en, q),
                "sourceRef": src.ref(page, name),
            }
        )

    # ----------------------------------------------------------------------------
    # Skills
    # ----------------------------------------------------------------------------
    SKILLS = {
        "dark-aristocracy": [
            ("cloud-of-bats", "Cloud of Bats", "Nuée de chauves-souris",
             "Once per battle, this fighter can use the following bonus action:\n"
             "Cloud of Bats [Bonus Action]: Remove the fighter from the battlefield, set them up again anywhere on the "
             "battlefield, wholly within 9\" horizontally of their previous location. They cannot be set up engaged in "
             "melee."),
            ("mesmeric-gaze", "Mesmeric Gaze", "Regard hypnotique",
             "Once per battle, when this fighter makes a Melee Attack action, it can attempt to mesmerise the defending "
             "fighter. If they do so, the commanding players each roll a dice and add their fighter's Willpower value to "
             "the score. If this fighter's total exceeds the defending fighter's total, they are mesmerised for that "
             "action. While they are mesmerised, subtract 1 from the Attacks value of their melee weapons (off-hand "
             "attacks are not affected)."),
            ("unholy-strength", "Unholy Strength", "Force impie",
             "This fighter's melee weapons gain the Bludgeon weapon trait."),
            ("supernatural-healing", "Supernatural Healing", "Guérison surnaturelle",
             "This fighter cannot suffer permanent injuries. If they suffer a lasting injury it is always temporary.\n"
             "In addition, if this fighter is killed, you can immediately make a Willpower test for them. If passed, "
             "they are not killed but must miss the next d3 battles as they slumber. Pick a Champion in your warband to "
             "be the Leader in their absence. That fighter temporarily gains the Leader keyword and loses the Champion "
             "keyword until the Leader returns."),
            ("leech-blood", "Leech Blood", "Drain de sang",
             "Once per battle, this fighter can use the following bonus action:\n"
             "Leech Blood [Bonus Action]: Each enemy fighter within 9\" of this fighter must take a Willpower test. If "
             "they fail, they suffer 1 damage and this fighter heals 1 life."),
            ("relentless-attacker", "Relentless Attacker", "Attaquant implacable",
             "Subtract 1 from parry rolls made against attacks made by this fighter."),
        ],
        "undying-lords": [
            ("death-march", "Death March", "Marche de la mort",
             "Once per battle, this fighter can use the following bonus action:\n"
             "Death March [Bonus Action]: Until the end of the round, add 2 to the Move value of friendly Thralls who "
             "begin a move while they are within 9\" of this fighter."),
            ("rise-again", "Rise Again", "Se relever",
             "When this fighter is taken down for the first time in battle, mark its location with a token. At the start "
             "of each subsequent round you can roll a dice, on a 6 the fighter returns.\n"
             "If the fighter returns, set them up on the battlefield as close to the marked location as possible. They "
             "heal d3 life points. A fighter can only return once per battle in this manner."),
            ("chill-touch", "Chill Touch", "Toucher glacial",
             "Add 1 to the Critical Damage value of this fighter's melee weapons."),
            ("dread-aura", "Dread Aura", "Aura de terreur",
             "This fighter causes fear. Enemy fighters that start their activation engaged in melee with a fighter that "
             "causes fear must pass a Willpower test. If they fail, their activation immediately ends.\n"
             "Enemy fighters that also cause fear can ignore this rule."),
            ("drag-down-into-the-earth", "Drag Down Into the Earth", "Entraîner sous terre",
             "When this fighter is taken down while engaged in melee, pick 1 fighter it is engaged with, they suffer d3 "
             "damage."),
            ("kingsguard", "Kingsguard", "Garde royale",
             "This skill can only be picked for a Champion.\n"
             "If an enemy fighter finishes a Charge Move engaged in melee with a friendly Leader, and this fighter is "
             "not engaged, this fighter can make a Charge Move. This fighter must finish that Charge Move engaged in "
             "melee with that enemy fighter. If it does so, the enemy fighter must target this fighter with any melee "
             "attack actions it makes this activation."),
        ],
    }
    TABLES = [
        ("dark-aristocracy", "Dark Aristocracy", "Sombre aristocratie", 103,
         {"kind": "keywords", "anyOf": [["undead", "aristocrat", "leader"], ["undead", "aristocrat", "champion"]]},
         T("Undead Aristocrat Leaders and Champions only", "Chefs et Champions Morts-vivants Aristocrates uniquement")),
        ("undying-lords", "Undying Lords", "Seigneurs immortels", 104,
         {"kind": "keywords", "anyOf": [["undead", "skeleton", "leader"], ["undead", "skeleton", "champion"]]},
         T("Undead Skeleton Leaders and Champions only", "Chefs et Champions Morts-vivants Squelettes uniquement")),
    ]
    data["skillTables"] = []
    for tid, en, fr, page, elig, label in TABLES:
        skills = []
        for sid, sen, sfr, text in SKILLS[tid]:
            skill = {"id": sid, "name": T(sen, sfr)}
            if sid == "kingsguard":
                skill["onlyCategories"] = ["champion"]
            skill["text"] = T(text, "\n".join(src.paragraphs(src.section(sfr))))
            skill["sourceRef"] = src.ref(page, sfr)
            skills.append(skill)
        data["skillTables"].append({"id": tid, "name": T(en, fr), "eligibility": elig, "eligibilityLabel": label,
                                    "sourceRef": src.ref(page, fr), "skills": skills})

    # ----------------------------------------------------------------------------
    # Spell lores
    # ----------------------------------------------------------------------------
    SPELLS = {
        "lore-of-necromancy": [
            (1, "witchfire", "Witchfire", "Feu sorcier", "attack", 8, 12,
             "Place d3 witchfire tokens by the caster, to a maximum of 3. Once per activation, the caster can spend a "
             "witchfire token to make the following bonus action:\n"
             "Witchfire Attack [Bonus Action]: The closest visible enemy fighter within 12\" is targeted and hit with the "
             "following attack:",
             "Place 3 witchfire tokens by the caster (to a maximum of 3) instead of d3.", {"rend": 0, "damage": "d3"}),
            (2, "ethereal-armour", "Ethereal Armour", "Armure éthérée", "enchant", 8, 12,
             "Pick a visible friendly fighter within 6\" of the caster to be the target, that fighter becomes ethereal "
             "until the end of the round. While a fighter is ethereal, improve its Armour value by 1 (to a maximum of 2+).",
             "Increase the range of the spell from 6\" to 12\".", None),
            (3, "raise-zombie", "Raise Zombie", "Relever un Zombie", "summon", 9, 12,
             "A summoned Zombie fighter (pg xx) is added to the caster's warband until it is taken down. Set up the "
             "fighter within 3\" of the caster and not engaged in melee.\n"
             "A warband cannot have more than 3 summoned fighters at any time. If the caster's warband already has 3 "
             "summoned fighters, they cannot cast this spell.",
             "The fighter can be set up within 9\" of the caster and not engaged in melee.", None),
            (4, "twilight-translocation", "Twilight Translocation", "Translocation crépusculaire", "cantrip", 7, 12,
             "Pick another visible friendly fighter within 6\" of the caster to be the target, remove them from the "
             "battlefield and set them up again, anywhere on the battlefield within 15\" of the caster and not engaged "
             "in melee.", "When setting up the fighter, increase the range to 18\".", None),
            (5, "death-blast", "Death Blast", "Explosion de mort", "attack", 9, 12,
             "Place the blast template centred on a point within 12\" of the caster, it then scatters d6\".\n"
             "Each fighter in the template is targeted and hit with the following attack:",
             "It does not scatter.", {"rend": -1, "damage": "d3+1"}),
            (6, "balefire", "Balefire", "Feu funeste", "attack", 9, 13,
             "Place the flame template from the caster. Each fighter in the template is targeted and hit with the "
             "following attack:", "Add 1 to the Damage value.", {"rend": -2, "damage": "d3"}),
        ],
        "lore-of-blood": [
            (1, "draw-blood", "Draw Blood", "Saignée", "attack", 7, 10,
             "Pick the closest visible enemy fighter within 9\" of the casting fighter to be the target. That fighter "
             "suffers 1 damage and the caster heals 1 point of life.",
             "The target suffers 2 damage and the caster heals 2 points of life instead.", None),
            (2, "cursed-blades", "Cursed Blades", "Lames maudites", "enchant", 7, 10,
             "Pick a friendly fighter within 6\" of the caster to be the target, then pick 1 of the target's melee "
             "weapons to be cursed until the end of the round. While a weapon is cursed it gains the Arcane and Poison "
             "weapon traits.", "Increase the range of the spell from 6\" to 12\".", None),
            (3, "raise-skeleton", "Raise Skeleton", "Relever un Squelette", "summon", 10, 14,
             "A summoned Skeleton fighter (pg xx) is added to the caster's warband until it is taken down. Set up the "
             "fighter within 3\" of the caster and not engaged in melee.\n"
             "The Skeleton is equipped with a Cuirass and a Shield as well as 1 of the following melee weapons: Club, "
             "Spear or Sword.\n"
             "A warband cannot have more than 3 summoned fighters at any time. If the caster's warband already has 3 "
             "summoned fighters, they cannot cast this spell.",
             "The fighter can be set up within 9\" of the caster and not engaged in melee.", None),
            (4, "recall", "Recall", "Rappel", "cantrip", 7, 10,
             "Pick a friendly Thrall on the battlefield to be the target. Remove them from the battlefield and set them "
             "up again within 3\" of the caster and not engaged in melee.",
             "You can pick up to 2 friendly Thralls instead of 1.", None),
            (5, "bat-scream", "Bat Scream", "Cri de chauve-souris", "hex", 8, 10,
             "Place the flame template from the caster. Each fighter in its area is targeted. Each targeted fighter "
             "suffers 1 damage. In addition they must pass a Willpower test else they become disorientated until the end "
             "of the round. While a fighter is disorientated, subtract 1 from their attack and parry rolls.",
             "Subtract 1 from the Willpower tests targeted fighters make.", None),
            (6, "sanguine-spear", "Sanguine Spear", "Lance sanguine", "attack", 10, 14,
             "Draw a line from the caster, 12\" long and 1\" wide. Each visible enemy fighter the line passes through is "
             "hit by the following attack:\n"
             "For each point of damage a target suffers, heal the caster 1 life point.",
             "Increase the range to 15\".", {"rend": -2, "damage": "d3"}),
        ],
    }
    LORES = [
        ("lore-of-necromancy", "Lore of Necromancy", "Domaine de la Nécromancie", 101),
        ("lore-of-blood", "Lore of Blood", "Domaine du Sang", 102),
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
