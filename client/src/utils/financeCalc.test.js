import { describe, it, expect } from 'vitest';
import { calculatePartnerDistribution } from './financeCalc';

describe('Finance Calculation Logic - Partner Distribution', () => {
    const baseConfig = {
        savingsPercentage: 10,
        grossProfit: 100000,
        academySavingsBox: 50000,
        partners: [
            { name: 'Fede', percentage: 70 },
            { name: 'Gonza / Andy', percentage: 30 }
        ]
    };

    it('should reserve 10% for academy savings and distribute remaining 90% as 70% Fede and 30% Gonza/Andy', () => {
        // Gross: 100,000
        // Savings (10%): 10,000
        // Base de Reparto: 90,000
        // Fede (70%): 63,000
        // Gonza/Andy (30%): 27,000
        const results = calculatePartnerDistribution(baseConfig);

        expect(results.academySavingsAdded).toBe(10000);
        expect(results.academySavingsTaken).toBe(0);
        expect(results.academySavingsNet).toBe(10000);
        expect(results.academySavingsBoxUpdated).toBe(60000);
        expect(results.distributableNet).toBe(90000);

        expect(results.partnerResults).toHaveLength(2);
        expect(results.partnerResults[0].name).toBe('Fede');
        expect(results.partnerResults[0].percentage).toBe(70);
        expect(results.partnerResults[0].total).toBe(63000);

        expect(results.partnerResults[1].name).toBe('Gonza / Andy');
        expect(results.partnerResults[1].percentage).toBe(30);
        expect(results.partnerResults[1].total).toBe(27000);
    });

    it('should distribute 70% to Fede and 30% to Gonza directly when savings percentage is 0%', () => {
        // Gross: 100,000
        // Savings (0%): 0
        // Distributable: 100,000
        // Fede: 70,000
        // Gonza: 30,000
        const config = { ...baseConfig, savingsPercentage: 0 };
        const results = calculatePartnerDistribution(config);

        expect(results.academySavingsAdded).toBe(0);
        expect(results.distributableNet).toBe(100000);
        expect(results.partnerResults[0].total).toBe(70000);
        expect(results.partnerResults[1].total).toBe(30000);
    });

    it('should default to 70% Fede and 30% Gonza/Andy when percentage fields are not explicitly set', () => {
        const config = {
            savingsPercentage: 10,
            grossProfit: 200000,
            academySavingsBox: 0,
            partners: [
                { name: 'Fede' },
                { name: 'Gonza' }
            ]
        };
        const results = calculatePartnerDistribution(config);

        // Gross: 200,000 -> Savings 10% = 20,000 -> Distributable = 180,000
        // Fede (70%): 126,000
        // Gonza (30%): 54,000
        expect(results.distributableNet).toBe(180000);
        expect(results.partnerResults[0].percentage).toBe(70);
        expect(results.partnerResults[0].total).toBe(126000);
        expect(results.partnerResults[1].percentage).toBe(30);
        expect(results.partnerResults[1].total).toBe(54000);
    });

    it('should support custom dynamic percentages', () => {
        const config = {
            savingsPercentage: 10,
            grossProfit: 100000,
            academySavingsBox: 0,
            partners: [
                { name: 'Partner A', percentage: 60 },
                { name: 'Partner B', percentage: 40 }
            ]
        };
        const results = calculatePartnerDistribution(config);

        expect(results.distributableNet).toBe(90000);
        expect(results.partnerResults[0].total).toBe(54000);
        expect(results.partnerResults[1].total).toBe(36000);
    });

    it('should handle zero gross profit cleanly', () => {
        const config = { ...baseConfig, grossProfit: 0 };
        const results = calculatePartnerDistribution(config);

        expect(results.academySavingsAdded).toBe(0);
        expect(results.distributableNet).toBe(0);
        expect(results.partnerResults[0].total).toBe(0);
        expect(results.partnerResults[1].total).toBe(0);
        expect(results.academySavingsBoxUpdated).toBe(50000);
    });

    it('should take from academy savings box when gross profit is negative', () => {
        // Gross: -20,000
        // Box: 50,000
        // Deficit: 20,000 taken from box -> Box updated: 30,000
        // Distributable: 0
        const config = { ...baseConfig, grossProfit: -20000, academySavingsBox: 50000 };
        const results = calculatePartnerDistribution(config);

        expect(results.academySavingsAdded).toBe(0);
        expect(results.academySavingsTaken).toBe(20000);
        expect(results.academySavingsBoxUpdated).toBe(30000);
        expect(results.distributableNet).toBe(0);
        expect(results.partnerResults[0].total).toBe(0);
        expect(results.partnerResults[1].total).toBe(0);
    });

    it('should handle empty partners safely', () => {
        const config = { ...baseConfig, partners: [] };
        const results = calculatePartnerDistribution(config);

        expect(results.partnerResults).toEqual([]);
        expect(results.distributableNet).toBe(0);
    });

    it('should treat empty string percentage as 0 without resetting to defaults', () => {
        const config = {
            savingsPercentage: 0,
            grossProfit: 100000,
            partners: [
                { name: 'Fede', percentage: '' },
                { name: 'Gonza / Andy', percentage: 100 }
            ]
        };
        const results = calculatePartnerDistribution(config);

        expect(results.distributableNet).toBe(100000);
        expect(results.partnerResults[0].percentage).toBe(0);
        expect(results.partnerResults[0].total).toBe(0);
        expect(results.partnerResults[1].percentage).toBe(100);
        expect(results.partnerResults[1].total).toBe(100000);
    });

    it('should support updating distribution to 80/20 cleanly', () => {
        const config = {
            savingsPercentage: 0,
            grossProfit: 100000,
            partners: [
                { name: 'Fede', percentage: 80 },
                { name: 'Gonza / Andy', percentage: 20 }
            ]
        };
        const results = calculatePartnerDistribution(config);

        expect(results.partnerResults[0].percentage).toBe(80);
        expect(results.partnerResults[0].total).toBe(80000);
        expect(results.partnerResults[1].percentage).toBe(20);
        expect(results.partnerResults[1].total).toBe(20000);
    });
});
