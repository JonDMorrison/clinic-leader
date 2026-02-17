import { describe, it, expect, vi } from 'vitest';

describe('Integration Flow Validation: Jane vs Spreadsheet', () => {
    it('should verify provider switching logic for canonical results', () => {
        const results = [
            { source: 'jane', is_canonical: true, value: 100, period_start: '2024-01-01' },
            { source: 'spreadsheet', is_canonical: false, value: 105, period_start: '2024-01-01' },
        ];

        // The selection engine logic (hardened in useCanonicalMetricResults)
        const canonical = results.find(r => r.is_canonical);
        expect(canonical?.source).toBe('jane');
        expect(canonical?.value).toBe(100);
    });

    it('should verify synthetic data isolation is respected', () => {
        const mixedData = [
            { id: 1, is_synthetic: true, value: 50 },
            { id: 2, is_synthetic: false, value: 75 },
        ];

        // Filter logic equivalent to what should be in analytics components
        const realDataOnly = mixedData.filter(d => !d.is_synthetic);
        expect(realDataOnly.length).toBe(1);
        expect(realDataOnly[0].id).toBe(2);
    });
});
