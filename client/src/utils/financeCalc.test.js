import { describe, it, expect } from 'vitest';
import { calculatePartnerDistribution } from './financeCalc';

describe('Finance Calculation Logic', () => {
    const baseConfig = {
        partnerHourlyRate: 1000,
        savingsPercentage: 10,
        grossProfit: 100000,
        academySavingsBox: 50000,
        partners: [
            { name: 'Alice', hours: 104, daysOff: 0 },
            { name: 'Bob', hours: 104, daysOff: 0 }
        ]
    };

    it('should split profit equally when enough money is available and all partners have same hours', () => {
        // 2 partners * 4 hours/day * 26 days = 104 hours each = 208 hours total
        // 208 hours * 1000 = 208,000. 
        // Wait, grossProfit = 100000, which is < 208000. So we need to set grossProfit > 208000 for this test.
        const config = { ...baseConfig, grossProfit: 300000 };
        const results = calculatePartnerDistribution(config);

        expect(results.paymentStatus).toBe('complete');
        // Total salaries = 208,000
        // Remainder = 92,000
        // Target savings = 300,000 * 0.1 = 30,000
        // Remainder after savings = 62,000
        // Utility per partner = 31,000

        expect(results.academySavingsAdded).toBe(30000);
        expect(results.savingsStatus).toBe('complete');
        
        expect(results.partnerResults[0].hourlyPayment).toBe(104000);
        expect(results.partnerResults[0].utility).toBe(31000);
        expect(results.partnerResults[0].total).toBe(135000);
        
        expect(results.partnerResults[1].hourlyPayment).toBe(104000);
        expect(results.partnerResults[1].utility).toBe(31000);
        expect(results.partnerResults[1].total).toBe(135000);
    });

    it('should take from academy box if profit is not enough to cover base salaries', () => {
        // Total salaries = 208,000
        // grossProfit = 100,000 -> deficit of 108,000
        // academySavingsBox = 50,000 -> not enough to cover full deficit
        // Total available = 100,000 + 50,000 = 150,000
        // Distribution is proportional to 150,000 / 208,000
        const config = { ...baseConfig, grossProfit: 100000, academySavingsBox: 50000 };
        const results = calculatePartnerDistribution(config);

        expect(results.paymentStatus).toBe('proportional');
        expect(results.savingsStatus).toBe('taken');
        expect(results.academySavingsTaken).toBe(50000);
        expect(results.academySavingsAdded).toBe(0);
        expect(results.academySavingsBoxUpdated).toBe(0);

        // 150,000 total distributed among 2 equally
        expect(results.partnerResults[0].hourlyPayment).toBe(75000);
        expect(results.partnerResults[0].utility).toBe(0);
        expect(results.partnerResults[1].hourlyPayment).toBe(75000);
    });

    it('should pay full base salaries if academy box can cover deficit', () => {
        // Deficit = 108,000
        // Box = 150,000
        const config = { ...baseConfig, grossProfit: 100000, academySavingsBox: 150000 };
        const results = calculatePartnerDistribution(config);

        expect(results.paymentStatus).toBe('complete');
        expect(results.savingsStatus).toBe('taken');
        expect(results.academySavingsTaken).toBe(108000);
        expect(results.academySavingsAdded).toBe(0);
        expect(results.academySavingsBoxUpdated).toBe(150000 - 108000);

        expect(results.partnerResults[0].hourlyPayment).toBe(104000);
    });
});
