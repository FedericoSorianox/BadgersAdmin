/**
 * Calcula la distribución financiera para los socios / dueños y la caja de ahorros de la academia.
 * 
 * Regla de negocio:
 * 1. Del Resultado Operativo Neto (Ingresos - Gastos), se reserva primero el porcentaje de Ahorro Academia (ej. 10%).
 * 2. El remanente neto (Base de Reparto) se distribuye entre los socios según sus porcentajes acordados:
 *    - Fede: 70%
 *    - Gonza / Andy: 30%
 *    (o los porcentajes dinámicos configurados por socio).
 */
export const calculatePartnerDistribution = (config = {}) => {
    const grossProfit = Number(config.grossProfit) || 0;
    const savingsPct = config.savingsPercentage !== undefined && config.savingsPercentage !== null
        ? Math.max(0, Math.min(100, Number(config.savingsPercentage)))
        : 10;
    const initialSavingsBox = Number(config.academySavingsBox) || 0;
    const rawPartners = config.partners || [];

    if (!rawPartners || rawPartners.length === 0) {
        return {
            partnerResults: [],
            distributableNet: 0,
            academySavingsAdded: 0,
            academySavingsTaken: 0,
            academySavingsNet: 0,
            academySavingsBoxUpdated: initialSavingsBox,
            savingsStatus: 'complete',
            paymentStatus: 'complete'
        };
    }

    // Resolver porcentaje por cada socio (Fede: 70%, Gonza/Andy: 30%, otros: 50% o valor configurado)
    const partners = rawPartners.map(p => {
        let pct;
        if (p.percentage !== undefined && p.percentage !== null && !isNaN(Number(p.percentage))) {
            pct = Number(p.percentage);
        } else if (/fede/i.test(p.name || '')) {
            pct = 70;
        } else if (/gonza|andy/i.test(p.name || '')) {
            pct = 30;
        } else {
            pct = 50;
        }
        return {
            ...p,
            percentage: pct
        };
    });

    const totalPct = partners.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);

    let academySavingsAdded = 0;
    let academySavingsTaken = 0;
    let distributableNet = 0;
    let savingsStatus = 'complete';

    if (grossProfit > 0) {
        const targetSavings = grossProfit * (savingsPct / 100);
        academySavingsAdded = targetSavings;
        distributableNet = grossProfit - targetSavings;
        savingsStatus = savingsPct > 0 ? 'complete' : 'complete';
        academySavingsTaken = 0;
    } else if (grossProfit < 0) {
        academySavingsAdded = 0;
        const deficit = Math.abs(grossProfit);
        academySavingsTaken = Math.min(Math.max(0, initialSavingsBox), deficit);
        const totalAvailable = grossProfit + academySavingsTaken;
        distributableNet = Math.max(0, totalAvailable);
        savingsStatus = academySavingsTaken > 0 ? 'taken' : 'none';
    } else {
        academySavingsAdded = 0;
        academySavingsTaken = 0;
        distributableNet = 0;
        savingsStatus = 'complete';
    }

    const academySavingsNet = academySavingsAdded - academySavingsTaken;
    const academySavingsBoxUpdated = initialSavingsBox + academySavingsNet;

    // Distribuir la base neta de reparto según los porcentajes
    const partnerResults = partners.map(p => {
        const shareRatio = totalPct > 0 ? (p.percentage / totalPct) : (1 / partners.length);
        const total = distributableNet * shareRatio;
        return {
            name: p.name,
            percentage: p.percentage,
            effectivePercentage: Number((shareRatio * 100).toFixed(2)),
            total: Math.round(total * 100) / 100,
            distributableNet: Math.round(distributableNet * 100) / 100,
            hourlyPayment: 0,
            utility: Math.round(total * 100) / 100,
            effectiveHours: Number(p.hours) || 0
        };
    });

    return {
        partnerResults,
        distributableNet: Math.round(distributableNet * 100) / 100,
        academySavingsAdded: Math.round(academySavingsAdded * 100) / 100,
        academySavingsTaken: Math.round(academySavingsTaken * 100) / 100,
        academySavingsNet: Math.round(academySavingsNet * 100) / 100,
        academySavingsBoxUpdated: Math.round(academySavingsBoxUpdated * 100) / 100,
        savingsStatus,
        paymentStatus: 'complete'
    };
};
