import { describe, it, expect, vi } from 'vitest';
import { registerStudentPayment } from '@/lib/cotisation';
import { PER_STUDENT_SCHOOL_SHARE_GNF } from '@/lib/pricing';

function makeFakeSupabase(existing: any = null) {
  const builder = {
    eq: (_k: string, _v: any) => builder,
    maybeSingle: async () => ({ data: existing }),
    select: () => ({ maybeSingle: async () => ({ data: existing }) }),
  };

  return {
    from: (_table: string) => ({
      select: () => builder,
      update: (payload: any) => ({
        eq: (_k: string, _v: any) => ({
          select: () => ({
            maybeSingle: async () => ({ data: { ...existing, ...payload } }),
          }),
        }),
      }),
      insert: (payload: any) => ({
        select: () => ({
          maybeSingle: async () => ({ data: { ...payload, id: 'new-id' } }),
        }),
      }),
    }),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  } as any;
}

describe('registerStudentPayment', () => {
  it('uses a single centralized school reversement of 15000 GNF per student', () => {
    expect(PER_STUDENT_SCHOOL_SHARE_GNF).toBe(15000);
  });

  it('returns already_paid when existing row is paid', async () => {
    const existing = { id: 'p1', status: 'paye', student_id: 's1', academic_year: '2026' };
    const sup = makeFakeSupabase(existing);
    const res = await registerStudentPayment({ studentId: 's1', schoolId: 'sch', academicYear: '2026', amount: 100000, schoolShare: PER_STUDENT_SCHOOL_SHARE_GNF, supabase: sup });
    expect(res.status).toBe('already_paid');
    expect((res as any).row.id).toBe('p1');
  });

  it('updates existing unpaid row', async () => {
    const existing = { id: 'p2', status: 'en_attente', student_id: 's2', academic_year: '2026' };
    const sup = makeFakeSupabase(existing);
    const res = await registerStudentPayment({ studentId: 's2', schoolId: 'sch', academicYear: '2026', amount: 100000, schoolShare: PER_STUDENT_SCHOOL_SHARE_GNF, reference: 'ref1', paidBy: 'u1', supabase: sup });
    expect(res.status).toBe('updated');
    expect((res as any).row.status).toBe('paye');
    expect((res as any).row.reference).toBe('ref1');
  });

  it('creates when no existing row', async () => {
    const sup = makeFakeSupabase(null);
    const res = await registerStudentPayment({ studentId: 's3', schoolId: 'sch', academicYear: '2026', amount: 100000, schoolShare: PER_STUDENT_SCHOOL_SHARE_GNF, reference: 'ref2', paidBy: 'u1', supabase: sup });
    expect(res.status).toBe('created');
    expect((res as any).row.id).toBe('new-id');
    expect((res as any).row.receipt_number).toBeDefined();
  });
});
