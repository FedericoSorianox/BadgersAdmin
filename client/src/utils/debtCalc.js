/**
 * Utility functions for member fee debt calculations.
 * 
 * Business Rules:
 * 1. A member only owes a previous month fee if they were ACTIVE for at least 15 days in that month.
 * 2. If a month has a payment of type 'Cuota', 'Licencia', or 'Condonado' (perdonar), the month is settled (no debt).
 * 3. Exempt members (isExempt = true) never owe membership fees.
 * 4. Months prior to the member's joinDate do not generate debt.
 * 5. Family dependents are billed through their family head (see getBillingMember).
 *
 * IMPORTANT: Every view (Pagos, Dashboard, Ficha, Analíticas) must use the helpers in this file
 * to decide whether a month is paid. Divergent inline checks are what caused "phantom debts".
 */

export const SETTLEMENT_STATUS = Object.freeze({
    PAID: 'paid',
    LICENSED: 'licensed',
    FORGIVEN: 'forgiven'
});

// Legacy records may have no type: they were always membership fees.
const STATUS_BY_TYPE = {
    Cuota: SETTLEMENT_STATUS.PAID,
    Licencia: SETTLEMENT_STATUS.LICENSED,
    Condonado: SETTLEMENT_STATUS.FORGIVEN
};

// When several settling records exist for the same month, a real payment wins over a status record.
const STATUS_PRIORITY = {
    [SETTLEMENT_STATUS.PAID]: 0,
    [SETTLEMENT_STATUS.LICENSED]: 1,
    [SETTLEMENT_STATUS.FORGIVEN]: 2
};

/**
 * Maps a payment record to its settlement status, or null if it doesn't settle a month (Producto, Venta, Nota...).
 * @param {Object|null|undefined} payment
 * @returns {'paid'|'licensed'|'forgiven'|null}
 */
export const getSettlementStatus = (payment) => {
    if (!payment) return null;
    if (!payment.type) return SETTLEMENT_STATUS.PAID;
    return STATUS_BY_TYPE[payment.type] || null;
};

export const isSettlingPayment = (payment) => getSettlementStatus(payment) !== null;

/**
 * Resolves the billing period of a payment.
 * Explicit month/year always win. The date fallback only applies to legacy records and uses UTC,
 * because imported dates are stored as UTC midnight (local time would shift the 1st to the previous month).
 * @param {Object} payment
 * @returns {{ month: number, year: number } | null}
 */
export const getPaymentPeriod = (payment) => {
    if (!payment) return null;
    const rawDate = payment.date || payment.createdAt;
    const date = rawDate ? new Date(rawDate) : null;
    const hasValidDate = date && !isNaN(date.getTime());

    const month = Number(payment.month || (hasValidDate ? date.getUTCMonth() + 1 : NaN));
    const year = Number(payment.year || (hasValidDate ? date.getUTCFullYear() : NaN));

    if (!Number.isFinite(month) || !Number.isFinite(year)) return null;
    return { month, year };
};

const normalizeName = (name) => (typeof name === 'string' ? name.trim().toLowerCase() : '');

/**
 * Whether a payment belongs to the given member identity.
 * - memberId: primary key.
 * - memberCi: unique per tenant; covers members that were deleted and re-created (new _id).
 * - name: only for orphan records without memberId, otherwise two homonyms would settle each other.
 *
 * @param {Object} payment
 * @param {{ id?: string, fullName?: string, ci?: string }} identity
 * @returns {boolean}
 */
export const paymentMatchesMember = (payment, { id, fullName, ci } = {}) => {
    if (!payment) return false;

    if (id && payment.memberId && String(payment.memberId) === String(id)) return true;
    if (ci && payment.memberCi && String(payment.memberCi).trim() === String(ci).trim()) return true;

    if (!payment.memberId) {
        const targetName = normalizeName(fullName);
        // `socio` is the legacy field name; the schema field is `memberName`.
        const payerName = normalizeName(payment.memberName || payment.socio);
        if (targetName && payerName && payerName === targetName) return true;
    }
    return false;
};

/**
 * Finds the record that settles a month for a member (highest priority: Cuota > Licencia > Condonado).
 *
 * @param {Array} payments
 * @param {{ _id?: string, fullName?: string, ci?: string }} member
 * @param {number} month - 1-indexed
 * @param {number} year
 * @returns {Object|null} The settling payment record, or null if the month is not settled.
 */
