# Budget Perso PWA

Application de budget personnel installable comme PWA.

## Fichiers principaux
- `index.html` : interface principale
- `styles.css` : styles et responsive mobile
- `app.js` : logique de budget, réplication, données locales
- `manifest.webmanifest` : configuration PWA
- `sw.js` : cache pour usage hors-ligne

## Comment publier sur GitHub Pages
1. Crée un dépôt GitHub.
2. Sur ton PC, dans `src/` :
   ```bash
   git remote add origin https://github.com/TON_UTILISATEUR/NOM_DU_DEPOT.git
   git push -u origin master
   ```
3. Dans GitHub, va dans `Settings` → `Pages`.
4. Sélectionne la branche `main` et le dossier `/`.
5. Enregistre. L’URL publique sera affichée.

## Installer sur téléphone
1. Ouvre l’URL publique dans Chrome sur ton téléphone.
2. Clique sur le menu Chrome.
3. Choisis `Ajouter à l'écran d'accueil` ou `Installer`.
4. L’app fonctionnera ensuite comme une application.

## Attention à la vie privée
- GitHub Pages est public : tout le monde peut voir ton application.
- Les données que tu saisis restent dans ton téléphone (`localStorage`).
- Si tu veux garder l’app vraiment privée, garde-la locale ou utilise un hébergement privé avec authentification.
