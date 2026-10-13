/*
 * File:        src/features/names/houseNames.ts
 * Role:        Name generators that go beyond the book: female fighter names
 *              and warband names. The female tables and the warband name
 *              tables are house tables (not official, see RULES_ASSUMPTIONS.md
 *              A42); the Death Covens female names follow the book (p. 96):
 *              "-a" added to a name ending in a consonant. House content is
 *              kept here, out of the faction data files that follow the book.
 * Author:      Adrien Duclaud
 * Created:     2026-10-13
 * License:     MIT
 */

import { randomName, type RandomSource } from "../../rules/index.ts";

export type NameGender = "male" | "female";

/** D66 keys in table order: 11, 12, ..., 16, 21, ..., 66. */
const D66_KEYS: readonly string[] = [1, 2, 3, 4, 5, 6].flatMap((tens) =>
  [1, 2, 3, 4, 5, 6].map((units) => `${tens}${units}`),
);

function d66Table(names: readonly string[]): Record<string, string> {
  if (names.length !== D66_KEYS.length) throw new RangeError("A D66 table needs 36 entries");
  return Object.fromEntries(D66_KEYS.map((key, i) => [key, names[i] ?? ""]));
}

/** House D66 tables of female names, in the style of each faction's book table. */
export const FEMALE_NAME_TABLES: Readonly<Record<string, Record<string, string>>> = {
  "guild-mercenaries": d66Table([
    "Adelheid",
    "Agnes",
    "Anna",
    "Barbara",
    "Beatrix",
    "Brigitta",
    "Christina",
    "Dorothea",
    "Elisabeth",
    "Elsbeth",
    "Engel",
    "Fridrun",
    "Gerda",
    "Gertrud",
    "Gisela",
    "Hedwig",
    "Hildegard",
    "Ida",
    "Irmgard",
    "Jutta",
    "Katharina",
    "Kunigunde",
    "Liesel",
    "Magdalena",
    "Margarete",
    "Mechthild",
    "Ottilie",
    "Richardis",
    "Rosamund",
    "Sibylla",
    "Sophia",
    "Ursula",
    "Walburga",
    "Wilhelmina",
    "Wiltrud",
    "Zita",
  ]),
  verminkin: d66Table([
    "Bizzka",
    "Bratzka",
    "Chittra",
    "Diebrika",
    "Fritzna",
    "Gnashka",
    "Gnibbla",
    "Huzzka",
    "Klauzka",
    "Klinkra",
    "Kratcha",
    "Kratzka",
    "Krikka",
    "Kriknessa",
    "Nibbla",
    "Pestna",
    "Pilfra",
    "Rattika",
    "Ratsa",
    "Raubka",
    "Rikkiss",
    "Rittcha",
    "Scabbra",
    "Skrabba",
    "Skrikka",
    "Skritta",
    "Skrotta",
    "Skurra",
    "Snatcha",
    "Snikka",
    "Snivvla",
    "Squeekra",
    "Tikka-Tik",
    "Vritcha",
    "Zikka",
    "Zizzra",
  ]),
  "the-blighted-cloister": d66Table([
    "Agatha",
    "Agnesia",
    "Apollonia",
    "Balbina",
    "Blasia",
    "Cassia",
    "Cecilia",
    "Clementia",
    "Corvina",
    "Domitilla",
    "Eulalia",
    "Euphemia",
    "Febronia",
    "Felicitas",
    "Honoria",
    "Ignatia",
    "Lucia",
    "Lucretia",
    "Macrina",
    "Marcella",
    "Morthia",
    "Ottilia",
    "Paschalia",
    "Perpetua",
    "Pestilla",
    "Placida",
    "Pusilla",
    "Putria",
    "Radegund",
    "Scholastica",
    "Septima",
    "Serafina",
    "Tertia",
    "Theodora",
    "Verminia",
    "Zenobia",
  ]),
};

/** Factions whose female names come from the book rule instead of a table. */
const FEMININE_BY_SUFFIX: ReadonlySet<string> = new Set(["death-covens"]);

/** Book rule (Death Covens, p. 96): "-a" added to a name ending in a consonant. */
export function feminine(name: string): string {
  return /[b-df-hj-np-tv-z]$/i.test(name) ? `${name}a` : name;
}

