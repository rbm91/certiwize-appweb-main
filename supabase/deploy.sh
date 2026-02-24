#!/bin/bash

# Script de déploiement des Edge Functions Supabase
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement des Edge Functions Supabase..."
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI n'est pas installé."
    echo "Installez-le avec: brew install supabase/tap/supabase"
    echo "Ou: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI trouvé"
echo ""

# Vérifier la connexion
echo "📡 Vérification de la connexion à Supabase..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Non connecté à Supabase."
    echo "Connectez-vous avec: supabase login"
    exit 1
fi

echo "✅ Connecté à Supabase"
echo ""

# Déployer les migrations
echo "📦 Application des migrations..."
cd "$(dirname "$0")/.."
supabase db push

echo "✅ Migrations appliquées"
echo ""

# Déployer les Edge Functions
echo "🔧 Déploiement des Edge Functions..."
echo ""

echo "  → create-gocardless-subscription..."
supabase functions deploy create-gocardless-subscription --no-verify-jwt

echo ""
echo "  → complete-gocardless-checkout..."
supabase functions deploy complete-gocardless-checkout --no-verify-jwt

echo ""
echo "✅ Edge Functions déployées"
echo ""

# Configurer les secrets
echo "🔐 Configuration des secrets..."
echo ""
echo "Exécutez ces commandes pour définir vos secrets :"
echo ""
echo "  supabase secrets set GOCARDLESS_ACCESS_TOKEN=sandbox_g1R6x-VcPEP7mi46viidAda2coJkIGKViQZ0jdz2"
echo "  supabase secrets set GOCARDLESS_ENVIRONMENT=sandbox"
echo "  supabase secrets set APP_URL=https://queen-objectives-assuming-vpn.trycloudflare.com"
echo ""
echo "Pour vérifier les secrets :"
echo "  supabase secrets list"
echo ""
echo "✨ Déploiement terminé !"
