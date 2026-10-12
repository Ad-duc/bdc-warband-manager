<!--
  File:     CHANGELOG.fr.md
  Role:     Notable changes of each release, French version of CHANGELOG.md
  Author:   Adrien Duclaud
  Created:  2026-10-12
  License:  MIT
-->

# Nouveautés

Les changements notables du projet sont listés ici. Le format suit
[Keep a Changelog 1.1.0](https://keepachangelog.com/fr/1.1.0/) et le projet
applique le [versionnage sémantique](https://semver.org/lang/fr/spec/v2.0.0.html).
La version des règles du jeu est indiquée à part (version de test 1.03).

## [Non publié]

### Ajouté

- Veille des règles : `scripts/watch/release.py` (vérification,
  téléchargement, marquage) et `scripts/watch/diff_versions.py`, scripts npm
  `watch:*`, procédure `docs/RULES_UPDATE.md` suivie chaque semaine par un
  agent planifié qui ouvre une pull request pour chaque nouvelle version
  officielle des règles.
- `sources/` : texte anglais extrait des versions de test 1.02 et 1.03,
  traduction française et glossaire, consignes de traduction, manifeste des
  publications.
- Lien de soutien "Offrez-moi un café" en bas à droite du pied de page.
- Lecteur des règles en français (bouton "Règles en français" dans
  l'en-tête) : tous les chapitres de la traduction, liste des chapitres,
  sommaire avec accès direct aux sections, liens vers le chapitre précédent et
  suivant, disponible hors ligne.
- Page "Nouveautés" dans l'application, ouverte depuis le pied de page : cet
  historique en français ou en anglais, selon la langue de l'interface
  (`CHANGELOG.md` est la version anglaise).

### Modifié

- Les scripts de données lisent la traduction dans `sources/fr/` par défaut ;
  la CI lance désormais `check:generated` et compare les données à la
  traduction.
- L'en-tête et le pied de page restent en place sur toutes les tailles
  d'écran, plus compacts sur téléphone ; seule la zone entre les deux défile,
  et une page qui tient dans la fenêtre ne défile plus.

## [1.0.0] - 2026-10-12

Première version complète, fondée sur la version de test 1.03 de Black Death
City.

### Ajouté

- Données de jeu des quatre factions de la version de test : Guild
  Mercenaries, Verminkin, Death Covens et The Blighted Cloister, en anglais et
  en français, chaque entrée renvoyant à sa page dans le livre et à son titre
  dans la traduction française.
- Vérificateur de données (`npm run check:data`) : schémas zod, intégrité des
  références, caractères interdits, comparaison avec les fichiers de
  traduction.
- Générateurs Python qui reconstruisent les fichiers Verminkin, Death Covens
  et Blighted Cloister à partir de la traduction (`npm run generate:data`,
  `npm run check:generated`).
- Moteur de règles pur, entièrement couvert par les tests : coûts, valeur de
  bande, limites de profils, origines, restrictions et améliorations
  d'équipement, compétences, sorts, expérience, blessures, progressions et
  Pourriture noire.
- Assistant de création en six étapes (faction, origine, combattants,
  équipement, compétences, valeur) avec vérifications en direct, options de
  combattants, formes alternatives et épithètes au hasard.
- Tableau de bord de campagne : journal des batailles avec application et
  annulation, blessures, progressions, Pourriture noire, possessions, réserve
  et compteurs du repaire.
- Feuille de bande A4 et cartes de combattants au format TCG, avec un mode
  économie d'encre.
- Export et import JSON, et liens de partage en lecture seule (données dans
  le fragment de l'adresse, rien n'est envoyé à un serveur).
- Utilisation hors ligne et installation en PWA ; stockage local dans
  IndexedDB.
- Interface en anglais et en français, choix de langue mémorisé, termes
  originaux affichés en infobulle à partir du glossaire.
- Audit d'accessibilité axe-core de chaque écran dans les deux langues (WCAG
  2.2 A et AA), lancé par les tests de bout en bout.
- Guide de contribution (`CONTRIBUTING.md`) et cet historique.

### Modifié

- Données des règles passées de la version de test 1.02 à la 1.03.
- Polices servies en WOFF2 et images en WebP redimensionnées : la première
  visite télécharge environ 0,6 Mo au lieu de plus de 4 Mo.
- Écrans, données de jeu et schémas de validation chargés à la demande ; un
  en-tête statique s'affiche avant le chargement du JavaScript.
- `npm run check:i18n` signale aussi les textes d'interface inutilisés.
- Factions présentées une par ligne à la première étape de l'assistant ; les
  longues descriptions sont coupées à trois lignes avec un bouton "Lire la
  suite", comme les textes d'ambiance des origines à la deuxième étape et les
  longues règles spéciales des parchemins de combattants.

[Non publié]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Ad-duc/bdc-warband-manager/releases/tag/v1.0.0
