# Supabase Edge Functions - GoCardless Integration

Ce dossier contient les Edge Functions Supabase pour l'intégration GoCardless avec votre application Certigestion.

## 📁 Structure

```
supabase/
├── functions/
│   ├── _shared/
│   │   └── gocardless.ts              # Utilitaires GoCardless partagés
│   ├── create-gocardless-subscription/ # Créer un flux de paiement
│   │   └── index.ts
│   ├── complete-gocardless-checkout/   # Finaliser le paiement
│   │   └── index.ts
│   └── deno.json                       # Configuration Deno
├── migrations/
│   └── 20260224_create_subscriptions_table.sql  # Table subscriptions
├── config.toml                         # Configuration Supabase
└── README.md
```

## 🚀 Installation

### 1. Installer Supabase CLI

```bash
# macOS / Linux
brew install supabase/tap/supabase

# Ou via npm
npm install -g supabase
```

### 2. Se connecter à Supabase

```bash
# Se connecter à votre compte Supabase
supabase login

# Lier le projet local au projet Supabase
supabase link --project-ref ivlofqlskkwpezktpavy
```

### 3. Appliquer les migrations

```bash
# Depuis la racine du projet
cd /home/salah/Desktop/Certiwize/certiwize-appweb-main

# Pousser les migrations vers Supabase
supabase db push
```

### 4. Déployer les Edge Functions

```bash
# Déployer la fonction de création de flux
supabase functions deploy create-gocardless-subscription --no-verify-jwt

# Déployer la fonction de finalisation
supabase functions deploy complete-gocardless-checkout --no-verify-jwt
```

### 5. Configurer les secrets

Les Edge Functions ont besoin des variables d'environnement suivantes :

```bash
# Définir les secrets GoCardless
supabase secrets set GOCARDLESS_ACCESS_TOKEN=sandbox_g1R6x-VcPEP7mi46viidAda2coJkIGKViQZ0jdz2
supabase secrets set GOCARDLESS_ENVIRONMENT=sandbox
supabase secrets set APP_URL=https://queen-objectives-assuming-vpn.trycloudflare.com

# Les variables Supabase sont automatiquement injectées :
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

## 🧪 Tester en local

### 1. Démarrer Supabase localement

```bash
# Démarrer tous les services Supabase
supabase start
```

### 2. Créer un fichier .env.local pour les Edge Functions

```bash
# Dans supabase/.env.local
GOCARDLESS_ACCESS_TOKEN=sandbox_g1R6x-VcPEP7mi46viidAda2coJkIGKViQZ0jdz2
GOCARDLESS_ENVIRONMENT=sandbox
APP_URL=http://localhost:5173
```

### 3. Tester une Edge Function localement

```bash
# Servir la fonction localement
supabase functions serve create-gocardless-subscription --env-file supabase/.env.local

# Tester avec curl
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-gocardless-subscription' \
  --header 'Content-Type: application/json' \
  --data '{
    "plan": "monthly",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "sessionToken": "test-session-token"
  }'
```

## 🧪 Tester avec GoCardless Sandbox

### Coordonnées bancaires de test

GoCardless fournit des coordonnées bancaires de test pour le sandbox :

**IBAN de test valide :**
```
GB33BUKB20201555555555
```

**Nom du titulaire :** N'importe quel nom

### Flux de test complet

1. Lancez votre application : `npm run dev`
2. Allez sur `/pricing` et sélectionnez un plan
3. Remplissez le formulaire de checkout
4. Vous serez redirigé vers la page hébergée GoCardless Sandbox
5. Utilisez l'IBAN de test ci-dessus
6. Validez le mandat SEPA
7. Vous serez redirigé vers `/checkout/success`
8. L'application créera automatiquement votre compte et vous connectera

### États de paiement simulés

Dans le sandbox GoCardless, vous pouvez simuler différents états :

- **Paiement réussi** : Utilisez l'IBAN standard
- **Paiement échoué** : Utilisez `GB33BUKB20201555555556`
- **Client introuvable** : Utilisez un email inexistant

## 📊 Vérifier les données

### Dans le Dashboard Supabase

1. Allez sur [https://supabase.com/dashboard/project/ivlofqlskkwpezktpavy](https://supabase.com/dashboard/project/ivlofqlskkwpezktpavy)
2. Cliquez sur **Table Editor**
3. Sélectionnez la table `subscriptions`
4. Vous devriez voir vos abonnements créés

### Dans le Dashboard GoCardless Sandbox

1. Allez sur [https://manage-sandbox.gocardless.com/](https://manage-sandbox.gocardless.com/)
2. Vérifiez les **Customers**, **Mandates**, et **Subscriptions** créés

## 🐛 Débogage

### Voir les logs des Edge Functions

```bash
# Logs en temps réel
supabase functions logs create-gocardless-subscription --tail

# Logs d'une fonction spécifique
supabase functions logs complete-gocardless-checkout
```

### Erreurs courantes

**Erreur : "Missing required fields"**
- Vérifiez que tous les champs requis sont envoyés dans le body de la requête

**Erreur : "GOCARDLESS_ACCESS_TOKEN is not configured"**
- Vérifiez que vous avez bien défini les secrets : `supabase secrets list`

**Erreur : "Failed to create redirect flow"**
- Vérifiez que votre token GoCardless est valide
- Vérifiez que l'environnement (sandbox/live) est correct

**Erreur : "Failed to create user"**
- Vérifiez que l'email n'existe pas déjà dans Supabase Auth

## 🔄 Passer en production

Quand vous êtes prêt à passer en production :

1. Créez un compte GoCardless Live
2. Obtenez votre token d'accès Live
3. Mettez à jour les secrets :

```bash
supabase secrets set GOCARDLESS_ACCESS_TOKEN=live_votre_token_ici
supabase secrets set GOCARDLESS_ENVIRONMENT=live
supabase secrets set APP_URL=https://votre-domaine.com
```

4. Mettez à jour votre `.env` :

```env
GOCARDLESS_ACCESS_TOKEN=live_votre_token_ici
GOCARDLESS_ENVIRONMENT=live
```

## 📚 Documentation

- [GoCardless API Docs](https://developer.gocardless.com/api-reference/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs des Edge Functions
2. Vérifiez le Dashboard GoCardless Sandbox
3. Vérifiez la table `subscriptions` dans Supabase
