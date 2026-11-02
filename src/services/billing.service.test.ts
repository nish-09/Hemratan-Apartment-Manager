import { describe, it, expect, beforeEach } from 'vitest';
import { BillingService, BillingConfiguration } from './billing.service';

describe('BillingService (Stage 6 Maintenance Billing & Financial Core)', () => {
  beforeEach(() => {
    BillingService._resetForTesting();
  });

  describe('1. Currency & Integer Paise Arithmetic', () => {
    it('formats integer paise correctly into Indian currency formatting', () => {
      expect(BillingService.formatPaiseToInr(200000)).toBe('₹2,000.00');
      expect(BillingService.formatPaiseToInr(585050)).toBe('₹5,850.50');
      expect(BillingService.formatPaiseToInr(12500000)).toBe('₹1,25,000.00');
      expect(BillingService.formatPaiseToInr(0)).toBe('₹0.00');
    });

    it('converts INR rupees to exact integer paise without floating point inaccuracy', () => {
      expect(BillingService.rupeesToPaise(1250.5)).toBe(125050);
      expect(BillingService.rupeesToPaise(3.5)).toBe(350);
      expect(BillingService.rupeesToPaise(2000)).toBe(200000);
    });
  });

  describe('2. Maintenance Calculation Formulas', () => {
    const baseConfig: BillingConfiguration = {
      id: 'cfg-test',
      billingModel: 'HYBRID',
      frequency: 'MONTHLY',
      fixedChargePaise: 200000, // ₹2,000
      ratePerSqFtPaise: 350, // ₹3.50/sq ft
      lateFeePercentage: 2.0,
      gracePeriodDays: 10,
      gstHandling: 'NOT_APPLICABLE',
      gstPercentage: 0,
      isActive: true,
      effectiveFrom: '2026-01-01',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    it('calculates fixed-only maintenance bill correctly', () => {
      const fixedConfig: BillingConfiguration = { ...baseConfig, billingModel: 'FIXED' };
      const snapshot = BillingService.calculateMaintenanceBill({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1100,
        billingConfig: fixedConfig,
      });

      expect(snapshot.baseFixedPaise).toBe(200000);
      expect(snapshot.baseAreaPaise).toBe(0);
      expect(snapshot.totalAmountPaise).toBe(200000); // Exactly ₹2,000.00
    });

    it('calculates area-only maintenance bill correctly', () => {
      const areaConfig: BillingConfiguration = { ...baseConfig, billingModel: 'AREA_BASED' };
      const snapshot = BillingService.calculateMaintenanceBill({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1100, // 1100 * 350 = 385,000 paise
        billingConfig: areaConfig,
      });

      expect(snapshot.baseFixedPaise).toBe(0);
      expect(snapshot.baseAreaPaise).toBe(385000);
      expect(snapshot.totalAmountPaise).toBe(385000); // Exactly ₹3,850.00
    });

    it('calculates hybrid maintenance formula correctly (Fixed + Area)', () => {
      const snapshot = BillingService.calculateMaintenanceBill({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1100, // Fixed 200,000 + Area 385,000 = 585,000 paise (₹5,850)
        billingConfig: baseConfig,
      });

      expect(snapshot.baseFixedPaise).toBe(200000);
      expect(snapshot.baseAreaPaise).toBe(385000);
      expect(snapshot.subtotalPaise).toBe(585000);
      expect(snapshot.totalAmountPaise).toBe(585000);
    });

    it('incorporates additional line items, adjustments, and credits', () => {
      const snapshot = BillingService.calculateMaintenanceBill({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1100, // 585,000 paise base
        billingConfig: baseConfig,
        additionalItems: [
          { description: 'Sinking Fund', amountPaise: 50000, category: 'SINKING_FUND' }, // ₹500
          { description: 'Stilt Parking Space', amountPaise: 100000, category: 'PARKING' }, // ₹1,000
        ],
        adjustmentsPaise: 15000, // ₹150 penalty
        discountCreditsPaise: 20000, // ₹200 festival concession
      });

      // 585,000 + 50,000 + 100,000 + 15,000 = 750,000 - 20,000 = 730,000 paise (₹7,300)
      expect(snapshot.additionalChargesPaise).toBe(150000);
      expect(snapshot.adjustmentsPaise).toBe(15000);
      expect(snapshot.discountCreditsPaise).toBe(20000);
      expect(snapshot.totalAmountPaise).toBe(730000);
    });

    it('applies manual GST percentage correctly on taxable items', () => {
      const gstConfig: BillingConfiguration = {
        ...baseConfig,
        gstHandling: 'MANUAL',
        gstPercentage: 18.0,
      };

      const snapshot = BillingService.calculateMaintenanceBill({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1000, // 200,000 + 350,000 = 550,000 paise
        billingConfig: gstConfig,
      });

      // Taxable: 550,000. 18% of 550,000 = 99,000 paise (₹990.00)
      expect(snapshot.gstAmountPaise).toBe(99000);
      expect(snapshot.totalAmountPaise).toBe(649000); // ₹6,490.00
    });

    it('rejects invalid or negative flat area and charges', () => {
      expect(() =>
        BillingService.calculateMaintenanceBill({
          flatId: 'flat-a-402',
          flatNumber: '402',
          wing: 'A',
          areaSqFt: -50,
          billingConfig: baseConfig,
        })
      ).toThrow('positive number');

      expect(() =>
        BillingService.calculateMaintenanceBill({
          flatId: 'flat-a-402',
          flatNumber: '402',
          wing: 'A',
          areaSqFt: 1000,
          billingConfig: baseConfig,
          additionalItems: [{ description: 'Invalid', amountPaise: -200, category: 'CUSTOM' }],
        })
      ).toThrow('cannot be negative');
    });
  });

  describe('3. Invoice Generation & Historical Snapshot Preservation', () => {
    it('generates flat invoice and preserves snapshot even when future config changes', () => {
      const invoice = BillingService.generateInvoice({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1100,
        billingPeriodId: 'bp-2026-11',
      });

      expect(invoice.invoiceNumber).toBe('INV-202611-A402');
      expect(invoice.totalAmountPaise).toBe(585000); // ₹5,850.00
      expect(invoice.status).toBe('GENERATED');

      // Update future configuration to different rates
      BillingService.updateBillingConfiguration({
        fixedChargePaise: 500000, // ₹5,000
        ratePerSqFtPaise: 800, // ₹8.00
      });

      // Existing historical invoice MUST remain unchanged
      const stored = BillingService.getInvoiceById(invoice.id);
      expect(stored?.totalAmountPaise).toBe(585000);
      expect(stored?.calculationSnapshot.baseFixedPaise).toBe(200000);
    });

    it('prevents duplicate invoice generation for the same flat in the same billing period', () => {
      BillingService.generateInvoice({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1100,
        billingPeriodId: 'bp-2026-11',
      });

      expect(() =>
        BillingService.generateInvoice({
          flatId: 'flat-a-402',
          flatNumber: '402',
          wing: 'A',
          areaSqFt: 1100,
          billingPeriodId: 'bp-2026-11',
        })
      ).toThrow('Invoice already exists');
    });

    it('generates bulk billing batch for active society flats', () => {
      const batch = BillingService.generateBillingBatch({
        billingPeriodId: 'bp-2026-11',
      });

      expect(batch.batchNumber).toContain('BATCH-202611');
      expect(batch.invoices.length).toBeGreaterThanOrEqual(7);
      expect(batch.totalAmountPaise).toBeGreaterThan(0);
    });
  });

  describe('4. Payments, Partial Settlement & Receipt Issuance', () => {
    it('processes partial payment, recalculates balance, and marks status PARTIALLY_PAID', () => {
      const invoice = BillingService.generateInvoice({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1000, // 200,000 + 350,000 = 550,000 paise (₹5,500)
        billingPeriodId: 'bp-2026-11',
      });

      // Pay ₹3,000 (300,000 paise)
      const res = BillingService.recordPayment({
        invoiceId: invoice.id,
        amountPaise: 300000,
        paymentMethod: 'ONLINE_GATEWAY',
        providerPaymentId: 'pay_test_001',
      });

      expect(res.payment.status).toBe('SUCCESS');
      expect(res.invoice.paidAmountPaise).toBe(300000);
      expect(res.invoice.outstandingBalancePaise).toBe(250000); // ₹2,500 remaining
      expect(res.invoice.status).toBe('PARTIALLY_PAID');
      expect(res.receipt).toBeDefined();
      expect(res.receipt?.remainingBalancePaise).toBe(250000);
    });

    it('completes full payment and issues official payment receipt', () => {
      const invoice = BillingService.generateInvoice({
        flatId: 'flat-a-201',
        flatNumber: '201',
        wing: 'A',
        areaSqFt: 1000,
        billingPeriodId: 'bp-2026-11',
      });

      // Pay full ₹5,500 (550,000 paise)
      const res = BillingService.recordPayment({
        invoiceId: invoice.id,
        amountPaise: 550000,
        paymentMethod: 'BANK_TRANSFER',
        verifiedByProfileId: 'u-committee-001',
      });

      expect(res.invoice.status).toBe('PAID');
      expect(res.invoice.outstandingBalancePaise).toBe(0);
      expect(res.receipt?.amountReceivedPaise).toBe(550000);
      expect(res.receipt?.remainingBalancePaise).toBe(0);
    });

    it('handles idempotent payment deduplication using idempotencyKey', () => {
      const invoice = BillingService.generateInvoice({
        flatId: 'flat-a-101',
        flatNumber: '101',
        wing: 'A',
        areaSqFt: 850,
        billingPeriodId: 'bp-2026-11',
      });

      const key = 'idem-unique-key-12345';

      const first = BillingService.recordPayment({
        invoiceId: invoice.id,
        amountPaise: 200000,
        paymentMethod: 'ONLINE_GATEWAY',
        idempotencyKey: key,
      });

      const duplicate = BillingService.recordPayment({
        invoiceId: invoice.id,
        amountPaise: 200000,
        paymentMethod: 'ONLINE_GATEWAY',
        idempotencyKey: key,
      });

      expect(first.payment.id).toBe(duplicate.payment.id);
      expect(invoice.paidAmountPaise).toBe(200000); // Not charged twice
    });

    it('allows resident to raise a billing clarification dispute', () => {
      const invoice = BillingService.generateInvoice({
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        areaSqFt: 1100,
        billingPeriodId: 'bp-2026-11',
      });

      const dispute = BillingService.raiseDispute({
        invoiceId: invoice.id,
        flatId: invoice.flatId,
        complainantProfileId: 'u-patel',
        complainantName: 'Jonathan Patel',
        title: 'Area calculation discrepancy',
        description: 'Super built-up area billed as 1100 sq ft instead of 1050 sq ft registered in sale deed.',
      });

      expect(dispute.disputeReference).toContain('DSP-');
      expect(dispute.status).toBe('OPEN');
    });
  });
});
