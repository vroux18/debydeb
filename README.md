# Maille à maille

Web app iPhone pour accompagner Deb jusqu'au semi-marathon du 7 mars 2027. Chaque séance validée tricote un rang d'un pull, invisible tant qu'il n'est pas tricoté. La course tricote la finition et déclenche la révélation.

## Contenu

- `index.html`, `style.css`, `app.js` : l'app (aucune dépendance, aucun build).
- `plan.js` : le plan 19 semaines repris de l'Excel (séances, allures, règles, scénarios).
- `knit.js` : le pull (grille de mailles, motifs, animation).
- `config.js` : **le seul fichier à modifier** : prénom et mot final.
- `sw.js`, `manifest.webmanifest`, `icons/` : installation sur l'écran d'accueil et fonctionnement hors ligne.

Les données restent sur le téléphone (localStorage). Réglages > Sauvegarde permet d'en garder une copie.

## Mise en ligne (GitHub Pages)

1. Fusionner la branche dans `main`.
2. GitHub > Settings > Pages > Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Le lien public : `https://vroux18.github.io/debydeb/`.

Sur un compte GitHub gratuit, Pages exige un dépôt public.

Côté Deb : ouvrir le lien dans Safari, Partager > « Sur l'écran d'accueil », puis toujours ouvrir l'app depuis l'icône. Safari et l'app installée ne partagent pas leurs données : il faut installer avant de commencer à saisir.
