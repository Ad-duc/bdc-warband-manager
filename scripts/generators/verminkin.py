"""
File:     scripts/generators/verminkin.py
Role:     Builds the Verminkin faction data from 07_verminkin.md (French texts
          extracted and cleaned) and the English playtest v1.03 texts typed
          below (typos fixed, see RULES_ASSUMPTIONS.md D03).
Author:   Adrien Duclaud
Created:  2026-10-12
License:  MIT
"""

import re

from common import Source, T, clean, rule, tr
from common import gear as common_gear

FILE = "07_verminkin.md"


def build(md_path):
    """Returns the faction data built from the translation file."""
    src = Source(md_path, FILE)
    # Shortcuts on the translation file.
    MD = src.md
    section = src.section
    paragraphs = src.paragraphs
    quote_of = src.quote_of
    ref = src.ref
    bullet_rule = src.bullet_rule
    stronghold_rule_fr = src.bold_rule
    spell_fr = src.spell


    def item_fr(heading):
        return src.item_text(heading)[0]


    def scroll(fid, name):
        lines = src.scroll(name)
        return name, lines


    def gear(gid, en, fr, kind, cost, page, md, **kw):
        return common_gear(src, gid, en, fr, kind, cost, page, md, **kw)


    MELEE_MD = "Armurerie des Vermineux - Armes de corps à corps"
    RANGED_MD = "Armurerie des Vermineux - Armes à distance"


    def melee(gid, en, fr, cost, a, r, d, c, traits, **kw):
        prof = {"attacks": a, "rend": r, "damage": d, "critDamage": c}
        return gear(gid, en, fr, "melee", cost, kw.pop("page", 79), kw.pop("md", MELEE_MD), profile=prof,
                    traits=tr(*traits), **kw)


    def ranged(gid, en, fr, cost, rng, a, r, d, c, traits, rarity=None):
        prof = {"range": rng, "attacks": a, "rend": r, "damage": d}
        if c is not None:
            prof["critDamage"] = c
        return gear(gid, en, fr, "ranged", cost, 80, RANGED_MD, profile=prof, traits=tr(*traits), rarity=rarity)


    intro = [clean(l[1:].strip()) for l in MD[2:8] if l.startswith("> ") and l[2:].strip()]
    data = {
        "_header": {
            "file": "src/data/verminkin.json",
            "role": "Verminkin faction data: origins, strongholds, campaign rules, names, fighters, Verminkin Armoury, skills, spell lores",
            "author": "Adrien Duclaud",
            "created": "2026-10-12",
            "license": "MIT for the file structure. Game content belongs to Sam Pearson (Black Death City).",
        },
        "schemaVersion": 1,
        "id": "verminkin",
        "name": T("Verminkin", "Vermineux"),
        "description": T(
            "Deep below the City lies a labyrinth of tunnels and old sewers that is the domain of the Verminkin. "
            "They are a race of insidious rat-men, long twisted by the dark sorceries that rise from the void-chasm below. "
            "The City's destruction has emboldened them to emerge at last, swarming onto the streets above to stake their claim.\n"
            "Creatures of ambush and deception, Verminkin prefer to operate from the shadows, waiting with prying eyes "
            "until their enemies' backs are turned before they strike.\n"
            "This deceitful nature may have spared the City from being wholly overrun, for the Verminkin are as quick to "
            "betray their own as their enemies, and bitter infighting is not uncommon between the different factions as "
            "each seeks to claw its way to dominance over the others.",
            "\n".join(intro),
        ),
        "armouryName": T("Verminkin Armoury", "Armurerie des Vermineux"),
        "sourceRef": ref(73, "Vermineux"),
        "assets": {"shield": "bouclier_verminkin.webp", "accentColor": None},
    }

    # ----------------------------------------------------------------------------
    # Origins
    # ----------------------------------------------------------------------------
    ORIGINS = [
        ("acolytes-of-plague", "Acolytes of Plague", "Acolytes de la peste", "pox-priest", "desecrated-chapel",
         "This warband believes it is they who brought about the Black Rot to the city, and now they seek to finish its work.",
         [{"fighterId": "pox-priests-apprentice", "limit": 2}]),
        ("rooftop-runners", "Rooftop Runners", "Coureurs des toits", "nightfang-assassin", "hidden-vantage",
         "Relishing their freedom from the tunnels below, this warband has taken to the rooftops of the city, operating "
         "under nightfall as assassins, thieves and smugglers.", []),
        ("sparkseer-coven", "Sparkseer Coven", "Cabale du Maître artificier", "sparkseer", "rickety-workshop",
         "This warband is led by a genius and slightly insane Sparkseer. These Verminkin scour the ruins of the City for "
         "scrap metals and alchemic ingredients to repurpose them into elaborate weapons and contraptions.",
         [{"fighterId": "rolling-contraption", "limit": 2}]),
        ("merciless-tyrant", "Merciless Tyrant", "Tyran impitoyable", "ironfang-warlord", "fortified-warren",
         "Led by a particularly cruel and ruthless Ironfang Warlord, their hatred for the men above drives their "
         "ambition of bringing the City under their heel.", []),
    ]
    data["origins"] = []
    for oid, en, fr, leader, stronghold, flavour, limits in ORIGINS:
        lines = section(fr)
        data["origins"].append(
            {
                "id": oid,
                "name": T(en, fr),
                "flavour": T(flavour, quote_of(lines)),
                "requiredLeaderId": leader,
                "strongholdId": stronghold,
                "specialRules": [],
                "profileLimits": limits,
                "sourceRef": ref(74, fr),
            }
        )

    # ----------------------------------------------------------------------------
    # Strongholds
    # ----------------------------------------------------------------------------
    STRONGHOLDS = [
        ("desecrated-chapel", "Desecrated Chapel", "Chapelle profanée",
         "This once holy place now has walls blackened with mould and dripping filth. It has become an epicentre of the "
         "Black Rot. A place where the Pox Priest and his apprentices practise dark communion.",
         [("prayers-of-plague", "Prayers of Plague", "Prières de peste",
           "Each battle, before you determine prepared spells, you can pick 1 friendly Priest in your warband. Instead of "
           "randomly determining the spell they have prepared from a Spell Lore, you can pick.")]),
        ("hidden-vantage", "Hidden Vantage", "Poste d'observation caché",
         "Situated near the City's old market district, this ruined tower is now only accessible from the surrounding rooftops.",
         [("run-the-roofs", "Run the Roofs", "Courir les toits",
           "If the scenario instructs you to set up fighters near an entry point (for example, wholly within 6\" of an "
           "entry point) you can pick up to d3 of those fighters to instead be set up on the roofs. If you do so, these "
           "fighters can be set up anywhere on the battlefield that is wholly within 12\" horizontally of the centre of the "
           "battlefield, is more than 9\" from all enemy fighters, and isn't on the battlefield floor.")]),
        ("rickety-workshop", "Rickety Workshop", "Atelier branlant",
         "Erupting from a chasm in the city streets, this makeshift shanty of platforms and pulleys is wreathed in smoke "
         "as the Sparkseer's lackeys toil day and night, assembling bizarre contraptions from scavenged scrap.",
         [("mad-tinkerers", "Mad Tinkerers", "Bricoleurs fous",
           "- When making an injury roll for a friendly Contraption, you can roll twice and pick either result.\n"
           "- Before each battle begins, you can pick 1 friendly Sparkseer. That fighter starts the battle with 3 "
           "engineering points instead of d3.")]),
        ("fortified-warren", "Fortified Warren", "Terrier fortifié",
         "Each night, the warriors of the fortified warren gather to watch their kin battle in the fighting pits. The "
         "Ironfang Warlord encourages such contests, for every dead rival is one less blade pointed at his back.",
         [("fighting-pits", "Fighting Pits", "Fosses de combat",
           "After each battle, before the aftermath sequence, you can pick 2 friendly Champion or Henchmen fighters that "
           "were not taken down during the battle to fight in the pits. Resolve the fight as follows:\n"
           "Pick 1 of the fighters to command and let your opponent command the other. The 2 fighters are placed engaged "
           "in melee. Roll-off and start alternating melee attack actions starting with the winner. The fighters cannot "
           "make any other actions or moves. Alternate making melee attack actions until 1 fighter is taken down. That "
           "fighter suffers an injury as normal. The other fighter is the winner and earns 10 bonus experience.")]),
    ]
    data["strongholds"] = []
    for sid, en, fr, flavour, rules in STRONGHOLDS:
        lines = section(fr)
        data["strongholds"].append(
            {
                "id": sid,
                "name": T(en, fr),
                "flavour": T(flavour, quote_of(lines)),
                "income": "3d6x5",
                "rules": [rule(rid, ren, rfr, rtext, stronghold_rule_fr(fr, rfr)) for rid, ren, rfr, rtext in rules],
                "trackers": [],
                "sourceRef": ref(75, fr),
            }
        )

    # ----------------------------------------------------------------------------
    # Campaign rules, names
    # ----------------------------------------------------------------------------
    death = paragraphs(section("Mort d'un Chef"))[0]
    data["campaignRules"] = [
        rule("death-of-a-leader", "Death of a Leader", "Mort d'un Chef",
             "During the campaign, if your leader is killed, and you choose to promote a champion (pg xx), the following "
             "champions are eligible:", death)
    ]
    data["leaderSuccession"] = [
        {"formerLeaderId": "pox-priest", "eligibleChampionIds": ["pox-priests-apprentice"]},
        {"formerLeaderId": "nightfang-assassin", "eligibleChampionIds": ["assassins-apprentice"]},
        {"formerLeaderId": "ironfang-warlord", "eligibleChampionIds": ["verminkin-champion"]},
        {"formerLeaderId": "sparkseer", "eligibleChampionIds": ["sparkseers-apprentice"]},
    ]
    names = {}
    for l in section("Noms des Vermineux"):
        cells = [c.strip() for c in l.strip("|").split("|")]
        if l.startswith("|") and re.match(r"^\d0$", cells[0]):
            for col, name in enumerate(cells[1:], start=1):
                names[f"{cells[0][0]}{col}"] = name
    data["nameTable"] = {"die": "d66", "sourceRef": ref(76, "Noms des Vermineux"), "entries": names}

    # ----------------------------------------------------------------------------
    # Wargear
    # ----------------------------------------------------------------------------


    ENSORCELLED_NOTE = T(
        "You can use any weapon to represent the Ensorcelled Weapon.",
        "Vous pouvez utiliser n'importe quelle arme pour représenter l'Arme ensorcelée.",
    )

    wargear = [
        melee("arcane-staff", "Arcane Staff", "Bâton arcanique", 10, 2, 0, 1, "d3", ["arcane", "off-hand"]),
        melee("axe", "Axe", "Hache", 16, 3, -1, 1, "d3", ["off-hand"]),
        melee("club-mace-hammer", "Club/Mace/Hammer", "Gourdin/Masse/Marteau", 14, 3, 0, 1, "d3", ["bludgeon", "off-hand"]),
        melee("crushing-bulk", "Crushing Bulk", "Carcasse écrasante", 0, 3, -1, 2, "d3+1", ["bludgeon", "natural-weapon"],
              purchasable=False, page=92, md="Engin roulant"),
        melee("dagger", "Dagger/Punch Dagger", "Dague/Dague de poing", 10, 3, 0, 1, "d3", ["off-hand"]),
        melee("ensorcelled-halberd", "Ensorcelled Halberd", "Hallebarde ensorcelée", 52, 3, -1, 1, "d3+1",
              ["arcane", "brace", "two-handed", "unwieldy"]),
        melee("ensorcelled-weapon", "Ensorcelled Weapon", "Arme ensorcelée", 26, 3, -1, 1, "d3", ["arcane"],
              note=ENSORCELLED_NOTE),
        melee("flail", "Flail", "Fléau", 14, 3, 0, 1, "d3", ["off-hand", "wrap"]),
        melee("halberd", "Halberd", "Hallebarde", 34, 3, -1, 1, "d3+1", ["brace", "two-handed", "unwieldy"]),
        melee("heavy-flail", "Heavy-Flail", "Fléau lourd", 38, 3, -1, 2, "d3+1", ["two-handed", "unwieldy", "wrap"]),
        melee("iron-claw", "Iron Claw", "Griffe de fer", 12, 4, 0, 1, 1, ["off-hand"]),
        melee("nasty-bite", "Nasty Bite", "Morsure infecte", 0, 4, 0, 1, 1, ["natural-weapon", "poison"],
              purchasable=False, page=92, md="Rat géant"),
        melee("oversized-claw", "Oversized Claw", "Griffe démesurée", 0, 3, 0, 2, "d3+1", ["bludgeon", "natural-weapon"],
              purchasable=False, page=91, md="Rat-mutant"),
        melee("poison-blade", "Poison Blade", "Lame empoisonnée", 20, 3, -1, 1, "d3", ["guard", "off-hand", "poison"]),
        melee("rat-mutant-blade", "Rat-Mutant Blade", "Lame de Rat-mutant", 36, 3, -1, 2, "d3+1", ["off-hand"]),
        melee("spark-drill", "Spark-Drill", "Foreuse à étincelles", 62, 3, -3, 1, "d3+1", ["arcane", "two-handed"]),
        melee("spark-powered-fists", "Spark-Powered Fists", "Poings à étincelles", 60, 3, -2, 2, "d3+1",
              ["arcane", "bludgeon", "two-handed"]),
        melee("spear", "Spear", "Lance", 16, 3, 0, 1, "d3", ["brace", "two-handed"]),
        melee("sword", "Sword", "Épée", 18, 3, 0, 1, "d3", ["guard", "off-hand"]),
        ranged("arc-lightning-gun", "Arc-Lightning Gun", "Lance-éclairs", 90, 18, 6, 0, 1, "d3",
               ["arcane", "heavy", "misfire", "rare", "two-handed", "volley"], 1),
        ranged("blackpowder-pistol", "Blackpowder Pistol", "Pistolet à poudre noire", 18, 12, 1, -1, 2, "d6+1",
               ["misfire", "reload"]),
        ranged("flame-canister", "Flame-Canister", "Bonbonne à flammes", 50, "flame", 1, 0, "d3+1", None,
               ["flame", "one-use", "rare", "scare"], 2),
        ranged("heavy-gatling-gun", "Heavy Gatling Gun", "Gatling lourde", 110, 16, 3, -1, 2, "d6+1",
               ["heavy", "misfire", "rare", "two-handed", "volley"], 1),
        ranged("long-rifle", "Long Rifle", "Fusil long", 70, 30, 1, -2, 2, "d6+2", ["heavy", "misfire", "two-handed"]),
        ranged("orb-bombs", "Orb Bombs", "Orbes explosifs", 32, 8, 1, 0, "d3+1", None, ["blast", "one-use", "rare"], 5),
        ranged("orb-launcher", "Orb Launcher", "Lance-orbes", 100, 20, 1, 0, "d3+1", None,
               ["blast", "misfire", "rare", "reload", "two-handed"], 1),
        ranged("repeater-pistol", "Repeater Pistol", "Pistolet à répétition", 30, 12, 1, -1, 2, "d6+1", ["misfire"]),
        ranged("rocket-launcher", "Rocket Launcher", "Lance-roquettes", 75, 30, 1, -1, "d6+1", None,
               ["blast", "heavy", "misfire", "one-use", "rare", "two-handed"], 1),
        ranged("sling", "Sling", "Fronde", 12, 16, 1, 0, 1, "d3", []),
        ranged("throwing-stars", "Throwing Stars", "Étoiles de jet", 10, 8, 1, 0, 1, "d3", ["poison"]),
    ]


    ITEMS = [
        # id, en name, fr heading, kind, cost, page, armour, rarity, held, en text, extra
        ("heavy-plating", "Heavy Plating", "Blindage lourd", "armour", 30, 81, 5, None, False,
         "Subtract 1 from the Move value of fighters equipped with this armour.", {"stat_modifiers": {"mv": -1}}),
        ("warded-robes", "Warded Robes", "Robe de protection", "armour", 10, 81, 6, None, False,
         "Roll a dice each time a fighter equipped with this armour is targeted by a spell cast by an enemy fighter. "
         "On a 4+, the spell has no effect on this fighter.", {}),
        ("full-plate", "Full-plate", "Armure de plates", "armour", 40, 81, 4, None, False,
         "Fighters equipped with this armour cannot be equipped with two-handed ranged weapons with the exception of a "
         "Brace of Pistols.",
         {"restrictions": [{"type": "forbid-trait", "kind": "ranged", "trait": "two-handed", "exceptWargearIds": []}]}),
        ("bomb-rat", "Bomb Rat", "Rat-bombe", "item", 25, 81, None, 1, False,
         "Once per battle, while this fighter is not engaged in melee, they can make the following bonus action:\n"
         "Set Up Bomb Rat [Bonus Action]: A Giant Rat is summoned and added to the commanding player's warband. Set up "
         "the Giant Rat fighter within 3\" of the fighter and choose a number between 1 and 6. This number is the fuse "
         "length. Use a dice placed next to the Giant Rat to track the fuse length.\n"
         "Each time that Giant Rat activates, roll a dice. If the roll is greater than the fuse length, the bomb "
         "detonates. If the roll is equal or less than the fuse length, the Giant Rat is activated as normal and the "
         "fuse length is reduced by 1 (to a minimum of 1).\n"
         "When the bomb detonates, the blast template is centred on the Giant Rat. Each other fighter in the template is "
         "hit with the following attack, then the Giant Rat is taken down (it does not count towards flee tests): "
         "Rend -2, Damage d3.\n"
         "If the Giant Rat is taken down and the bomb has not yet detonated, roll a dice as above to see if it "
         "detonates or not.", {}),
        ("clan-banner", "Clan Banner", "Bannière de clan", "item", 25, 81, None, 1, True,
         "While this fighter is on the battlefield, you can re-roll flee tests.\n"
         "You can re-roll Willpower tests made by friendly fighters while they are within 12\" of this fighter and this "
         "fighter is visible to them.", {}),
        ("ensorcelled-bell", "Ensorcelled Bell", "Cloche ensorcelée", "item", 10, 81, None, 1, False,
         "Once per battle, you can re-roll a miscast roll made for this fighter.", {}),
        ("gas-mask", "Gas Mask", "Masque à gaz", "item", 10, 81, None, 6, False, "This fighter cannot be poisoned.", {}),
        ("grappling-hook", "Grappling Hook", "Grappin", "item", 5, 81, None, 2, False,
         "This fighter can climb high walls in the same manner as ladders.", {}),
        ("grimoire", "Grimoire", "Grimoire", "item", 15, 82, None, 1, False,
         "Once per battle, after this fighter has made casting roll, you can re-roll the casting roll.", {}),
        ("net", "Net", "Filet", "item", 30, 82, None, 3, True,
         "Once per battle, at the start of a melee attack action in which this fighter is either the attacking or "
         "defending fighter, they can throw the net. To do so, they take an Initiative test. If passed, the enemy "
         "fighter becomes entwined.\n"
         "While a fighter is entwined, subtract 1 from the Attacks value of their melee weapons (off-hand attacks are "
         "unaffected). Each time an entwined fighter is activated, they can take an Initiative test, if passed, they "
         "are no longer entwined.", {}),
        ("periscope", "Periscope", "Périscope", "item", 20, 82, None, 1, False,
         "While this fighter hasn't made a move in the same activation, add 5\" to the Range value of their two-handed "
         "ranged weapons (excluding those with the Flame weapon trait).", {}),
        ("shield", "Shield", "Bouclier", "item", 10, 82, None, None, True,
         "Improve this fighter's Armour value by 1, to a maximum of 2+. (For example, 6+ becomes 5+).",
         {"improvement": 1}),
        ("smoke-bomb", "Smoke Bomb", "Bombe fumigène", "item", 20, 82, None, 3, False,
         "Once per battle, while this fighter is engaged in melee, they can use the following bonus action:\n"
         "Drop Smoke Bomb [Bonus Action]: Remove this fighter from the battlefield and set it up again wholly within 6\" "
         "of its previous position and not engaged in melee.", {}),
        ("wheel-spikes", "Wheel-Spikes", "Pointes de roue", "item", 50, 82, None, None, False,
         "Improve the Rend value by 1 on this fighter's Crushing Bulk melee weapon and the attack dealt by the Splat! "
         "special rule.", {"improvements": [{"wargearIds": ["crushing-bulk"], "rend": 1}]}),
    ]
    for gid, en, fr, kind, cost, page, armour, rarity, held, en_text, extra in ITEMS:
        fr_text = item_fr(fr)
        if gid == "bomb-rat":
            # The attack table becomes a sentence, as in the English text.
            fr_text = fr_text.replace("flee test) :", "flee test) :")
            fr_text = fr_text.replace(
                "sans compter pour les tests de déroute :",
                "sans compter pour les tests de déroute : Perforation -2, Dégâts D3.",
            )
        wargear.append(
            gear(gid, en, fr, kind, cost, page, fr, armour=armour, rarity=rarity,
                 keywords=["held-item"] if held else [], text=T(en_text, fr_text), **extra)
        )
    data["wargear"] = wargear

    # ----------------------------------------------------------------------------
    # Armoury lists, read from the translation tables
    # ----------------------------------------------------------------------------
    by_fr = {w["name"]["fr"]: w for w in wargear}
    LISTS = [
        ("main", "Main List", "Liste principale"),
        ("rat-mutant", "Rat-Mutant List", "Liste des Rats-mutants"),
        ("champion", "Champion List", "Liste des Champions"),
        ("sparkseer", "Sparkseer List", "Liste des Artificiers"),
        ("contraption", "Contraption List", "Liste des Engins"),
        ("practitioner", "Practitioner List", "Liste des Praticiens"),
    ]
    data["armouryLists"] = []
    for lid, en, fr in LISTS:
        entries = []
        for l in section(fr):
            cells = [c.strip() for c in l.strip("|").split("|")]
            if not l.startswith("|") or cells[0] in ("Nom", "---") or set(cells[0]) <= set("-"):
                continue
            name = clean(cells[0])
            entries.append({"wargearId": by_fr[name]["id"], "cost": int(re.sub(r"\D", "", cells[1]))})
        data["armouryLists"].append({"id": lid, "name": T(en, fr), "sourceRef": ref(78, fr), "entries": entries})

    # ----------------------------------------------------------------------------
    # Fighters
    # ----------------------------------------------------------------------------
    SCROLL_PAGES = {
        "pox-priest": 87, "nightfang-assassin": 87, "ironfang-warlord": 88, "sparkseer": 88,
        "verminkin-warlock": 89, "pox-priests-apprentice": 89, "verminkin-champion": 89,
        "assassins-apprentice": 90, "sparkseers-apprentice": 90, "verminkin-warrior": 91,
        "rat-mutant": 91, "rolling-contraption": 92, "giant-rat": 92,
    }

    ENGINEER_EN = (
        "This fighter begins the battle with d3 engineering points. Once per activation, if this fighter is not engaged "
        "in melee, they can spend one of their engineering points to make the following bonus action:\n"
        "Engineer [Bonus Action]: Pick a friendly fighter within 1\" of this fighter, that is not engaged in melee, to be "
        "the target and then pick one of the following options:\n"
        "- Patch-up: If the target is a Contraption, it heals d3 life.\n"
        "- Soup-up: Pick 1 of the target's ranged weapons to be souped-up until the end of the round. While a weapon is "
        "souped-up, increase its Rend value by 1. However if it misfires, treat the result as backfire (do not roll on "
        "the table)."
    )
    ONE_CUT_EN = (
        "While this fighter has made a Charge Move in the same activation, its melee attack rolls score a critical hit "
        "on a natural roll of a 5 or 6."
    )

    FIGHTERS = [
        # id, name, category, keywords, cost, limit, stats, lists, fixed, xp, lores, grants, rules, wargear en, quote en
        ("pox-priest", "Pox Priest", "leader", ["leader", "verminkin", "priest"], 170, None,
         (6, 4, 6, 6, 4, 5, 5), ["practitioner"], [], (60, "d6"), ["lore-of-poxes"], (0, 2, "lore-of-poxes"),
         [("master-of-plague-magic", "Master of Plague Magic", "Maître de la magie de peste",
           "This fighter knows the Lore of Poxes. When they are recruited, pick 2 spells from it to be their signature "
           "spells. In addition, at the start of each battle they prepare 1 random spell from it.")],
         "This fighter can be equipped with wargear from the Practitioner List from the Verminkin Armoury.",
         "Scurry forth, and bear the Black Rot!"),
        ("nightfang-assassin", "Nightfang Assassin", "leader", ["leader", "verminkin", "assassin"], 140, None,
         (6, 3, 4, 6, 4, 3, 6), ["main", "champion"], [], (60, "d6"), [], (1, 0, None),
         [("skilled-killer", "Skilled Killer", "Tueur accompli", "When this fighter is recruited, pick 1 skill for them."),
          ("one-cut-one-kill", "One-cut, One-kill", "Un coup, un mort", ONE_CUT_EN)],
         "This fighter can be equipped with wargear from the Main List and Champion List from the Verminkin Armoury.",
         "Splatter the cobbles with their blood!"),
        ("ironfang-warlord", "Ironfang Warlord", "leader", ["leader", "verminkin"], 135, None,
         (6, 3, 4, 6, 4, 3, 6), ["main", "champion"], [], (60, "d6"), [], (2, 0, None),
         [("ambitious-warlord", "Ambitious Warlord", "Seigneur de guerre ambitieux",
           "When this fighter is recruited, pick 2 skills for them.")],
         "This fighter can be equipped with wargear from the Main List and Champion List from the Verminkin Armoury.",
         "Bring me the head of a Guilder, or I'll take yours!"),
        ("sparkseer", "Sparkseer", "leader", ["leader", "verminkin"], 130, None,
         (6, 4, 4, 6, 4, 3, 5), ["main", "champion", "sparkseer"], [], (60, "d6"), [], (1, 0, None),
         [("tinkerers-know-how", "Tinkerer's Know-how", "Savoir-faire de bricoleur",
           "When this fighter is recruited, pick 1 skill for them."),
          ("mad-engineering", "Mad Engineering", "Ingénierie folle", ENGINEER_EN)],
         "This fighter can be equipped with wargear from the Main List, Champion List and Sparkseer List from the "
         "Verminkin Armoury.",
         "One more adjustment... just one..."),
        ("verminkin-warlock", "Verminkin Warlock", "champion", ["champion", "verminkin", "wizard"], 125, 1,
         (6, 4, 6, 6, 4, 4, 4), ["practitioner"], [], (40, "d6"), ["lore-of-the-under-tunnels"],
         (0, 1, "lore-of-the-under-tunnels"),
         [("spellcaster", "Spellcaster", "Lanceur de sorts",
           "This fighter knows the Lore of the Under-Tunnels. When they are recruited, pick 1 spell from it to be their "
           "signature spell. In addition, at the start of each battle they prepare 1 random spell from it.")],
         "This fighter can be equipped with wargear from the Practitioner List from the Verminkin Armoury.",
         "The void-chasm whispers to me..."),
        ("pox-priests-apprentice", "Pox Priest's Apprentice", "champion", ["champion", "verminkin", "priest"], 125, 1,
         (6, 4, 6, 6, 4, 4, 4), ["practitioner"], [], (40, "d6"), ["lore-of-poxes"], (0, 1, "lore-of-poxes"),
         [("holy-magic", "Holy Magic", "Magie sacrée",
           "This fighter knows the Lore of Poxes. When they are recruited, pick 1 spell from it to be their signature "
           "spell. In addition, at the start of each battle they prepare 1 random spell from it.")],
         "This fighter can be equipped with wargear from the Practitioner List from the Verminkin Armoury.",
         "Bring them boils! Bring them death!"),
        ("verminkin-champion", "Verminkin Champion", "champion", ["champion", "verminkin"], 95, None,
         (6, 3, 4, 6, 4, 3, 5), ["main", "champion"], [], (40, "d6"), [], (1, 0, None),
         [("seasoned-warrior", "Seasoned Warrior", "Guerrier aguerri",
           "When this fighter is recruited, pick 1 skill for them.")],
         "This fighter can be equipped with wargear from the Main List and Champion List from the Verminkin Armoury.",
         "Let not a manling live!"),
        ("assassins-apprentice", "Assassin's Apprentice", "champion", ["champion", "verminkin", "assassin"], 90, None,
         (6, 4, 4, 6, 4, 3, 5), ["main", "champion"], [], (40, "d6"), [], (0, 0, None),
         [("one-cut-one-kill", "One-cut, One-kill", "Un coup, un mort", ONE_CUT_EN)],
         "This fighter can be equipped with wargear from the Main List and Champion List from the Verminkin Armoury.",
         "You won't see me coming, Guilder..."),
        ("sparkseers-apprentice", "Sparkseer's Apprentice", "champion", ["champion", "verminkin"], 85, 2,
         (6, 4, 4, 6, 4, 3, 4), ["main", "champion", "sparkseer"], [], (40, "d6"), [], (0, 0, None),
         [("mad-engineering", "Mad Engineering", "Ingénierie folle", ENGINEER_EN)],
         "This fighter can be equipped with wargear from the Main List, Champion List and Sparkseer List from the "
         "Verminkin Armoury.",
         "Hmmm... this screw is probably unnecessary..."),
        ("verminkin-warrior", "Verminkin Warrior", "henchman", ["henchman", "verminkin"], 40, None,
         (6, 5, 5, 6, 4, 2, 4), ["main"], [], (0, "d6"), [], (0, 0, None), [],
         "This fighter can be equipped with wargear from the Main List from the Verminkin Armoury.",
         "We rise from below!"),
        ("rat-mutant", "Rat-Mutant", "brute", ["brute", "verminkin", "ogre"], 105, None,
         (5, 4, 4, 6, 2, 2, 8), ["rat-mutant"], ["oversized-claw"], (20, "d6"), [], (0, 0, None), [],
         "This fighter is equipped with an Oversized Claw melee weapon. In addition, it can be equipped with wargear "
         "from the Rat-Mutant List from the Verminkin Armoury.",
         "Head... hurts..."),
        ("rolling-contraption", "Rolling-Contraption", "brute", ["brute", "verminkin", "contraption"], 150, 1,
         ("2d6", 4, 4, 4, 1, 3, 8), ["contraption"], ["crushing-bulk"], (20, "d6"), [], (0, 0, None),
         [("unpredictable-movement", "Unpredictable Movement", "Mouvement imprévisible",
           "This fighter has a Move value of 2d6\". Each time it makes a move, roll the dice to determine its Move value "
           "for that move, (for example, if this fighter makes a Run Move, first roll 2d6\" to determine its Move value, "
           "then roll an additional d6 and add it to the Move value as normal)."),
          ("splat", "Splat!", "Splatch !",
           "After this fighter finishes a Charge move, pick 1 enemy fighter they are engaged with. That fighter is hit "
           "with the following attack 3 times: Rend -1, Damage 1."),
          ("large-and-heavy", "Large and Heavy", "Grand et lourd",
           "This fighter cannot climb or jump. In addition, each time this fighter is set-up, they must be set up on "
           "the battlefield floor and they must finish each move on the battlefield floor.")],
         "This fighter is equipped with Crushing Bulk melee weapon. In addition, it can be equipped with wargear from "
         "the Contraption List from the Verminkin Armoury.",
         "Screeeeeeeeeeeee-!"),
        ("giant-rat", "Giant Rat", "beast", ["beast", "verminkin", "rat"], 20, None,
         (8, 5, None, 6, 4, 1, 2), [], ["nasty-bite"], (0, None), [], (0, 0, None), [],
         "This fighter is equipped with a nasty bite melee weapon (see below), they cannot be equipped with any other "
         "wargear.",
         None),
    ]


    data["fighters"] = []
    for (fid, name, cat, kws, cost, limit, st, lists, fixed, xp, lores, grants, rules, wg_en, quote_en) in FIGHTERS:
        heading, lines = scroll(fid, name)
        wargear_fr = clean(next(l for l in lines if l.startswith("**Équipement :**")).split(":**", 1)[1])
        wargear_fr = wargear_fr[0].upper() + wargear_fr[1:]
        special = []
        for rid, ren, rfr, rtext in rules:
            fr_text = bullet_rule(lines, rfr)
            if rid == "splat":
                fr_text = fr_text.rstrip(":").rstrip() + " : Perforation -1, Dégâts 1."
            special.append(rule(rid, ren, rfr, rtext, fr_text))
        q = quote_of(lines)
        data["fighters"].append(
            {
                "id": fid,
                "name": T(name, src.fr_name(name)),
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
                "wargearText": T(wg_en, wargear_fr),
                "quote": None if quote_en is None else T(quote_en, q),
                "sourceRef": ref(SCROLL_PAGES[fid], src.fr_name(name)),
            }
        )

    # ----------------------------------------------------------------------------
    # Skills
    # ----------------------------------------------------------------------------
    SKILLS = {
        "masterful-schemes": [
            ("purveyor-of-poisons", "Purveyor of Poisons", "Empoisonneur",
             "This fighter's melee weapons gain the Poison weapon trait. If a weapon already has the Poison weapon trait, "
             "improve the Rend value of that weapon by 1 instead."),
            ("dirty-fighter", "Dirty Fighter", "Combattant déloyal",
             "Subtract 1 from parry rolls made by enemy fighters against attacks made by this fighter. In addition, each "
             "time an enemy fighter fails such a parry roll, that enemy fighter suffers 1 damage."),
            ("attack-attack", "Attack! Attack!", "À l'attaque ! À l'attaque !",
             "Once per battle, this fighter can use the following bonus action:\n"
             "Attack! Attack! [Bonus Action]: Until the end of the round, add 1 to attack rolls for melee attacks made by "
             "friendly fighters, while they are within 9\" of this fighter."),
            ("too-cunning-to-die", "Too Cunning to Die", "Trop rusé pour mourir",
             "Each time you roll on the lasting injury table for this fighter, you can roll twice and pick either result."),
            ("master-of-dark-science", "Master of Dark Science", "Maître de la sombre science",
             "Add 3\" to the Range value of ranged weapons friendly fighters are equipped with while they are within 6\" "
             "of this fighter. In addition, you can re-roll misfire rolls made for friendly fighters while they are "
             "within 6\" of this fighter."),
            ("from-unseen-quarter", "From Unseen Quarter", "Venu de nulle part",
             "If this fighter starts the battle in reserve, when it is set up on the battlefield for the first time they "
             "can be set up anywhere on the battlefield more than 9\" away from all enemy fighters. Then, up to 2 "
             "friendly Henchmen that are also in reserve and will be set up in the same round, can be set up anywhere on "
             "the battlefield that is within 3\" of this fighter and more than 9\" away from all enemy fighters."),
        ],
        "tunnel-runners": [
            ("impetuous", "Impetuous", "Impétueux",
             "The first time this fighter makes a Move in battle, it can move an additional d6\"."),
            ("wall-scrambler", "Wall Scrambler", "Grimpeur de murs",
             "This fighter can climb high terrain in the same manner as ladders. In addition, it can jump as far as its "
             "maximum move distance."),
            ("ambush", "Ambush", "Embuscade",
             "Add 1 to the Attacks value of this fighter's melee weapons while they have made a Charge Move in the same "
             "activation."),
            ("escape-artist", "Escape Artist", "Roi de l'évasion",
             "Once per battle, if this fighter is engaged in melee, this fighter can use the following bonus action:\n"
             "Escape Artist [Bonus Action]: Remove this fighter from the battlefield and set it up again wholly within "
             "2d6\" of its previous position and not engaged in melee."),
            ("back-stabber", "Back Stabber", "Coup dans le dos",
             "Improve the Rend value of this fighter's melee weapons by 1 while it is engaged in melee with an enemy "
             "fighter that is engaged in melee with multiple fighters."),
            ("shadow-lurker", "Shadow Lurker", "Rôdeur des ombres",
             "While this fighter is within 1/2\" of any terrain, it is not visible to enemy fighters more than 9\" away."),
        ],
    }
    TABLES = [
        ("masterful-schemes", "Masterful Schemes", "Machinations magistrales", 85,
         {"kind": "keywords", "anyOf": [["verminkin", "leader"], ["verminkin", "champion"]]},
         T("Verminkin Leaders and Champions only", "Chefs et Champions Vermineux uniquement")),
        ("tunnel-runners", "Tunnel Runners", "Coureurs de tunnels", 86,
         {"kind": "keywords", "anyOf": [["verminkin"]]},
         T("Any Verminkin fighter", "N'importe quel combattant Vermineux")),
    ]
    data["skillTables"] = []
    for tid, en, fr, page, elig, label in TABLES:
        skills = []
        for sid, sen, sfr, text in SKILLS[tid]:
            fr_text = "\n".join(paragraphs(section(sfr)))
            # The bonus action line repeats the skill name: keep "Name [Action bonus] : text".
            skills.append({"id": sid, "name": T(sen, sfr), "text": T(text, fr_text), "sourceRef": ref(page, sfr)})
        data["skillTables"].append(
            {"id": tid, "name": T(en, fr), "eligibility": elig, "eligibilityLabel": label,
             "sourceRef": ref(page, fr), "skills": skills}
        )

    # ----------------------------------------------------------------------------
    # Spell lores
    # ----------------------------------------------------------------------------
    SPELLS = {
        "lore-of-the-under-tunnels": [
            (1, "shadow-leap", "Shadow Leap", "Bond d'ombre", "cantrip", 7, 10,
             "Pick a visible friendly fighter within 3\" of the caster, remove them from the battlefield and set them up "
             "again, anywhere on the battlefield within 9\" of the caster and not engaged in melee, (if you pick the "
             "caster themselves, mark their location before removing them from the battlefield).",
             "Increase the range the fighter can be set up from 9\" to 12\".", None),
            (2, "doom", "Doom", "Fatalité", "hex", 6, 10,
             "Pick a visible enemy fighter within 12\" of the caster to be the target. That enemy fighter is doomed. "
             "While an enemy fighter is doomed you can make them re-roll one of the following: an attack roll, a parry "
             "roll, an armour roll.\nOnce you do so, the fighter is no longer doomed.",
             "Increase the range to 18\".", None),
            (3, "chain-lightning", "Chain Lightning", "Chaîne d'éclairs", "attack", 8, 12,
             "The closest visible enemy fighter within 12\" is targeted and hit with the following attack:\n"
             "Then, pick another enemy fighter that is within 3\" of the previous target and visible to it to be the new "
             "target. It is hit with the same attack.",
             "After the attack on the second target is resolved, pick another enemy fighter within 3\" of the first two "
             "and visible to them, to be the third target. They are hit with the same attack.",
             {"rend": -1, "damage": "d3"}),
            (4, "tunnel-from-below", "Tunnel from Below", "Tunnel venu d'en bas", "cantrip", 8, 12,
             "Place the blast template centred on the battlefield floor within 12\" of the caster. Then scatter the blast "
             "template d6\". You can pick d3 friendly fighters in Reserve to be set up on the battlefield floor, in the "
             "template and not engaged in melee.",
             "Increase the range from 12\" to 15\".", None),
            (5, "gathering-shadows", "Gathering Shadows", "Ombres grandissantes", "aura", 7, 10,
             "Until the end of the round, the caster has a 6\" aura of shadows. Friendly fighters are in cover while they "
             "are within 6\" of the caster.",
             "Increase the range of the aura from 6\" to 9\".", None),
            (6, "bouncing-blast", "Bouncing Blast", "Explosion rebondissante", "attack", 9, 12,
             "Place the blast template centred on a visible point within 15\" of the caster, it then scatters d6\".\n"
             "Each fighter in its area is hit with the following attack:\n"
             "Then, the blast scatters d6\" again, and every fighter in its area is targeted and hit with the above "
             "attack, (it is possible for the same fighter to be hit with an attack both times).",
             "When the blast template is first placed, it does not scatter.", {"rend": -1, "damage": "d3"}),
        ],
        "lore-of-poxes": [
            (1, "spray-of-vomit", "Spray of Vomit", "Gerbe de vomi", "attack", 7, 10,
             "Place the flame template from the caster. Each fighter in its area is targeted and hit with the following "
             "attack:", "The Damage value is d3 instead of 1.", {"rend": -1, "damage": 1}),
            (2, "fetid-blades", "Fetid Blades", "Lames fétides", "enchant", 7, 10,
             "Pick a friendly fighter within 6\" of the caster to be the target, then pick 1 of the target's melee "
             "weapons to be fetid until the end of the round. While a weapon is fetid it gains the Arcane and Poison "
             "weapon traits.", "Increase the range of the spell from 6\" to 12\".", None),
            (3, "rabid-fervour", "Rabid Fervour", "Ferveur enragée", "aura", 7, 10,
             "Until the end of the round, the caster has a 6\" aura of rabid fervour. Add 1 to attack rolls for melee "
             "attacks made by friendly fighters while they are within the aura.",
             "Increase the range of the aura from 6\" to 9\".", None),
            (4, "rotten-armour", "Rotten Armour", "Armure pourrie", "hex", 7, 12,
             "Pick a visible enemy fighter within 18\" of the caster. That enemy fighter has rotten armour for the rest of "
             "the round. While a fighter has rotten armour worsen their Armour value by 1 (to a minimum of '-').",
             "The target fighter has rotten armour for the rest of the battle.", None),
            (5, "dark-vitality", "Dark Vitality", "Sombre vitalité", "healing", 6, 10,
             "Each friendly fighter within 3\" of the caster heals 1 life.", "Increase the range from 3\" to 6\".", None),
            (6, "plague-bomb", "Plague Bomb", "Bombe de peste", "attack", 8, 12,
             "Place the blast template centred on a visible point within 12\" of the caster, it then scatters d6\".\n"
             "Each fighter in its area is hit with the following attack:\n"
             "Each fighter hit by the spell becomes poisoned, (see Poison weapon trait).",
             "It does not scatter.", {"rend": 0, "damage": "d3"}),
        ],
    }
    LORES = [
        ("lore-of-the-under-tunnels", "Lore of the Under-Tunnels", "Domaine des Tunnels profonds", 83),
        ("lore-of-poxes", "Lore of Poxes", "Domaine des Véroles", 84),
    ]


    data["spellLores"] = []
    for lid, en, fr, page in LORES:
        spells = []
        for roll, sid, sen, sfr, stype, cv, ccv, text, crit, attack in SPELLS[lid]:
            heading = f"{roll} - {sfr}"
            fr_main, fr_crit = spell_fr(heading)
            spells.append(
                {"id": sid, "roll": roll, "name": T(sen, sfr), "spellType": stype, "castingValue": cv,
                 "criticalCastValue": ccv, "text": T(text, fr_main), "criticalText": T(crit, fr_crit), "attack": attack,
                 "sourceRef": ref(page, heading)}
            )
        data["spellLores"].append({"id": lid, "name": T(en, fr), "die": "d6", "sourceRef": ref(page, fr),
                                   "spells": spells})
    return data
