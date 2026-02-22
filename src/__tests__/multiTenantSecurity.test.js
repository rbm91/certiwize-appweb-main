import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests de sécurité multi-tenant
 * Vérifie que toutes les requêtes Supabase incluent un filtre organization_id
 */

// Spy global pour intercepter les appels Supabase
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ ...mockQuery })),
    storage: { from: vi.fn(() => ({ getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })) })) },
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@test.com' },
    currentOrganization: { id: 'org-abc', name: 'Test Org' },
    isSuperAdmin: false,
    session: { access_token: 'token' },
    refreshSession: vi.fn(),
  })),
}));

vi.mock('pinia', () => ({
  defineStore: vi.fn((id, setup) => {
    return () => {
      if (typeof setup === 'function') return setup();
      return {};
    };
  }),
}));

describe('Sécurité Multi-Tenant — project.js', () => {
  it('saveProject inclut organization_id dans le payload', async () => {
    // Vérification statique : le fichier source doit contenir organization_id: orgId
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../stores/project.js'),
      'utf-8'
    );

    expect(content).toContain("organization_id: orgId");
    expect(content).toContain(".eq('organization_id', orgId)");
  });
});

describe('Sécurité Multi-Tenant — data.js', () => {
  it('deleteTier filtre par organization_id', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../stores/data.js'),
      'utf-8'
    );

    // Vérifier que deleteTier contient le filtre
    const deleteTierSection = content.substring(
      content.indexOf('const deleteTier'),
      content.indexOf('const getTierById')
    );
    expect(deleteTierSection).toContain(".eq('organization_id', orgId)");
  });

  it('getTierById filtre par organization_id', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../stores/data.js'),
      'utf-8'
    );

    const getTierSection = content.substring(
      content.indexOf('const getTierById'),
      content.indexOf('const updateTier')
    );
    expect(getTierSection).toContain(".eq('organization_id', orgId)");
  });

  it('updateTier filtre par organization_id', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../stores/data.js'),
      'utf-8'
    );

    const updateTierSection = content.substring(
      content.indexOf('const updateTier'),
      content.indexOf('return {')
    );
    expect(updateTierSection).toContain(".eq('organization_id', orgId)");
  });
});

describe('Sécurité Multi-Tenant — quiz.js', () => {
  it('toutes les fonctions CRUD filtrent par organization_id', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../stores/quiz.js'),
      'utf-8'
    );

    // fetchQuiz
    expect(content).toContain("const fetchQuiz = async (id)");
    const fetchQuizSection = content.substring(
      content.indexOf('const fetchQuiz = async'),
      content.indexOf('const fetchQuizByToken')
    );
    expect(fetchQuizSection).toContain(".eq('organization_id', orgId)");

    // deleteQuiz
    const deleteQuizSection = content.substring(
      content.indexOf('const deleteQuiz'),
      content.indexOf('const toggleQuizActive')
    );
    expect(deleteQuizSection).toContain(".eq('organization_id', orgId)");

    // toggleQuizActive
    const toggleSection = content.substring(
      content.indexOf('const toggleQuizActive'),
      content.indexOf('const submitResponse')
    );
    expect(toggleSection).toContain(".eq('organization_id', orgId)");
  });
});

describe('Sécurité Multi-Tenant — evaluations.js', () => {
  it('envoyerEvaluation filtre par organization_id', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../stores/evaluations.js'),
      'utf-8'
    );

    const envoyerSection = content.substring(
      content.indexOf('const envoyerEvaluation'),
      content.indexOf('const relancerEvaluation')
    );
    expect(envoyerSection).toContain(".eq('organization_id', orgId)");
  });
});

describe('Sécurité Multi-Tenant — training.js', () => {
  it('deleteFormation filtre par organization_id', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../stores/training.js'),
      'utf-8'
    );

    const deleteSection = content.substring(
      content.indexOf('const deleteFormation'),
      content.indexOf('const generatePdf')
    );
    expect(deleteSection).toContain(".eq('organization_id', orgId)");
  });
});

describe('Sécurité Multi-Tenant — useConfirmDelete.js', () => {
  it('les fonctions de suppression filtrent par organization_id', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../composables/useConfirmDelete.js'),
      'utf-8'
    );

    expect(content).toContain("query.eq('organization_id', orgId)");
  });
});

describe('Sécurité Multi-Tenant — useInvoiceNumbering.js', () => {
  it('les requêtes filtrent par organization_id', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../composables/useInvoiceNumbering.js'),
      'utf-8'
    );

    expect(content).toContain(".eq('organization_id', orgId)");
  });
});
