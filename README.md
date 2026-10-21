# Maille à maille

Web app iPhone pour accompagner Deb jusqu'au semi-marathon du 7 mars 2027. Chaque séance validée tricote un rang d'un pull, invisible tant qu'il n'est pas tricoté. La course tricote la finition et déclenche la révélation.

## Contenu

- `index.html`, `style.css`, `app.js` : l'app (aucune dépendance, aucun build).
- `plan.js` : le plan 19 semaines repris de l'Excel (séances, allures, règles, scénarios).
- `knit.js` : le pull (grille de mailles, motifs, animation).
- `config.js` : **le seul fichier à modifier** : prénom, mot final, réglages des rappels.
- `sw.js`, `manifest.webmanifest`, `icons/` : installation sur l'écran d'accueil et fonctionnement hors ligne.
- `worker/` : serveur de rappels push (Cloudflare Worker), optionnel.

Les données restent sur le téléphone (localStorage). Réglages > Sauvegarde permet d'en garder une copie.

## Mise en ligne (GitHub Pages)

1. Fusionner la branche dans `main`.
2. GitHub > Settings > Pages > Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Le lien public : `https://vroux18.github.io/debydeb/`.

Sur un compte GitHub gratuit, Pages exige un dépôt public.

Côté Deb : ouvrir le lien dans Safari, Partager > « Sur l'écran d'accueil », puis toujours ouvrir l'app depuis l'icône. Safari et l'app installée ne partagent pas leurs données : il faut installer avant de commencer à saisir.

## Rappels push (optionnel, ~15 min)

Sur iPhone, une web app ne peut pas programmer de notification locale. Les rappels passent par un petit serveur gratuit chez Cloudflare. Il faut iOS 16.4 ou plus et l'app installée sur l'écran d'accueil.

```bash
node tools/vapid.mjs                              # génère les clés, garder la sortie
cd worker
npx wrangler login
npx wrangler kv namespace create SUBS             # copier l'id dans wrangler.toml
npx wrangler secret put VAPID_PUBLIC_KEY          # coller la clé publique
npx wrangler secret put VAPID_PRIVATE_JWK         # coller le JSON de la clé privée
npx wrangler deploy                               # donne l'URL du worker
```

Ensuite, dans `config.js` : `pushApi` = URL du worker, `vapidPublicKey` = clé publique. Mettre aussi un vrai e-mail dans `VAPID_SUBJECT` (`worker/wrangler.toml`), et de préférence `ALLOWED_ORIGIN = "https://vroux18.github.io"`.

Ce qu'elle reçoit (heure de Paris) :
- 30 min avant sa séance : le contenu de la séance ;
- 21h30 si la séance du jour n'est pas notée ;
- dimanche 20h30 : le bilan de la semaine ;
- veille du semi à 19h, et le matin de la course.

Dans l'app : Pelote > Rappels > « M'envoyer un rappel test ».