/**
 * Random fighter name: the book D66 table for male names; for female names the
 * house table of the faction, or the book "-a" rule for the Death Covens.
 * Without a female table the book table is used.
 */
export function randomFighterName(
  factionId: string,
  bookTable: Record<string, string>,
  gender: NameGender,
  random: RandomSource = Math.random,
): string {
  if (gender === "male") return randomName(bookTable, random);
  if (FEMININE_BY_SUFFIX.has(factionId)) return feminine(randomName(bookTable, random));
  return randomName(FEMALE_NAME_TABLES[factionId] ?? bookTable, random);
}

/** House warband name tables: a head and a complement, combined at random. */
export interface WarbandNameTable {
  heads: readonly string[];
  complements: readonly string[];
}

export const WARBAND_NAME_TABLES: Readonly<Record<string, WarbandNameTable>> = {
  "guild-mercenaries": {
    heads: [
      "Les Lames",
      "Les Épées",
      "Les Hallebardes",
      "La Compagnie",
      "Les Loups",
      "Les Chiens",
      "La Bande",
      "Les Fers",
      "Les Lansquenets",
      "La Garde",
      "Les Corbeaux",
      "Les Fils",
    ],
    complements: [
      "de la Porte Noire",
      "du Pont-aux-Pendus",
      "des Bas-Quartiers",
      "de la Guilde Grise",
      "du Gibet",
      "de l'Argent Terni",
      "de la Tour Brisée",
      "du Quai des Morts",
      "de la Lanterne Rouge",
      "des Remparts",
      "du Serment Rompu",
      "de la Dernière Pièce",
    ],
  },
  verminkin: {
    heads: [
      "Le Clan",
      "La Meute",
      "Le Nid",
      "La Horde",
      "Les Griffes",
      "Les Crocs",
      "La Vermine",
      "Le Terrier",
      "Les Rongeurs",
      "La Nichée",
      "Les Queues",
      "Le Grouillement",
    ],
    complements: [
      "des Crocs-Rouille",
      "de l'Égout Profond",
      "de la Peste Grise",
      "des Mille Queues",
      "du Fromage Pourri",
      "des Caves Noires",
      "de la Rouille",
      "des Os Rongés",
      "du Puits Sans Fond",
      "de la Fange",
      "des Ombres Grises",
      "du Grenier Maudit",
    ],
  },
  "death-covens": {
    heads: [
      "La Maison",
      "Le Cercle",
      "Le Sang",
      "La Lignée",
      "Le Conclave",
      "Les Enfants",
      "La Cour",
      "Les Héritiers",
      "Le Pacte",
      "Les Veilleurs",
      "La Crypte",
      "Les Serments",
    ],
    complements: [
      "de la Nuit Éternelle",
      "du Calice Rouge",
      "de la Lune Sanglante",
      "des Tombes Ouvertes",
      "du Dernier Souffle",
      "de la Rose Noire",
      "des Veines Froides",
      "du Crépuscule",
      "de la Faim Sans Fin",
      "des Cercueils",
      "du Sang Ancien",
      "de la Brume Pâle",
    ],
  },
  "the-blighted-cloister": {
    heads: [
      "La Confrérie",
      "L'Ordre",
      "Les Frères",
      "Le Chapitre",
      "La Congrégation",
      "Les Pénitents",
      "Le Couvent",
      "Les Fidèles",
      "La Procession",
      "Les Moines",
      "Le Cloître",
      "Les Pèlerins",
    ],
    complements: [
      "de la Sainte Pourriture",
      "du Calice Souillé",
      "des Plaies Ouvertes",
      "de la Cloche Fêlée",
      "du Dernier Sacrement",
      "de la Lèpre Bénie",
      "des Mouches",
      "du Psaume Putride",
      "de la Fièvre Sacrée",
      "des Cendres",
      "du Reliquaire Moisi",
      "de la Charité Purulente",
    ],
  },
};

function pickOne(list: readonly string[], random: RandomSource): string {
  return list[Math.floor(random() * list.length)] ?? "";
}

/** Random warband name for a faction, or null when the faction has no table. */
export function randomWarbandName(factionId: string, random: RandomSource = Math.random): string | null {
  const table = WARBAND_NAME_TABLES[factionId];
  if (table === undefined) return null;
  return `${pickOne(table.heads, random)} ${pickOne(table.complements, random)}`;
}
