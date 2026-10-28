<!--
  File:     docs/BATTLE_TRACKER_SPEC.md
  Role:     Spécification du mode bataille : écran de suivi d'une partie en
            cours (vie, états, rounds, déroute, lanceur de dés, sorts
            préparés) et report de la fin de partie vers le journal de
            campagne. À valider avant tout code.
  Author:   Adrien Duclaud
  Created:  2026-10-28
  License:  MIT (document). Le texte des règles appartient à Sam Pearson.
-->

# Mode bataille - Spécification v1

## 1. Objectif

Jouer une partie sans feuille imprimée. Aujourd'hui, il faut passer de la version imprimable (profils, armes, traits) au tableau de bord de campagne (Pourriture noire, blessures durables), et rien ne suit ce qui change pendant la partie : vie restante, états, activations.

Le mode bataille réunit sur un seul écran, pensé pour un téléphone tenu à la table, tout ce qu'il faut pour jouer **sa propre bande**, puis reporte le résultat de la partie dans le journal de campagne.

Choix validés le 28/10/2026 :

| Sujet           | Décision                                                           |
| --------------- | ------------------------------------------------------------------ |
| Bandes suivies  | Ma bande seulement : chaque joueur suit la sienne sur son appareil |
| Fin de partie   | Report vers la saisie "Nouvelle bataille" du journal, préremplie   |
| Aide aux règles | Rappels d'états, round et déroute, lanceur de dés, sorts préparés  |
| Livraison       | Cette spec d'abord, puis le code sur la même branche               |

## 2. Principes

| Sujet                                         | Règle                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aucune règle inventée                         | Ce que le livre ne tranche pas reste à la main du joueur, avec un rappel. Toute lecture est notée dans `RULES_ASSUMPTIONS.md` (A52 et suivantes).                   |
| Le joueur garde la main                       | Chaque automatisme (Ensanglanté, poison, mis hors de combat) se défait d'un toucher ; les dés peuvent être lancés par l'application ou saisis depuis des dés réels. |
| Moteur pur                                    | Calculs dans `src/rules/battle-tracker.ts` et `src/rules/attack.ts` : sans React, sans stockage, couverts à 100 %, soumis à Stryker.                                |
| La bande n'est pas modifiée pendant la partie | L'état de la partie vit à part. Seul le report final écrit dans la bande, en une fois, après validation.                                                            |
| Hors ligne                                    | Tout fonctionne sans réseau, comme le reste de l'application.                                                                                                       |
| Interface                                     | Français, clés i18n, cibles tactiles de 44 px minimum, résultats de dés annoncés aux lecteurs d'écran.                                                              |

## 3. Entrées dans le mode bataille

1. **Depuis l'assistant de mise en place** : un nouveau bouton "Jouer la bataille" en fin d'assistant ouvre le mode bataille avec le scénario, l'adversaire, les groupes de bataille et les sorts préparés déjà tirés. Le transfert passe par le même mécanisme que l'actuel préremplissage du journal (`src/features/battle/handoff.ts`), étendu.
2. **Depuis le tableau de bord de campagne** : bouton "Commencer une bataille", qui ouvre le mode bataille vide (scénario et adversaire facultatifs, sorts préparés tirés sur place).
3. **Reprise** : si une partie est en cours pour cette bande, le tableau de bord affiche "Reprendre la bataille (round N)" à la place. Une seule partie en cours par bande.

Adresse : `#/warbands/<id>/battle`.

## 4. L'écran

### 4.1 Bandeau de round (fixé en haut)

- Numéro du round, scénario et adversaire.
- Compteur "Ensanglantés ou hors de combat : N / 5". À 5 ou plus, il s'allume et propose le **test de déroute** de fin de round : lancer un dé (1 = déroute, 2+ = réussi) ou "Partir en déroute volontairement" (règle "Test de déroute", Chapitre 2).
- Bouton **"Round suivant"** : remet à zéro les activations, incrémente le round. Si des combattants présents ne sont pas activés, une confirmation le signale (chaque combattant présent doit être activé à chaque round).
- Bouton **"Terminer la bataille"** (voir section 6).

