/**
 * Utility functions for member fee debt calculations.
 * 
 * Business Rules:
 * 1. A member only owes a previous month fee if they were ACTIVE for at least 15 days in that month.
 * 2. If a month has a payment of type 'Cuota', 'Licencia', or 'Condonado' (perdonar), the month is settled (no debt).
 * 3. Exempt members (isExempt = true) never owe membership fees.
 * 4. Months prior to the member's joinDate do not generate debt.
 */

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
    if (!Array.isArray(payments) || (!memberId && !memberFullName && !memberCi)) {
        return false;
    }

    const cleanName = memberFullName ? memberFullName.trim().toLowerCase() : null;
    const targetMonth = Number(month);
    const targetYear = Number(year);

    return payments.some(p => {
        const d = new Date(p.date || p.createdAt);
        const pMonth = Number(p.month || (d.getMonth() + 1));
        const pYear = Number(p.year || d.getFullYear());

        if (pMonth !== targetMonth || pYear !== targetYear) {
            return false;
        }

        // Must be Cuota, Licencia, Condonado, or unspecified type
        const isSettlingType = p.type === 'Cuota' || p.type === 'Licencia' || p.type === 'Condonado' || !p.type;
        if (!isSettlingType) {
            return false;
        }

        const matchesId = memberId && String(p.memberId) === String(memberId);
        const matchesCi = memberCi && p.memberCi && String(p.memberCi) === String(memberCi);
        const matchesName = cleanName && p.socio && p.socio.trim().toLowerCase() === cleanName;

        return matchesId || matchesCi || matchesName;
    });
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

            const isSettled = isMonthSettled(payments, member._id, member.fullName, m, y, member.ci);
            if (!isSettled) {
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

            const isSettled = isMonthSettled(payments, member._id, member.fullName, m, currentYear, member.ci);
            if (!isSettled) {
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
    const isCurrentSettled = isMonthSettled(payments, member._id, member.fullName, currentMonth, currentYear, member.ci);

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

