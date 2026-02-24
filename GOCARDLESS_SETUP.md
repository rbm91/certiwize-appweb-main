# 🚀 Guide de Configuration GoCardless

Ce guide vous accompagne étape par étape pour configurer et tester GoCardless en mode sandbox.

## ✅ Ce qui est déjà fait

- ✅ Token GoCardless Sandbox configuré dans `.env`
- ✅ Edge Functions Supabase créées
- ✅ Migration de base de données prête
- ✅ Frontend configuré avec les formulaires de checkout

## 📦 Étape 1 : Installer Supabase CLI

Choisissez votre méthode d'installation :

### Via Homebrew (macOS/Linux) - Recommandé
```bash
brew install supabase/tap/supabase
```

### Via npm (tous les OS)
```bash
npm install -g supabase
```

### Vérifier l'installation
```bash
supabase --version
```

## 🔐 Étape 2 : Se connecter à Supabase

```bash
# Se connecter à votre compte Supabase
supabase login

# Lier ce projet à votre projet Supabase distant
supabase link --project-ref ivlofqlskkwpezktpavy
```

## 🗄️ Étape 3 : Créer la table subscriptions

```bash
# Appliquer la migration pour créer la table
supabase db push
```

Cela va créer la table `subscriptions` dans votre base de données Supabase.

## 🔧 Étape 4 : Déployer les Edge Functions

### Option A : Utiliser le script automatique (Recommandé)

```bash
cd supabase
./deploy.sh
```

### Option B : Déploiement manuel

```bash
# Déployer la fonction de création de flux de paiement
supabase functions deploy create-gocardless-subscription --no-verify-jwt

# Déployer la fonction de finalisation du paiement
supabase functions deploy complete-gocardless-checkout --no-verify-jwt
```

## 🔑 Étape 5 : Configurer les secrets

Les Edge Functions ont besoin des variables d'environnement GoCardless :

```bash
# Token GoCardless Sandbox
supabase secrets set GOCARDLESS_ACCESS_TOKEN=sandbox_g1R6x-VcPEP7mi46viidAda2coJkIGKViQZ0jdz2

# Environnement (sandbox)
supabase secrets set GOCARDLESS_ENVIRONMENT=sandbox

# URL de votre application (pour les redirections)
supabase secrets set APP_URL=https://queen-objectives-assuming-vpn.trycloudflare.com
```

### Vérifier les secrets
```bash
supabase secrets list
```

## 🧪 Étape 6 : Tester le flux complet

### 1. Lancer votre application
```bash
npm run dev
```

### 2. Accéder à la page de pricing
Allez sur `http://localhost:5173/pricing`

### 3. Sélectionner un plan
Choisissez un abonnement mensuel ou annuel

### 4. Remplir le formulaire
- **Prénom** : John
- **Nom** : Doe
- **Email** : test@example.com
- **Entreprise** : (optionnel)

### 5. Sur la page GoCardless Sandbox

Utilisez ces coordonnées de test :

**✅ IBAN de test (paiement réussi) :**
```
GB33BUKB20201555555555
```

**Nom du titulaire :** N'importe quel nom (ex: John Doe)

### 6. Validation

Après validation :
- ✅ Vous serez redirigé vers `/checkout/success`
- ✅ Votre compte sera créé automatiquement dans Supabase
- ✅ Vous serez connecté automatiquement
- ✅ L'abonnement sera enregistré dans la table `subscriptions`

## 🔍 Vérifier les résultats

### Dans le Dashboard Supabase

1. Allez sur : https://supabase.com/dashboard/project/ivlofqlskkwpezktpavy
2. Cliquez sur **Table Editor**
3. Sélectionnez **subscriptions**
4. Vous devriez voir votre abonnement

### Dans le Dashboard GoCardless

1. Allez sur : https://manage-sandbox.gocardless.com/
2. Vérifiez :
   - **Customers** : Votre client créé
   - **Mandates** : Le mandat SEPA validé
   - **Subscriptions** : Votre abonnement actif

## 📊 Structure des données

### Table `subscriptions`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | ID unique de l'abonnement |
| `user_id` | UUID | ID de l'utilisateur Supabase |
| `gocardless_subscription_id` | TEXT | ID de l'abonnement GoCardless |
| `gocardless_customer_id` | TEXT | ID du client GoCardless |
| `gocardless_mandate_id` | TEXT | ID du mandat SEPA |
| `plan` | TEXT | 'monthly' ou 'yearly' |
| `status` | TEXT | Statut de l'abonnement |
| `amount` | INTEGER | Montant en centimes (14400 = 144.00€) |
| `currency` | TEXT | Devise (EUR) |
| `interval` | TEXT | Période ('monthly' ou 'yearly') |
| `start_date` | TIMESTAMPTZ | Date de début |
| `next_payment_date` | TIMESTAMPTZ | Prochaine échéance |

## 🐛 Dépannage

### Erreur : "Failed to create redirect flow"

**Solution :** Vérifiez que :
- Votre token GoCardless est correct
- L'environnement est bien `sandbox`
- Les secrets sont bien configurés : `supabase secrets list`

### Erreur : "Missing required fields"

**Solution :** Vérifiez que vous avez bien rempli :
- Prénom
- Nom
- Email

### Erreur : "Failed to create user"

**Solution :** L'email existe peut-être déjà. Essayez avec un autre email ou supprimez l'utilisateur existant dans Supabase Auth.

### Voir les logs des Edge Functions

```bash
# Logs en temps réel
supabase functions logs create-gocardless-subscription --tail

# Logs de la fonction de finalisation
supabase functions logs complete-gocardless-checkout --tail
```

## 🎯 Cas de test

### Scénario 1 : Paiement réussi
- IBAN : `GB33BUKB20201555555555`
- Résultat : ✅ Abonnement créé

### Scénario 2 : Paiement échoué (simulé)
- IBAN : `GB33BUKB20201555555556`
- Résultat : ❌ Erreur de validation

### Scénario 3 : Nouvel utilisateur
- Email : nouveau@example.com
- Résultat : ✅ Compte créé + abonnement

### Scénario 4 : Utilisateur existant
- Email : existant@example.com (déjà dans Supabase Auth)
- Résultat : ✅ Abonnement ajouté sans créer de nouveau compte

## 🔄 Passer en production

Quand vous êtes prêt :

1. **Obtenir un compte GoCardless Live**
   - Créez un compte sur https://gocardless.com
   - Récupérez votre token Live

2. **Mettre à jour les secrets**
```bash
supabase secrets set GOCARDLESS_ACCESS_TOKEN=live_votre_token
supabase secrets set GOCARDLESS_ENVIRONMENT=live
supabase secrets set APP_URL=https://votre-domaine.com
```

3. **Mettre à jour le .env**
```env
GOCARDLESS_ACCESS_TOKEN=live_votre_token
GOCARDLESS_ENVIRONMENT=live
```

## 📚 Ressources

- [Documentation GoCardless](https://developer.gocardless.com/api-reference/)
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Guide SEPA Direct Debit](https://gocardless.com/guides/sepa/)

## ✨ Prochaines étapes

Une fois le test réussi, vous pouvez :
- [ ] Personnaliser les emails de confirmation
- [ ] Ajouter un webhook pour les événements GoCardless
- [ ] Gérer les annulations d'abonnements
- [ ] Ajouter un tableau de bord pour les abonnements
- [ ] Implémenter les changements de plan

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez les logs : `supabase functions logs --tail`
2. Vérifiez le Dashboard GoCardless Sandbox
3. Vérifiez la table `subscriptions` dans Supabase
4. Consultez les fichiers dans `supabase/README.md`