export const findMonthSettlement = (payments, member, month, year) => {
    if (!Array.isArray(payments) || !member) return null;
    const identity = { id: member._id, fullName: member.fullName, ci: member.ci };
    if (!identity.id && !identity.fullName && !identity.ci) return null;

    const targetMonth = Number(month);
    const targetYear = Number(year);

    let best = null;
    let bestPriority = Infinity;

    for (const payment of payments) {
        const status = getSettlementStatus(payment);
        if (!status) continue;

        const period = getPaymentPeriod(payment);
        if (!period || period.month !== targetMonth || period.year !== targetYear) continue;
        if (!paymentMatchesMember(payment, identity)) continue;

        const priority = STATUS_PRIORITY[status];
        if (priority < bestPriority) {
            best = payment;
            bestPriority = priority;
            if (priority === 0) break; // Can't beat a real payment
        }
    }
    return best;
};

/**
 * Returns the member whose payments settle this member's fee.
 * Family dependents are billed through the head; the public endpoint embeds it as `familyHead`.
 * When the head object isn't available we fall back to an id-only stub so matching still works.
 *
 * @param {Object} member
 * @param {Array} [allMembers] - Optional list to resolve the head from (authenticated views).
 * @returns {Object}
 */
export const getBillingMember = (member, allMembers = null) => {
    if (!member || !member.familyId || member.isFamilyHead) return member;

    if (member.familyHead && typeof member.familyHead === 'object') return member.familyHead;

    if (Array.isArray(allMembers)) {
        const head = allMembers.find(m => String(m._id) === String(member.familyId));
        if (head) return head;
    }
    return member;
};

/**
 * Returns whether a member was active for at least `minActiveDays` in the specified month and year.
 * 
 * @param {Object} member - The member document/object
 * @param {number} month - 1-indexed month (1 = Jan, 12 = Dec)
 * @param {number} year - Full year (e.g. 2026)
 * @param {number} [minActiveDays=15] - Minimum active days required to consider the month billable
 * @returns {boolean}
 */