### 4.2 Liste des combattants

Combattants actifs de la bande (statut "active"), triés au choix : par groupe de bataille, "non activés d'abord", ou ordre de la bande. Un combattant mis hors de combat descend en bas de la liste, grisé.

### 4.3 Carte de combattant (repliée)

Une ligne compacte : nom, pictogramme de catégorie, **vie restante / Vie** avec barre, pastilles d'états, case "Activé".

### 4.4 Carte de combattant (dépliée)

- **Caractéristiques effectives** : blessures durables et progressions incluses (`effectiveStats`), plus les modificateurs temporaires de la partie (toniques, voir 4.6) affichés à part.
- **Armes** : profil complet (Portée, Attaques, Perforation, Dégâts, Dégâts critiques) et rappel de chaque trait, repris du modèle d'impression (`src/print/model.ts`) pour rester identique aux cartes imprimées. Un bouton "Attaquer" par arme ouvre le lanceur de dés (section 5).
- **Compétences, règles spéciales et objets** : nom, détail au toucher.
- **Sorts préparés** : liste du tirage, avec la valeur de lancement ; un sort lancé peut être coché.
- **Vie** : boutons -1, +1 et "Subir N dégâts". La vie ne descend pas sous 0 et ne dépasse jamais la valeur de Vie.
- **États** : Ensanglanté, Caché, Empoisonné, Mis hors de combat, chacun avec son rappel (table `conditions` de `common.json`).
- **Objets à usage unique** : case "Utilisé" pour les objets consommables et les armes au trait Usage unique.
- **Pourriture noire** : affichée en lecture seule (rappel), modifiable seulement depuis la campagne.

### 4.5 Automatismes d'états

| Événement                                             | Effet automatique                                                                            | Source                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------ |
| Vie restante = 1                                      | Ensanglanté coché, rappel affiché                                                            | Ensanglanté, Chapitre 1        |
| Vie remonte au-dessus de 1                            | Ensanglanté décoché                                                                          | idem                           |
| Vie restante = 0                                      | Mis hors de combat proposé, avec annulation                                                  | Vie, dégâts, soins, Chapitre 1 |
| Combattant empoisonné coché "Activé"                  | 1 dégât proposé, appliqué en un toucher                                                      | Trait Poison, Chapitre 2       |
| Soin, ou vie restante = 1, alors qu'il est empoisonné | Empoisonné décoché                                                                           | idem                           |
| Mis hors de combat                                    | Compte dans le seuil de déroute ; ses objets en main sont rappelés pour les règles de trésor | Test de déroute                |

Caché reste manuel : ses conditions de fin dépendent de la table (prochaine activation, ennemi au contact...), seul le rappel est affiché.

### 4.6 Modificateurs temporaires

Un objet comme un tonique ("jusqu'à la fin de la bataille, améliorez de 1...") ajoute un modificateur temporaire à la partie, jamais à la bande. Les caractéristiques affichées et le lanceur de dés en tiennent compte. En v1, le joueur ajoute ce modificateur à la main (caractéristique, valeur, libellé) ; le lien automatique avec les curiosités viendra avec l'assistant d'exploration.

## 5. Lanceur de dés

### 5.1 Attaquer (mon combattant attaque)

