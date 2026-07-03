# DIGI237 — Boutique en ligne

Boutique de produits numériques (ebooks, cours, logiciels) avec paiement Mobile Money (Orange Money / MTN MoMo) et back-office admin.

## Structure

```
digi237-store/
  server.js          → serveur Express
  db.js               → base de données SQLite (créée automatiquement au démarrage)
  routes/              → routes API (produits, commandes, admin)
  middleware/          → protection des routes admin
  public/               → frontend (HTML/CSS/JS, pas de build nécessaire)
```

## Déployer sur Railway

1. Pousse ce dossier sur un nouveau repo GitHub (ou dans ton projet `courteous-trust` existant, dans un nouveau service).
2. Sur Railway : **New Service → Deploy from GitHub repo**, sélectionne le repo.
3. Dans l'onglet **Variables** du service, ajoute :
   - `ADMIN_PASSWORD` → ton mot de passe admin (choisis quelque chose de solide, pas `digi237admin`)
   - `DB_DIR` → `/app/data`
4. Ajoute un **Volume** persistant (Settings → Volumes) monté sur `/app/data`, sinon la base de données sera effacée à chaque redéploiement.
5. Railway détecte automatiquement `npm install` puis `npm start` grâce au `package.json`. Aucune config supplémentaire n'est nécessaire.
6. Une fois déployé, ouvre l'URL fournie par Railway : la boutique s'affiche directement (le frontend est servi par le même serveur Express).

## Utilisation

- **Boutique publique** : `/` — catalogue, panier, commande avec Mobile Money.
- **Mon compte** : le client se connecte avec son numéro de téléphone pour voir l'historique et télécharger ses achats validés.
- **Admin** (`/` → bouton Admin) : connexion avec `ADMIN_PASSWORD`, gestion des produits (ajout/modification/suppression) et validation manuelle des commandes après vérification du paiement Mobile Money.

## Personnaliser

- Remplace les 3 produits de démonstration directement depuis le back-office admin.
- Change les numéros Orange Money / MTN MoMo affichés au checkout dans `public/app.js`, fonction `renderCheckout()` (variables `opNumber`).
- Les liens de téléchargement (`fileUrl`) peuvent pointer vers n'importe quel lien direct (Google Drive avec accès public, Dropbox, etc.).

## Limites à connaître

- La validation du paiement est **manuelle** : le client indique l'ID de transaction reçu par SMS, et toi tu vérifies et valides depuis l'admin. C'est la méthode la plus fiable sans contrat d'agrégateur (CinetPay, Notch Pay, etc.) qui donnerait une validation automatique.
- Le mot de passe admin est simple (une seule variable d'environnement) — largement suffisant pour un usage solo, mais à ne pas exposer publiquement.
