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

### Modifié

- Les noms des factions et des combattants sont désormais en français, comme
  le reste de la traduction : Mercenaires de la Guilde, Vermigènes, Cabales de
  la Mort, Le Cloître gangrené, Capitaine de la Guilde, Maître artificier,
  Bâtard du sang... Le nom anglais reste entre parenthèses dans le lecteur de
  règles. Le mot-clé Wizard devient Magicien. Les bandes enregistrées ne sont
  pas touchées.

### Corrigé

- Une nouvelle version de l'application remplace désormais l'ancienne toute
  seule : l'application vérifie s'il existe une mise à jour quand son onglet
  revient au premier plan et toutes les 15 minutes, puis recharge la page sur
  la nouvelle version, au même écran. Il n'est plus nécessaire de vider le
  cache du navigateur après une publication. Les bandes enregistrées ne sont
  pas touchées.

## [1.2.0] - 2026-10-13

Tutoriel des règles, toujours sur la version de test 1.03 de Black Death City.

### Ajouté

- Tutoriel des règles ("Tutoriel" dans l'en-tête) : l'exemple d'attaque au
  corps à corps du livre (p. 25) rejoué en 12 étapes sur un plateau vu de
  dessus, avec les cartes des combattants, les jets d'attaque, les points de
  vie restants et un lien vers la règle de chaque étape. Boutons précédent et
  suivant, flèches du clavier, et étape conservée dans l'adresse.
- Leçon d'attaque à distance dans le tutoriel : un exemple maison construit à
  partir des règles (p. 28), avec des valeurs de dés choisies pour
  l'illustration : portée de l'arme, ennemi visible le plus proche non engagé
  au corps à corps, exception de la cible masquée, couvert, puis jet d'Arc,
  jet d'armure et dégâts. Le plateau montre la portée, les distances et les
  lignes de vue.
- Le lecteur des règles s'ouvre directement sur une section d'un chapitre
  (`#/rules/<chapitre>/<section>`).

## [1.1.0] - 2026-10-13

Préparation des batailles, campagnes de groupe et générateurs de noms,
toujours sur la version de test 1.03 de Black Death City.

### Ajouté

- Assistant de préparation de bataille ("Préparer une bataille" dans
  l'en-tête, sur le tableau de campagne d'une bande et dans une campagne de
  groupe) : bandes et outsider, scénario et rebondissement tirés ou choisis,
  taille des groupes de combat avec répartition au hasard, sorts préparés, ce
  qui se passe pendant et après la bataille, puis l'enregistrement dans le
  journal d'une bande ou dans la campagne de groupe.
- Fiche des scénarios : la table des scénarios, les règles communes et les
  six scénarios avec leurs rebondissements, tirés de la traduction française.
- Campagnes de groupe sur l'accueil : bandes de l'application ou d'autres
  joueurs, batailles livrées et classement. Le chapitre 5 "Campagnes" n'est
  pas encore publié : aucune règle de campagne n'est appliquée.
- Dé de direction (bouton "Dé de direction" dans l'en-tête), par-dessus
  l'écran en cours : une flèche dans une direction quelconque et, en option,
  les distances de déviation des règles (1D6", 1D6x2", 3D6"), avec le détail
  des dés.
- Aide de jeu en français (bouton "Aide de jeu" dans l'en-tête) : la feuille
  d'aide de jeu officielle traduite sur une page A4, avec les numéros de page
  des règles de la version de test 1.03, prête à imprimer.
- Bouton "Mes bandes" dans l'en-tête (et le menu sur téléphone), pour revenir
  à la liste des bandes depuis n'importe quel écran.
- Noms féminins pour les combattants : un symbole masculin et un symbole
  féminin à côté du bouton "Au hasard". Les Death Covens suivent la règle du
  livre ("-a" ajouté à un nom qui se termine par une consonne, p. 96) ; les
  autres factions utilisent des tables D66 maison, non officielles.
- Nom de bande au hasard à côté du champ "Nom de la bande", tiré de tables
  maison propres à la faction choisie (non officielles).
- Retours sur la traduction dans le lecteur de règles : le lien "Proposer
  une correction" sous chaque titre ouvre un ticket GitHub déjà rempli
  (formulaire `traduction`), le passage sélectionné est cité, et chaque
  chapitre renvoie à la page de modification de son fichier. Les tickets
  acceptés sont appliqués par une demande de fusion
  (`docs/TRANSLATION_FEEDBACK.md`).
- Lien vers le site officiel de Black Death City dans le pied de page.

### Modifié

- Les boutons "Recruter" de la troisième étape sont grisés, avec la raison
  en dessous, quand les règles interdisent un combattant de plus : bande
  complète, Chef déjà recruté ou différent de celui imposé par l'origine,
  limite de catégorie ou de profil atteinte, argent restant insuffisant.
- Origines présentées une par ligne à la deuxième étape, comme les factions.
- L'étape de l'équipement affiche le type (Chef, Champion, Homme de main...)
  sous le nom de chaque combattant du sélecteur.
- Chaque dé indique son nombre de dés (1D6, 1D3+1, jamais D6 seul) dans
  l'application, les feuilles imprimées, le lecteur des règles, les textes
  des données et la traduction française ; les tables D66 gardent leur nom.
  `npm run fix:dice` applique la règle et `npm run check:data` la vérifie.
- Sur téléphone, les outils de l'en-tête sont regroupés dans un seul menu et
  le titre tient sur une ligne ; sur tablette, les boutons d'outils
  n'affichent que leur icône, les libellés reviennent sur grand écran.
- L'interface est uniquement en français : le choix de la langue disparaît et
  un navigateur en anglais affiche les écrans en français (les textes anglais
  restent dans `en.json`).
- Le README présente l'application en ligne aux joueurs (en français, avec une
  partie en anglais) ; les informations de développement sont passées dans
  `docs/DEVELOPMENT.md`.

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
- Dos des cartes de combattants dans la vue Impression : logo du jeu, bouclier
  de la faction sur un panneau de pierre et nom de la faction, avec le nom de
  la bande en option. "Imprimer les dos derrière les cartes" ajoute une page
  de dos après chaque page de cartes, en miroir pour un recto verso sur le
  bord long ; le nouveau contenu "Dos des cartes" imprime une planche de 9 dos
  à passer au verso à la main. Images de qualité impression dans
  `public/images/print/`.
- Générateur de dos de cartes (bouton "Dos de cartes" dans l'en-tête) :
  planches de 9 dos pour n'importe quelle faction, avec le nom de la bande en
  option, sans bande enregistrée.

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
- Les scripts de données lisent la traduction dans `sources/fr/` par défaut ;
  la CI lance désormais `check:generated` et compare les données à la
  traduction.
- L'en-tête et le pied de page restent en place sur toutes les tailles
  d'écran, plus compacts sur téléphone ; seule la zone entre les deux défile,
  et une page qui tient dans la fenêtre ne défile plus.
- Boutons radio et cases à cocher en noir sur les panneaux parchemin (en clair
  sur le fond sombre) au lieu du bleu du navigateur.
- Titres, noms et bandeaux du générateur, de la campagne, de l'accueil et de
  l'écran d'impression en Trattatello, plus lisible que Old Celtiberian. Old
  Celtiberian reste pour le titre de l'en-tête, le lecteur des règles et les
  feuilles imprimées.

[Non publié]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Ad-duc/bdc-warband-manager/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Ad-duc/bdc-warband-manager/releases/tag/v1.0.0
