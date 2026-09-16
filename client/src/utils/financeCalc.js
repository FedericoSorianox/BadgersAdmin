export const calculatePartnerDistribution = (config) => {
    const workingDays = 26;
    const hourlyRate = config.partnerHourlyRate !== undefined && config.partnerHourlyRate !== null ? Number(config.partnerHourlyRate) : 1000;
    const savingsPct = config.savingsPercentage !== undefined && config.savingsPercentage !== null ? Number(config.savingsPercentage) : 10;
    const grossProfit = Number(config.grossProfit) || 0;

    // Calculate effective hours for each partner
    const partnerCalcs = (config.partners || []).map(p => {
        const baseHours = Number(p.hours) || 0;
        const daysOff = Number(p.daysOff) || 0;
        const effectiveHours = baseHours * ((workingDays - daysOff) / workingDays);
        const basePayment = effectiveHours * hourlyRate;
        return { name: p.name, baseHours, daysOff, effectiveHours, basePayment };
    });

    const totalEffectiveHours = partnerCalcs.reduce((sum, p) => sum + p.effectiveHours, 0);
    const totalHourlyPayment = partnerCalcs.reduce((sum, p) => sum + p.basePayment, 0);

    if (totalEffectiveHours <= 0 || !config.partners || config.partners.length === 0) {
        return {
            partnerResults: (config.partners || []).map(p => ({
                name: p.name, hourlyPayment: 0, utility: 0, total: 0,
                effectiveHours: 0
            })),
            academySavingsAdded: 0, academySavingsTaken: 0, academySavingsNet: 0,
            academySavingsBoxUpdated: Number(config.academySavingsBox) || 0,
            savingsStatus: 'complete', paymentStatus: 'complete'
        };
    }

    const initialSavingsBox = Number(config.academySavingsBox) || 0;
    const partnerCount = config.partners.length;

    let academySavingsAdded = 0;
    let academySavingsTaken = 0;
    let partnerPayments = partnerCalcs.map(p => ({ ...p, hourlyPayment: 0, utility: 0 }));
    let savingsStatus = 'complete';
    let paymentStatus = 'complete';

    if (grossProfit >= totalHourlyPayment) {
        // Enough to pay all partners their hourly rate
        partnerPayments = partnerPayments.map(p => ({ ...p, hourlyPayment: p.basePayment }));
        paymentStatus = 'complete';

        const remainderAfterSalaries = grossProfit - totalHourlyPayment;
        const targetSavings = grossProfit * (savingsPct / 100);

        if (remainderAfterSalaries >= targetSavings) {
            academySavingsAdded = targetSavings;
            savingsStatus = 'complete';
            const utility = remainderAfterSalaries - targetSavings;
            const utilityPerPartner = utility / partnerCount;
            partnerPayments = partnerPayments.map(p => ({ ...p, utility: utilityPerPartner }));
        } else {
            academySavingsAdded = remainderAfterSalaries;
            savingsStatus = 'partial';
        }
        academySavingsTaken = 0;
    } else {
        // Not enough to pay hourly rates
        academySavingsAdded = 0;
        const deficit = totalHourlyPayment - grossProfit;
        academySavingsTaken = Math.min(initialSavingsBox, deficit);
        const totalAvailable = grossProfit + academySavingsTaken;

        if (totalAvailable >= totalHourlyPayment) {
            partnerPayments = partnerPayments.map(p => ({ ...p, hourlyPayment: p.basePayment }));
            paymentStatus = 'complete';
            savingsStatus = 'taken';
        } else {
            // Proportional distribution
            partnerPayments = partnerPayments.map(p => ({
                ...p,
                hourlyPayment: totalAvailable * (p.effectiveHours / totalEffectiveHours)
            }));
            paymentStatus = 'proportional';
            savingsStatus = 'taken';
        }
    }

    const academySavingsNet = academySavingsAdded - academySavingsTaken;
    const academySavingsBoxUpdated = initialSavingsBox + academySavingsNet;

    const partnerResults = partnerPayments.map(p => ({
        name: p.name,
        hourlyPayment: p.hourlyPayment,
        utility: p.utility,
        total: p.hourlyPayment + p.utility,
        effectiveHours: p.effectiveHours
    }));

    return {
        partnerResults,
        academySavingsAdded,
        academySavingsTaken,
        academySavingsNet,
        academySavingsBoxUpdated,
        savingsStatus,
        paymentStatus
    };
};