export const isMemberActiveInMonth = (member, month, year, minActiveDays = 15) => {
    if (!member) return false;
    if (member.isExempt) return false;

    // Resolve joinDate safely
    const joinDateRaw = member.joinDate || member.createdAt;
    const joinDate = joinDateRaw ? new Date(joinDateRaw) : null;
    if (joinDate && !isNaN(joinDate.getTime())) {
        const joinYear = joinDate.getUTCFullYear();
        const joinMonth = joinDate.getUTCMonth() + 1;
        // Prior to join month/year -> never active
        if (year < joinYear || (year === joinYear && month < joinMonth)) {
            return false;
        }
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    let activeDays = 0;

    const hasHistory = Array.isArray(member.statusHistory) && member.statusHistory.length > 0;

    if (hasHistory) {
        // Sort status history chronologically
        const sortedHistory = [...member.statusHistory]
            .filter(entry => entry && entry.date)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (let d = 1; d <= daysInMonth; d++) {
            // End of day in UTC
            const dayDate = new Date(Date.UTC(year, month - 1, d, 23, 59, 59, 999));

            // If day is before joinDate, member wasn't enrolled yet
            if (joinDate && dayDate < joinDate) {
                continue;
            }

            // Find the most recent status entry up to this day
            let currentStatus = true;
            let found = false;
            for (let i = sortedHistory.length - 1; i >= 0; i--) {
                const entryDate = new Date(sortedHistory[i].date);
                if (entryDate <= dayDate) {
                    currentStatus = !!sortedHistory[i].status;
                    found = true;
                    break;
                }
            }

            // If no status entry before dayDate, use the earliest status in history
            if (!found && sortedHistory.length > 0) {
                currentStatus = !!sortedHistory[0].status;
            }

            if (currentStatus) {
                activeDays++;
            }
        }
    } else {
        // Fallback when no statusHistory is recorded
        if (joinDate && !isNaN(joinDate.getTime())) {
            const joinYear = joinDate.getUTCFullYear();
            const joinMonth = joinDate.getUTCMonth() + 1;
            if (year === joinYear && month === joinMonth) {
                const joinDay = joinDate.getUTCDate();
                const daysSinceJoin = daysInMonth - joinDay + 1;
                activeDays = member.active !== false ? Math.max(0, daysSinceJoin) : 0;
            } else {
                activeDays = member.active !== false ? daysInMonth : 0;
            }
        } else {
            activeDays = member.active !== false ? daysInMonth : 0;
        }
    }

    return activeDays >= minActiveDays;
};

/**
 * Checks if a specific month/year has been settled for a member
 * (Paid as Cuota, marked as Licencia, or Condonado/Perdonado).
 * Kept for backwards compatibility; delegates to findMonthSettlement.
 * 
 * @param {Array} payments - Array of payment records
 * @param {string} memberId - Member _id
 * @param {string} [memberFullName] - Member full name
 * @param {number} month - 1-indexed month
 * @param {number} year - Full year
 * @param {string} [memberCi] - Member CI
 * @returns {boolean}
 */
export const isMonthSettled = (payments = [], memberId, memberFullName, month, year, memberCi) => {
    if (!memberId && !memberFullName && !memberCi) return false;
    const identity = { _id: memberId, fullName: memberFullName, ci: memberCi };
    return findMonthSettlement(payments, identity, month, year) !== null;
};

/**
 * Calculates past debt months for a member.
 * Only returns months where:
 * 1. Member was ACTIVE for at least minActiveDays (default 15).
 * 2. Month has NO record of Cuota, Licencia, or Condonado.
 * 
 * @param {Object} member - The member object
 * @param {Array} payments - List of all payments
 * @param {number} currentMonth - Reference month (e.g. current month)
 * @param {number} currentYear - Reference year (e.g. current year)
 * @param {number|null} [lookbackMonths=null] - Max number of months to look back (null = from start of current year)
 * @param {number} [minActiveDays=15] - Minimum active days in the month
 * @returns {Array<number>} - Array of unpaid past month numbers (1..12) or month objects
 */
export const getMemberPastDebts = (
    member,
    payments,
    currentMonth,
    currentYear,
    lookbackMonths = null,
    minActiveDays = 15
) => {
    if (!member || member.isExempt) return [];

    const pastDebts = [];

    if (lookbackMonths !== null) {
        // Look back a specific number of months (e.g., 3 months for Dashboard and Profile)
        for (let i = 1; i <= lookbackMonths; i++) {
            const date = new Date(currentYear, currentMonth - 1 - i, 1);
            const m = date.getMonth() + 1;
            const y = date.getFullYear();

            const wasActive = isMemberActiveInMonth(member, m, y, minActiveDays);
            if (!wasActive) continue;

            if (!findMonthSettlement(payments, member, m, y)) {
                pastDebts.push({
                    month: m,
                    year: y,
                    label: date.toLocaleString('es-ES', { month: 'short' }),
                    fullLabel: date.toLocaleString('es-ES', { month: 'long' }),
                    amount: member.planCost || 2000
                });
            }
        }
    } else {
        // Look back within the current year from month 1 up to (currentMonth - 1)
        for (let m = 1; m < currentMonth; m++) {
            const wasActive = isMemberActiveInMonth(member, m, currentYear, minActiveDays);
            if (!wasActive) continue;

            if (!findMonthSettlement(payments, member, m, currentYear)) {
                pastDebts.push(m);
            }
        }
    }

    return pastDebts;
};

/**
 * Gets all unpaid debts for a member (past unpaid months + current month if active and unpaid).
 * Returns debts sorted chronologically (oldest first).
 * 
 * @param {Object} member - The member object
 * @param {Array} payments - List of all payments
 * @param {Date} [referenceDate=new Date()] - Reference date
 * @param {number} [lookbackMonths=12] - Number of past months to look back
 * @param {number} [minActiveDays=15] - Minimum active days in month
 * @returns {Array<Object>} - Array of debt objects { month, year, label, fullLabel, amount, isCurrent }
 */
export const getAllMemberDebts = (
    member,
    payments,
    referenceDate = new Date(),
    lookbackMonths = 12,
    minActiveDays = 15
) => {
    if (!member || member.isExempt) return [];

    const currentMonth = referenceDate.getMonth() + 1;
    const currentYear = referenceDate.getFullYear();

    // Past unpaid months
    const pastDebts = getMemberPastDebts(member, payments, currentMonth, currentYear, lookbackMonths, minActiveDays);

    // Current month check
    const isCurrentActive = isMemberActiveInMonth(member, currentMonth, currentYear, minActiveDays);
    const isCurrentSettled = findMonthSettlement(payments, member, currentMonth, currentYear) !== null;

    const allDebts = [...pastDebts];

    if (isCurrentActive && !isCurrentSettled) {
        allDebts.push({
            month: currentMonth,
            year: currentYear,
            label: referenceDate.toLocaleString('es-ES', { month: 'short' }),
            fullLabel: referenceDate.toLocaleString('es-ES', { month: 'long' }),
            amount: member.planCost || 2000,
            isCurrent: true
        });
    }

    // Sort chronologically (oldest to newest)
    allDebts.sort((a, b) => (a.year - b.year) || (a.month - b.month));

    return allDebts;
};
