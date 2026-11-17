/*
 * File:        src/features/names/houseNames.ts
 * Role:        Random fighter and warband names. Fighter names use the book
 *              tables of the faction data; where the book has no female
 *              table, the Death Covens follow the book rule (p. 100: "-a"
 *              added to a name ending in a consonant) and the Verminkin and
 *              The Blighted Cloister use house tables. The house female tables
 *              and the warband name tables are not official (see
 *              RULES_ASSUMPTIONS.md A42) and are kept here, out of the faction
 *              data files that follow the book.
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

/** Book rule (Death Covens, p. 100): "-a" added to a name ending in a consonant. */
export function feminine(name: string): string {
  return /[b-df-hj-np-tv-z]$/i.test(name) ? `${name}a` : name;
}

/** Book name tables of a faction: male names, and female names and surnames when the book has them. */
export interface BookNameTables {
  male: Record<string, string>;
  female: Record<string, string> | null;
  surnames: Record<string, string> | null;
}

/**
 * Random fighter name. Male names come from the book D66 table. Female names
 * come from the book table when the faction has one (Guild Mercenaries, p. 75),
 * from the book "-a" rule for the Death Covens, else from the house table of
 * the faction (the male table without one). A surname of the book table is
 * added when the faction has one.
 */
export function randomFighterName(
  factionId: string,
  book: BookNameTables,
  gender: NameGender,
  random: RandomSource = Math.random,
): string {
  const first = firstName(factionId, book, gender, random);
  return book.surnames === null ? first : `${first} ${randomName(book.surnames, random)}`;
}

function firstName(
  factionId: string,
  book: BookNameTables,
  gender: NameGender,
  random: RandomSource,
): string {
  if (gender === "male") return randomName(book.male, random);
  if (book.female !== null) return randomName(book.female, random);
  if (FEMININE_BY_SUFFIX.has(factionId)) return feminine(randomName(book.male, random));
  return randomName(FEMALE_NAME_TABLES[factionId] ?? book.male, random);
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
