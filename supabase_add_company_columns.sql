-- ============================================================================
-- Migration : Ajout des colonnes manquantes dans la table companies
-- Date : 2026-02-18
-- Description : Ajouter tous les champs nécessaires pour les 6 onglets
--               Paramètres de l'organisme (CDC Certiwize)
-- ============================================================================

-- ── Onglet 2 : Juridique & conformité — NDA ──
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nda_numero TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nda_date_enregistrement DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nda_region TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nda_afficher_conventions BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nda_afficher_factures BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nda_afficher_commerciaux BOOLEAN DEFAULT FALSE;

-- ── Onglet 2 : Juridique & conformité — Qualiopi ──
ALTER TABLE companies ADD COLUMN IF NOT EXISTS qualiopi_certifie BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS qualiopi_certificateur TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS qualiopi_date_certification DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS qualiopi_date_fin DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS qualiopi_certificat_url TEXT DEFAULT '';

-- ── Onglet 2 : Juridique & conformité — Référent handicap (compléments) ──
-- Note : handicap_referent (nom) existe déjà, on le renomme pour cohérence
ALTER TABLE companies RENAME COLUMN handicap_referent TO handicap_nom;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS handicap_fonction TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS handicap_email TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS handicap_telephone TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS handicap_afficher_programmes BOOLEAN DEFAULT FALSE;

-- ── Onglet 2 : Juridique & conformité — Représentant légal ──
-- Note : manager_name existe déjà, on le renomme pour cohérence avec le CDC français
ALTER TABLE companies RENAME COLUMN manager_name TO representant_legal;

-- ── Onglet 2 : Juridique & conformité — Forme juridique ──
-- Note : legal_entity_type existe déjà, on le renomme pour cohérence
ALTER TABLE companies RENAME COLUMN legal_entity_type TO forme_juridique;

-- ── Onglet 3 : Paramètres documents ──
ALTER TABLE companies ADD COLUMN IF NOT EXISTS doc_afficher_logo BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS doc_signature_representant BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS doc_mention_rgpd BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS doc_mention_nda BOOLEAN DEFAULT FALSE;

-- ── Onglet 4 : Email & envoi ──
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_nom_expediteur TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_signature TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_envoi_auto BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_signature_electronique BOOLEAN DEFAULT FALSE;

-- ── Onglet 5 : RGPD & DPO ──
-- Note : dpo_name existe déjà, on le renomme pour cohérence
ALTER TABLE companies RENAME COLUMN dpo_name TO dpo_nom;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS dpo_email TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS politique_confidentialite TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS duree_conservation_donnees INTEGER DEFAULT 5;

-- ── Onglet 6 : Financier ──
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tva_assujetti BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tva_taux_defaut NUMERIC(5,2) DEFAULT 20.00;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iban TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bic TEXT DEFAULT '';

-- ── Seuils qualité ──
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seuil_satisfaction_chaud INTEGER DEFAULT 80;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seuil_satisfaction_formateur INTEGER DEFAULT 80;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seuil_satisfaction_financeur INTEGER DEFAULT 80;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seuil_quiz_validation INTEGER DEFAULT 70;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS seuil_taux_reponse INTEGER DEFAULT 60;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS declenchement_question_critique BOOLEAN DEFAULT TRUE;

-- ── Paramètres facturation ──
ALTER TABLE companies ADD COLUMN IF NOT EXISTS acompte_pourcentage INTEGER DEFAULT 30;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS acomptes_multiples BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS penalite_annulation BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS penalite_pourcentage INTEGER DEFAULT 0;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS conditions_paiement_defaut TEXT DEFAULT '30_jours';
