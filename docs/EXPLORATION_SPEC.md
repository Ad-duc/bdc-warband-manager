<!--
  File:     docs/EXPLORATION_SPEC.md
  Role:     Spécification de l'assistant "Explorer la Cité" (étape 4 de la
            séquence d'après-bataille) et de la table des curiosités, à partir
            de l'avant-première du chapitre Campagne. À valider avant tout code.
  Author:   Adrien Duclaud
  Created:  2026-10-26
  License:  MIT (document). Le texte des règles appartient à Sam Pearson.
-->

# Assistant "Explorer la Cité" - Spécification v1

## 1. Objectif

Ajouter au tableau de bord de campagne d'une bande un assistant qui déroule l'étape 4 de la séquence d'après-bataille : former le groupe d'éclaireurs, lancer le jet d'exploration avec ses relances, résoudre le résultat, puis reporter les gains et les pertes sur la bande en une seule validation, comme la saisie "Nouvelle bataille" du journal.

Source : `src/data/campaign/preview.json` (avant-première Discord, voir `RULES_ASSUMPTIONS.md` A44 à A51 et D11) et `sources/fr/12_campagne-avant-premiere.md`. Tant que le chapitre n'est pas publié, l'assistant affiche un bandeau "Avant-première, règles provisoires" et n'est jamais obligatoire : la saisie libre actuelle reste possible.

## 2. Principes

| Sujet                 | Choix proposé                                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aucune règle inventée | Ce que l'avant-première ne définit pas (jet de blessure, table des reliques, table des possessions, blessures temporaires) reste un rappel à appliquer à la main, avec un champ libre. |
| Dés                   | Bouton "Lancer" ou saisie du résultat des dés réels, comme l'expérience de départ. Le détail de chaque jet est conservé.                                                               |
| Moteur                | Fonctions pures dans `src/rules/exploration.ts` (composition du groupe, relances, résolution), sans React, couvertes à 100 % et soumises à Stryker.                                    |
| Écriture              | Rien n'est écrit dans la bande avant le récapitulatif final ; un seul enregistrement, ajouté au journal des batailles.                                                                 |
| Langue                | Interface en français (clés i18n), textes de règles tirés du JSON.                                                                                                                     |

## 3. Parcours

1. **Groupe d'éclaireurs** : liste des combattants actifs non mis hors de combat à la fin de la bataille (case à cocher par combattant, car l'application ne connaît pas l'issue de chaque combattant). Contrôles en direct : exactement 1 Chef ou Champion, 1 à 3 Hommes de main, 0 ou 1 Bête, aucune Brute (p. 153). Le bouton "Explorer" reste grisé tant qu'une règle n'est pas respectée, avec le message correspondant.
2. **Relances disponibles** : compteur saisi par le joueur (victoire, possessions, règles de faction), plus les relances reconnues automatiquement et affichées avec leur source : Chien de chasse, Loup sinistre, Instinct d'explorateur. Chaque relance porte sa portée : jet entier, dizaines seulement ou unités seulement.
3. **Jet d'exploration** : deux dés (dizaines, unités), résultat lu dans la table. Pour chaque relance encore disponible : "Relancer tout", "Relancer les dizaines", "Relancer les unités", selon la portée. Bouton "Accepter le résultat" : le résultat final ne change plus (p. 153).
4. **Résolution** : texte d'ambiance, règle, options à choisir s'il y en a (filtrées par faction pour Terre consacrée), puis jets demandés par le résultat. Cas particuliers :
   - Carrefour : partage du groupe en 2 (répartition modifiable), deux jets d'exploration ; les relances accordées par un combattant précis restent attachées à son groupe ; un nouveau Carrefour donne "revient bredouille".
   - Le beffroi : choix d'un combattant non Bête, score d'escalade = dé + Initiative effective, résultats cumulés, jet supplémentaire sur 8+ ; un nouveau Beffroi donne "revient bredouille".
   - Nuée de rats : relance automatique pour une bande vermineuse.
   - Traqués dans les ténèbres : ordre des combattants choisi, jets un par un, arrêt au premier 1.
   - Dans les catacombes : jets cumulés avec arrêt ; le calcul du score attend la réponse à A49 (voir questions).
5. **Récapitulatif** : liste des effets à appliquer, modifiables avant validation : pièces d'argent, bocaux de sangsues, objets trouvés (tirés sur la table des curiosités), expérience par combattant, niveaux de Pourriture noire (plafonnés à 3 cases), combattants tués, jets de blessure à faire, possession à ajouter, recrue gratuite (Exhumer les tombes). "Appliquer" écrit tout en une fois et ajoute une entrée au journal.

## 4. Table des curiosités

- Tirage D66 réutilisable par l'assistant et depuis le butin ("Tirer une curiosité").
- Bocaux de sangsues des canaux : ajoutés au compteur existant `stash.leechJars` (nombre = chiffre des unités).
- Autres objets : ajoutés à `stash.items` avec leur nom en libellé (`wargearId` à `null`), sans changement de schéma en v1. Fiche de l'objet consultable (mots-clés, règle, prix de vente).
- Vente à l'étape 7 : bouton "Vendre" sur un objet de butin, jet de son prix (`sellValue`), crédit des pièces d'argent, retrait de l'objet.

## 5. Données et code

| Fichier                                                   | Rôle                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/data/campaign/preview.json`, `schema.ts`, `index.ts` | Données de l'avant-première (déjà livrées, validées par `check:data` et vitest) |
| `src/rules/exploration.ts`                                | Composition du groupe, relances, lecture des tables, effets                     |
| `src/features/campaign/ExplorePanel.tsx`                  | Assistant en étapes dans le tableau de bord de campagne                         |
| `src/features/campaign/CuriosityDialog.tsx`               | Tirage et fiche d'une curiosité, vente depuis le butin                          |
| `src/i18n/locales/fr.json`, `en.json`                     | Libellés                                                                        |
| `tests/unit/rules/exploration.test.ts`                    | Une règle = un test, plus l'exemple des Lanternes grises (p. 155) rejoué        |
| `tests/e2e/exploration.spec.ts`, `a11y.spec.ts`           | Parcours complet au clavier, audit axe                                          |

Un éventuel suivi des objets par combattant (balles d'argent restantes, Memento mori) demanderait un nouveau `WARBAND_SCHEMA_VERSION` avec migration : hors v1.

## 6. Hors périmètre v1

- Jet de blessure, table des reliques, table des possessions et blessures temporaires : absents de l'avant-première.
- Utilisation des objets en bataille (toniques, poudre, bombe) dans l'assistant de bataille.
- Calcul automatique des relances de possessions et de victoire.

## 7. Questions ouvertes

| #   | Question                                                                                                | Proposition                                                                     |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Q1  | Lancer l'assistant maintenant sur des règles d'avant-première, ou attendre la publication du chapitre ? | Le construire derrière le bandeau "Avant-première", les données restant isolées |
| Q2  | Relance du Chien de chasse : jet entier (v1.03, p. 66) ou unités seulement (exemple p. 155) ?           | Suivre le texte v1.03 et signaler l'écart à l'auteur                            |
| Q3  | Dans les catacombes : le 1 qui arrête compte-t-il dans le total ?                                       | Le compter (le score 1 existe dans la table), et demander sur le Discord        |
| Q4  | Cocher les combattants "mis hors de combat" à la main, ou l'ajouter à la saisie de bataille ?           | À la main en v1                                                                 |
| Q5  | Objets trouvés : libellé simple dans le butin (sans migration) ou référence typée vers la curiosité ?   | Libellé simple en v1                                                            |
