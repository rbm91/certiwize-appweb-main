import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

// Mock auth store
vi.mock('../stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    currentOrganization: { id: 'org-123' },
  })),
}));

import { useInvoiceNumbering } from '../composables/useInvoiceNumbering';

describe('useInvoiceNumbering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('génère le premier numéro FA-YYYY-00001 quand aucune facture existe', async () => {
    const { getNextNumber } = useInvoiceNumbering();
    const numero = await getNextNumber();
    const year = new Date().getFullYear();

    expect(numero).toBe(`FA-${year}-00001`);
  });

  it('génère un numéro d\'avoir avec le préfixe AV', async () => {
    const { getNextAvoirNumber } = useInvoiceNumbering();
    const numero = await getNextAvoirNumber();
    const year = new Date().getFullYear();

    expect(numero).toMatch(new RegExp(`^AV-${year}-\\d{5}$`));
  });

  it('retourne false quand aucune organisation sélectionnée pour isNumberAvailable', async () => {
    // Override le mock pour retourner null
    const { useAuthStore } = await import('../stores/auth');
    useAuthStore.mockReturnValueOnce({ currentOrganization: null });

    const { isNumberAvailable } = useInvoiceNumbering();
    const available = await isNumberAvailable('FA-2026-00001');

    expect(available).toBe(false);
  });
});
