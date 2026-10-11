import { describe, it, expect } from 'vitest';
import { isMemberActiveInMonth, isMonthSettled, getMemberPastDebts, getAllMemberDebts } from './debtCalc';

describe('Member Debt Calculation Logic (debtCalc)', () => {
    const baseMember = {
        _id: 'mem-123',
        fullName: 'Juan Perez',
        ci: '45678901',
        planCost: 2000,
        active: true,
        joinDate: '2025-01-01T00:00:00.000Z',
        isExempt: false,
        statusHistory: [
            { status: true, date: '2025-01-01T00:00:00.000Z' }
        ]
    };

    describe('isMemberActiveInMonth', () => {
        it('returns true when member was active all month', () => {
            const member = { ...baseMember };
            expect(isMemberActiveInMonth(member, 3, 2026, 15)).toBe(true);
        });

        it('returns false when member is exempt', () => {
            const member = { ...baseMember, isExempt: true };
            expect(isMemberActiveInMonth(member, 3, 2026, 15)).toBe(false);
        });

        it('returns false when month is prior to joinDate', () => {
            const member = {
                ...baseMember,
                joinDate: '2026-05-01T00:00:00.000Z',
                statusHistory: [{ status: true, date: '2026-05-01T00:00:00.000Z' }]
            };
            expect(isMemberActiveInMonth(member, 4, 2026, 15)).toBe(false);
            expect(isMemberActiveInMonth(member, 5, 2026, 15)).toBe(true);
        });

        it('returns false when member was inactive the entire month', () => {
            const member = {
                ...baseMember,
                statusHistory: [
                    { status: true, date: '2025-01-01T00:00:00.000Z' },
                    { status: false, date: '2026-01-31T00:00:00.000Z' } // Deactivated Jan 31
                ]
            };
            // In February 2026, member was inactive all month
            expect(isMemberActiveInMonth(member, 2, 2026, 15)).toBe(false);
            // In March 2026, member was inactive all month
            expect(isMemberActiveInMonth(member, 3, 2026, 15)).toBe(false);
        });

        it('returns false when member was active for less than 15 days in the month', () => {
            // Deactivated on Feb 10 (active 10 days out of 28)
            const member = {
                ...baseMember,
                statusHistory: [
                    { status: true, date: '2025-01-01T00:00:00.000Z' },
                    { status: false, date: '2026-02-10T12:00:00.000Z' }
                ]
            };
            expect(isMemberActiveInMonth(member, 2, 2026, 15)).toBe(false);
        });

        it('returns true when member was active for at least 15 days in the month', () => {
            // Deactivated on Feb 20 (active 20 days out of 28)
            const member = {
                ...baseMember,
                statusHistory: [
                    { status: true, date: '2025-01-01T00:00:00.000Z' },
                    { status: false, date: '2026-02-20T12:00:00.000Z' }
                ]
            };
            expect(isMemberActiveInMonth(member, 2, 2026, 15)).toBe(true);
        });

        it('handles reactivation mid-month correctly (< 15 days active = false, >= 15 days = true)', () => {
            // Inactive since Jan, reactivated May 20 (31 - 20 + 1 = 12 active days < 15)
            const memberLate = {
                ...baseMember,
                statusHistory: [
                    { status: true, date: '2025-01-01T00:00:00.000Z' },
                    { status: false, date: '2026-01-10T00:00:00.000Z' },
                    { status: true, date: '2026-05-20T00:00:00.000Z' }
                ]
            };
            expect(isMemberActiveInMonth(memberLate, 5, 2026, 15)).toBe(false);

            // Inactive since Jan, reactivated May 10 (31 - 10 + 1 = 22 active days >= 15)
            const memberEarly = {
                ...baseMember,
                statusHistory: [
                    { status: true, date: '2025-01-01T00:00:00.000Z' },
                    { status: false, date: '2026-01-10T00:00:00.000Z' },
                    { status: true, date: '2026-05-10T00:00:00.000Z' }
                ]
            };
            expect(isMemberActiveInMonth(memberEarly, 5, 2026, 15)).toBe(true);
        });
    });

    describe('isMonthSettled', () => {
        const payments = [
            { memberId: 'mem-123', month: 1, year: 2026, type: 'Cuota', amount: 2000 },
            { memberId: 'mem-123', month: 2, year: 2026, type: 'Licencia', amount: 0 },
            { memberId: 'mem-123', month: 3, year: 2026, type: 'Condonado', amount: 0 },
            { memberId: 'mem-123', month: 4, year: 2026, type: 'Nota', comments: 'Prometió pagar la semana que viene' }
        ];

        it('recognizes normal Cuota as settled', () => {
            expect(isMonthSettled(payments, 'mem-123', 'Juan Perez', 1, 2026)).toBe(true);
        });

        it('recognizes Licencia as settled (does NOT accumulate debt)', () => {
            expect(isMonthSettled(payments, 'mem-123', 'Juan Perez', 2, 2026)).toBe(true);
        });

        it('recognizes Condonado (Perdonar) as settled (does NOT accumulate debt)', () => {
            expect(isMonthSettled(payments, 'mem-123', 'Juan Perez', 3, 2026)).toBe(true);
        });

        it('does NOT consider a Nota as settled (still owes)', () => {
            expect(isMonthSettled(payments, 'mem-123', 'Juan Perez', 4, 2026)).toBe(false);
        });

        it('returns false when no record exists for that month', () => {
            expect(isMonthSettled(payments, 'mem-123', 'Juan Perez', 5, 2026)).toBe(false);
        });
    });

    describe('getMemberPastDebts (End-to-End reactivated member simulation)', () => {
        it('does NOT charge months where member was inactive when reactivated', () => {
            // Scenario: Member was active in Jan 2026 (did not pay).
            // Deactivated on Feb 1, 2026.
            // Inactive all of Feb, Mar, Apr.
            // Reactivated on May 5, 2026.
            const member = {
                _id: 'mem-123',
                fullName: 'Juan Perez',
                active: true, // currently active!
                joinDate: '2025-01-01T00:00:00.000Z',
                statusHistory: [
                    { status: true, date: '2025-01-01T00:00:00.000Z' },
                    { status: false, date: '2026-02-01T00:00:00.000Z' }, // Inactive from Feb 1
                    { status: true, date: '2026-05-05T00:00:00.000Z' }   // Reactivated May 5
                ]
            };

            // Payments array: empty (no payments made)
            const payments = [];

            // Look at past debts in May 2026 (months 1..4):
            // Month 1 (Jan): was active >= 15 days, no payment -> OWES Jan
            // Month 2 (Feb): inactive -> NO debt
            // Month 3 (Mar): inactive -> NO debt
            // Month 4 (Apr): inactive -> NO debt
            const pastDebts = getMemberPastDebts(member, payments, 5, 2026);

            expect(pastDebts).toEqual([1]); // ONLY owes Month 1 (January)!
        });

        it('does NOT charge months with Licencia or Condonado', () => {
            const member = {
                _id: 'mem-123',
                fullName: 'Juan Perez',
                active: true,
                joinDate: '2025-01-01T00:00:00.000Z',
                statusHistory: [
                    { status: true, date: '2025-01-01T00:00:00.000Z' } // Always active
                ]
            };

            const payments = [
                { memberId: 'mem-123', month: 1, year: 2026, type: 'Licencia', amount: 0 },
                { memberId: 'mem-123', month: 2, year: 2026, type: 'Condonado', amount: 0 }
            ];

            // In Month 4 (April):
            // Month 1: Licencia -> No debt
            // Month 2: Condonado -> No debt
            // Month 3: Active, no payment -> Owes Month 3
            const pastDebts = getMemberPastDebts(member, payments, 4, 2026);
            expect(pastDebts).toEqual([3]);
        });
    });

    describe('getAllMemberDebts', () => {
        it('returns both past unpaid months and current month if active and unpaid', () => {
            const member = {
                _id: 'mem-123',
                fullName: 'Juan Perez',
                active: true,
                joinDate: '2026-01-01T00:00:00.000Z',
                planCost: 2500,
                statusHistory: [{ status: true, date: '2026-01-01T00:00:00.000Z' }]
            };

            // Payment only for Jan (month 1)
            const payments = [
                { memberId: 'mem-123', month: 1, year: 2026, type: 'Cuota', amount: 2500 }
            ];

            // Suppose reference date is March 15, 2026
            const refDate = new Date(2026, 2, 15); // March (month 3)
            const allDebts = getAllMemberDebts(member, payments, refDate, 6);

            // Month 2 (Feb) was active, no payment -> past debt
            // Month 3 (Mar) is current, active >= 15 days, no payment -> current debt
            expect(allDebts.length).toBe(2);
            expect(allDebts[0].month).toBe(2);
            expect(allDebts[0].year).toBe(2026);
            expect(allDebts[0].amount).toBe(2500);
            expect(allDebts[1].month).toBe(3);
            expect(allDebts[1].isCurrent).toBe(true);
        });
    });
});