1. Choix de l'arme (ou de deux armes, dont une de main secondaire, au corps à corps).
2. Options : **en surplomb** (+1 aux jets d'attaque à distance), malus éventuels saisis à la main (par exemple "aveuglé : -2").
3. Lancer : un dé par point d'Attaques ; **1 seul dé pour l'arme de main secondaire**, quelle que soit sa valeur d'Attaques.
4. Résultat : chaque dé est classé **touche critique** (6 naturel), **touche** (au moins la valeur de Lame au corps à corps, d'Arc à distance) ou **échec**, avec des couleurs différentes par arme.
5. Rappel affiché des dégâts infligés par touche et par touche critique, et de la Perforation de l'arme.

Les parades, l'initiative et l'alternance des attaques restent jouées à la table : le lanceur donne les touches, le joueur les utilise.

Les attaques automatiques (Flamme) et sans critique (Explosion) affichent leur rappel au lieu d'un jet classique.

### 5.2 Encaisser (mon combattant est touché)

1. Saisie : nombre de touches et de touches critiques reçues, Perforation, Dégâts et Dégâts critiques de l'arme adverse, **à couvert** ou non.
2. Calcul de la valeur d'Armure à atteindre : Armure améliorée de 1 à couvert (maximum 2+), puis dégradée par la Perforation. Si le jet devient impossible, aucun dé n'est lancé : l'arme transperce directement.
3. Un jet d'armure par attaque. Chaque attaque non sauvegardée inflige ses Dégâts, ou ses Dégâts critiques pour une touche critique.
4. Bouton "Appliquer" : total des dégâts retiré de la vie, avec les automatismes de la section 4.5. Une case "Arme empoisonnée" rend le combattant empoisonné si une touche critique non sauvegardée lui a infligé des dégâts.

### 5.3 Dés génériques

Un bouton "Dés" ouvre un lanceur libre (1D6, 2D6, 1D3, D66) pour tout le reste : jet de priorité, test d'Initiative, test de Volonté, parade. Le dé de direction existant (`#/dice`) reste accessible.

### 5.4 Dés réels

Chaque lancer propose "Saisir mes dés" : le joueur tape les résultats de ses propres dés, l'application ne fait que classer et compter.

## 6. Fin de partie et report vers la campagne

"Terminer la bataille" ouvre un récapitulatif modifiable avant validation :

- issue : victoire, défaite, égalité, ou déroute (la mienne ou celle de l'adversaire) ;
- liste des combattants **mis hors de combat**, chacun avec "Jet de blessure à faire" (la table des blessures n'est pas publiée : le résultat est saisi à la main, comme aujourd'hui) ;
- objets consommés, à retirer de l'équipement ou du butin ;
- notes de partie (rounds joués, faits marquants).

"Valider" ouvre la saisie **"Nouvelle bataille"** du journal, préremplie avec ces éléments (scénario, adversaire, issue, combattants touchés, notes), puis supprime la partie en cours une fois la saisie enregistrée. "Abandonner la partie" la supprime sans rien reporter, après confirmation.

La liste des combattants mis hors de combat est gardée dans l'entrée du journal : elle servira à l'assistant d'exploration pour proposer le groupe d'éclaireurs (question Q4 de `docs/EXPLORATION_SPEC.md`).

## 7. Données et stockage

### 7.1 État d'une partie

```ts
interface BattleSession {
  id: string;
  warbandId: string;
  createdAt: string;
  updatedAt: string;
  scenario: string;
  opponent: string;
  round: number;
  fleeTest: "none" | "passed" | "failed" | "fled-voluntarily";
  fighters: Array<{
    instanceId: string;
    lifeLeft: number;
    activated: boolean;
    takenDown: boolean;
    hidden: boolean;
    poisoned: boolean;
    battleGroup: number | null;
    preparedSpellIds: string[];
    castSpellIds: string[];
    usedItemIds: string[];
    tempModifiers: Array<{ stat: string; delta: number; label: string }>;
  }>;
  log: Array<{ round: number; text: string }>;
}
```

Ensanglanté n'est pas stocké : il se déduit de `lifeLeft === 1`.

### 7.2 Stockage

- Nouvelle table Dexie `battleSessions` (clé `id`, index `warbandId`), ajoutée par une **nouvelle version** de la base ; les versions existantes ne changent pas.
- Schéma zod strict `BattleSessionSchema`, validé à chaque écriture, comme les bandes et les campagnes.
- L'entrée du journal des batailles gagne un champ `takenDownIds` (combattants mis hors de combat, liste vide par défaut). C'est un changement du format de bande : `WARBAND_SCHEMA_VERSION` augmente et une migration ajoute une liste vide aux entrées existantes (décision D2, section 11).
- Sauvegarde à chaque changement : la partie survit au verrouillage du téléphone et au rechargement de la page.

## 8. Code et tests

| Fichier                                                     | Rôle                                                                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/rules/battle-tracker.ts`                               | Vie (dégâts, soins, bornes), états déduits, poison à l'activation, seuil de déroute, round suivant                                                             |
| `src/rules/attack.ts`                                       | Classement des dés d'attaque (Lame, Arc, surplomb, malus, main secondaire), valeur d'Armure effective (couvert, Perforation, jet impossible), dégâts encaissés |
| `src/data/schema.ts`                                        | `BattleSessionSchema`                                                                                                                                          |
| `src/db/database.ts`                                        | Nouvelle version avec la table `battleSessions`                                                                                                                |
| `src/features/battle/BattleTrackerPage.tsx`                 | Écran principal et bandeau de round                                                                                                                            |
| `src/features/battle/TrackerFighterCard.tsx`                | Carte repliée et dépliée                                                                                                                                       |
| `src/features/battle/AttackRoller.tsx`, `ArmourRoller.tsx`  | Lanceurs "Attaquer" et "Encaisser"                                                                                                                             |
| `src/features/battle/handoff.ts`                            | Transfert étendu (groupes, sorts préparés)                                                                                                                     |
| `src/features/campaign/BattleLog.tsx`                       | Préremplissage depuis la fin de partie                                                                                                                         |
| `src/i18n/locales/fr.json`, `en.json`                       | Libellés                                                                                                                                                       |
| `tests/unit/rules/battle-tracker.test.ts`, `attack.test.ts` | Une règle = un test, y compris l'exemple d'Attaque au corps à corps du Chapitre 2 rejoué                                                                       |
| `tests/unit/db.test.ts`                                     | Table, migration de version, refus d'une partie invalide                                                                                                       |
| `tests/e2e/battle-tracker.spec.ts`, `a11y.spec.ts`          | Partie complète au clavier et au toucher : dégâts, Ensanglanté, déroute, fin de partie, reprise après rechargement                                             |

Changelog : une ligne sous `[Unreleased]` et `[Non publié]`.

## 9. Découpage proposé

| Étape | Contenu                                                          | Livrable |
| ----- | ---------------------------------------------------------------- | -------- |
| 1     | Moteur (`battle-tracker.ts`, `attack.ts`) et tests               | Commit 1 |
| 2     | Stockage (schéma, version Dexie) et tests                        | Commit 2 |
| 3     | Écran : liste, cartes, vie, états, round, déroute                | Commit 3 |
| 4     | Lanceur de dés (attaquer, encaisser, libre, dés réels)           | Commit 4 |
| 5     | Entrées (assistant, campagne, reprise) et report vers le journal | Commit 5 |

Le tout dans une seule pull request, de préférence. Si elle devient trop longue, les étapes 4 et 5 partent dans une seconde PR.

## 10. Hors périmètre v1

- Suivi de la bande adverse (option "ma bande + compteur adverse" écartée pour la v1).
- Parade, initiative et alternance des attaques automatisées.
- Effets automatiques des traits autres que Poison (Explosion, Flamme, Effroi... : rappel seulement).
- Synchronisation entre deux appareils.
- Jet de blessure, table des blessures : non publiés dans la v1.03.

## 11. Décisions complémentaires (28/10/2026)

| #   | Sujet                          | Décision                                                                                                                                              |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Bande en mode recrutement      | Mode bataille disponible pour une partie d'essai. "Terminer la bataille" n'y propose pas de report : la partie est simplement clôturée.               |
| D2  | Combattants mis hors de combat | Enregistrés dans l'entrée du journal (`takenDownIds`), avec nouvelle version du format de bande et migration. L'assistant d'exploration s'en servira. |
| D3  | Objets utilisés                | Proposés au retrait dans le récapitulatif de fin, cochés par défaut, décochables un par un.                                                           |
| D4  | Écran toujours allumé          | Wake Lock du navigateur quand il est disponible, avec un interrupteur dans le bandeau ; sans support, l'interrupteur est masqué.                      |
| D5  | Journal de round               | Historique court en lecture seule (dégâts, états, activations, déroute), repris dans les notes du récapitulatif de fin.                               |
