/**
 * HEMRATAN APARTMENT MANAGER — STAGE 6
 * Financial Accounting, Maintenance Billing & Online Payments Service
 * 
 * CORE RULES:
 * 1. ALL monetary values are stored and calculated in integer PAISE (1 INR = 100 PAISE).
 * 2. Floating-point arithmetic is strictly prohibited for monetary calculations.
 * 3. Exact calculation snapshots are preserved immutably per invoice.
 * 4. GST is strictly manual/configurable—never assumed or auto-imposed without committee rule.
 * 5. Strict flat-isolation: Residents only access bills & payments for their authorized flat(s).
 */

export type BillingModel = 'FIXED' | 'AREA_BASED' | 'HYBRID';
export type GstHandlingMode = 'NOT_APPLICABLE' | 'MANUAL' | 'AUTOMATIC';
export type InvoiceStatus = 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type PaymentMethod = 'ONLINE_GATEWAY' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CASH' | 'OTHER';
export type PaymentStatus = 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type LineItemCategory =
  | 'FIXED'
  | 'AREA_BASED'
  | 'WATER'
  | 'ELECTRICITY'
  | 'PARKING'
  | 'LIFT'
  | 'SINKING_FUND'
  | 'REPAIR_FUND'
  | 'AMENITY'
  | 'CUSTOM';

export interface BillingConfiguration {
  id: string;
  societyId?: string;
  billingModel: BillingModel;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  fixedChargePaise: number; // e.g. 200000 = ₹2,000.00
  ratePerSqFtPaise: number; // e.g. 350 = ₹3.50 / sq ft
  lateFeePercentage: number; // e.g. 2.00%
  gracePeriodDays: number; // e.g. 10
  gstHandling: GstHandlingMode;
  gstPercentage: number; // e.g. 18.00%
  isActive: boolean;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingPeriod {
  id: string;
  financialYear: string; // '2026-2027'
  month: number; // 1-12
  year: number;
  billingDate: string;
  dueDate: string;
  status: 'OPEN' | 'LOCKED' | 'CLOSED';
  notes?: string;
}

export interface LineItemInput {
  description: string;
  amountPaise: number;
  category: LineItemCategory;
  taxApplicable?: boolean;
}

export interface InvoiceCalculationInput {
  flatId: string;
  flatNumber: string;
  wing: string;
  areaSqFt: number;
  billingConfig: BillingConfiguration;
  additionalItems?: LineItemInput[];
  adjustmentsPaise?: number; // positive for debit, negative for credit
  previousOutstandingPaise?: number;
  isLate?: boolean;
  manualGstPaise?: number;
  discountCreditsPaise?: number;
}

export interface CalculationSnapshot {
  flatNumber: string;
  wing: string;
  areaSqFt: number;
  billingModel: BillingModel;
  baseFixedPaise: number;
  baseAreaPaise: number;
  additionalChargesPaise: number;
  adjustmentsPaise: number;
  lateFeePaise: number;
  subtotalPaise: number;
  gstMode: GstHandlingMode;
  gstPercentage: number;
  gstAmountPaise: number;
  discountCreditsPaise: number;
  totalAmountPaise: number;
  generatedAt: string;
  configSnapshotId: string;
  lineItems: Array<{
    description: string;
    amountPaise: number;
    category: LineItemCategory;
    taxApplicable: boolean;
  }>;
}

export interface MaintenanceInvoice {
  id: string;
  invoiceNumber: string;
  batchId?: string;
  flatId: string;
  flatNumber: string;
  wing: string;
  billingPeriodId: string;
  billingPeriodMonth: number;
  billingPeriodYear: number;
  flatAreaSqFt: number;
  baseFixedPaise: number;
  baseAreaChargePaise: number;
  additionalChargesPaise: number;
  adjustmentsPaise: number;
  lateFeePaise: number;
  gstRatePercentage: number;
  gstAmountPaise: number;
  discountCreditsPaise: number;
  totalAmountPaise: number;
  paidAmountPaise: number;
  outstandingBalancePaise: number;
  status: InvoiceStatus;
  dueDate: string;
  calculationSnapshot: CalculationSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentReferenceNo: string;
  invoiceId: string;
  flatId: string;
  payerProfileId?: string;
  amountPaise: number;
  paymentMethod: PaymentMethod;
  paymentChannel?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  status: PaymentStatus;
  transactionTimestamp: string;
  verifiedByProfileId?: string;
  verifiedAt?: string;
  idempotencyKey?: string;
  notes?: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  flatId: string;
  flatNumber: string;
  wing: string;
  amountReceivedPaise: number;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  remainingBalancePaise: number;
  paymentDate: string;
  generatedAt: string;
}

export interface BillingDispute {
  id: string;
  disputeReference: string;
  invoiceId: string;
  invoiceNumber: string;
  flatId: string;
  complainantProfileId: string;
  complainantName: string;
  title: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolutionNotes?: string;
  resolvedByProfileId?: string;
  resolvedAt?: string;
  createdAt: string;
}

// Default Locked Billing Configuration (Stage 6 default)
const DEFAULT_BILLING_CONFIG: BillingConfiguration = {
  id: 'bcfg-default-2026',
  billingModel: 'HYBRID',
  frequency: 'MONTHLY',
  fixedChargePaise: 200000, // ₹2,000.00
  ratePerSqFtPaise: 350, // ₹3.50 / sq ft (e.g. 1000 sq ft = 350,000 paise = ₹3,500.00)
  lateFeePercentage: 2.00,
  gracePeriodDays: 10,
  gstHandling: 'MANUAL',
  gstPercentage: 0.00, // GST not charged by default unless explicitly configured
  isActive: true,
  effectiveFrom: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// Seed Billing Period (November 2026)
const INITIAL_PERIODS: BillingPeriod[] = [
  {
    id: 'bp-2026-11',
    financialYear: '2026-2027',
    month: 11,
    year: 2026,
    billingDate: '2026-11-01',
    dueDate: '2026-11-15',
    status: 'OPEN',
    notes: 'Regular maintenance billing for November 2026',
  },
  {
    id: 'bp-2026-10',
    financialYear: '2026-2027',
    month: 10,
    year: 2026,
    billingDate: '2026-10-01',
    dueDate: '2026-10-15',
    status: 'LOCKED',
    notes: 'Maintenance billing for October 2026',
  },
];

// Active Society Flats for Seed Billing
export const SOCIETY_FLATS_ROSTER = [
  { id: 'flat-a-101', flatNumber: '101', wing: 'A', areaSqFt: 850, residentName: 'Suresh Mehta' },
  { id: 'flat-a-201', flatNumber: '201', wing: 'A', areaSqFt: 1050, residentName: 'Rosa Palmour' },
  { id: 'flat-a-301', flatNumber: '301', wing: 'A', areaSqFt: 920, residentName: 'Vikram Singh' },
  { id: 'flat-a-402', flatNumber: '402', wing: 'A', areaSqFt: 1100, residentName: 'Jonathan Patel' },
  { id: 'flat-b-102', flatNumber: '102', wing: 'B', areaSqFt: 850, residentName: 'Anil Gupta' },
  { id: 'flat-b-201', flatNumber: '201', wing: 'B', areaSqFt: 980, residentName: 'Meera Rao' },
  { id: 'flat-c-304', flatNumber: '304', wing: 'C', areaSqFt: 1200, residentName: 'Kavita Chawla' },
];

// In-Memory Data Store (Replaced by Postgres when connected)
let currentConfig: BillingConfiguration = { ...DEFAULT_BILLING_CONFIG };
let billingPeriodsStore: BillingPeriod[] = [...INITIAL_PERIODS];
let invoicesStore: MaintenanceInvoice[] = [];
let paymentsStore: PaymentRecord[] = [];
let receiptsStore: PaymentReceipt[] = [];
let disputesStore: BillingDispute[] = [];

export class BillingService {
  /**
   * Format Integer Paise to Indian Currency String (₹ X,XX,XXX.XX)
   */
  static formatPaiseToInr(paise: number): string {
    const isNegative = paise < 0;
    const absPaise = Math.abs(paise);
    const rupees = Math.floor(absPaise / 100);
    const remainder = absPaise % 100;
    const remainderStr = remainder.toString().padStart(2, '0');

    // Indian number grouping (e.g. 12,34,567)
    const rupeesStr = rupees.toString();
    let formattedRupees = '';
    if (rupeesStr.length <= 3) {
      formattedRupees = rupeesStr;
    } else {
      const last3 = rupeesStr.substring(rupeesStr.length - 3);
      const rest = rupeesStr.substring(0, rupeesStr.length - 3);
      const parts: string[] = [];
      let i = rest.length;
      while (i > 0) {
        const start = Math.max(0, i - 2);
        parts.unshift(rest.substring(start, i));
        i -= 2;
      }
      formattedRupees = parts.join(',') + ',' + last3;
    }

    return `${isNegative ? '-' : ''}₹${formattedRupees}.${remainderStr}`;
  }

  /**
   * Helper: Convert INR Rupees to Integer Paise
   */
  static rupeesToPaise(rupees: number): number {
    return Math.round(rupees * 100);
  }

  /**
   * Get Active Billing Configuration
   */
  static getBillingConfiguration(): BillingConfiguration {
    return { ...currentConfig };
  }

  /**
   * Update Billing Configuration
   * Future configuration changes do not rewrite existing historical bills.
   */
  static updateBillingConfiguration(newConfig: Partial<BillingConfiguration>): BillingConfiguration {
    if (newConfig.fixedChargePaise !== undefined && newConfig.fixedChargePaise < 0) {
      throw new Error('Fixed monthly charge cannot be negative.');
    }
    if (newConfig.ratePerSqFtPaise !== undefined && newConfig.ratePerSqFtPaise < 0) {
      throw new Error('Rate per sq ft cannot be negative.');
    }
    if (newConfig.lateFeePercentage !== undefined && newConfig.lateFeePercentage < 0) {
      throw new Error('Late fee percentage cannot be negative.');
    }

    currentConfig = {
      ...currentConfig,
      ...newConfig,
      updatedAt: new Date().toISOString(),
    };

    return { ...currentConfig };
  }

  /**
   * List Billing Periods
   */
  static getBillingPeriods(): BillingPeriod[] {
    return [...billingPeriodsStore];
  }

  /**
   * Create or Lock Billing Period
   */
  static createBillingPeriod(period: Omit<BillingPeriod, 'id'>): BillingPeriod {
    const existing = billingPeriodsStore.find(
      (p) => p.year === period.year && p.month === period.month
    );
    if (existing) {
      throw new Error(`Billing period for ${period.month}/${period.year} already exists.`);
    }

    const newPeriod: BillingPeriod = {
      ...period,
      id: `bp-${period.year}-${String(period.month).padStart(2, '0')}`,
    };
    billingPeriodsStore.unshift(newPeriod);
    return newPeriod;
  }

  /**
   * Smart Maintenance Bill Calculation Engine
   * Validates server-side and produces exact, deterministic itemized figures.
   */
  static calculateMaintenanceBill(input: InvoiceCalculationInput): CalculationSnapshot {
    if (input.areaSqFt <= 0) {
      throw new Error('Flat area must be a positive number of square feet.');
    }

    const config = input.billingConfig;
    const lineItems: Array<{
      description: string;
      amountPaise: number;
      category: LineItemCategory;
      taxApplicable: boolean;
    }> = [];

    // 1. Base Maintenance Calculation
    let baseFixedPaise = 0;
    let baseAreaPaise = 0;

    if (config.billingModel === 'FIXED' || config.billingModel === 'HYBRID') {
      baseFixedPaise = Math.round(config.fixedChargePaise);
      lineItems.push({
        description: 'Fixed Monthly Society Maintenance Charge',
        amountPaise: baseFixedPaise,
        category: 'FIXED',
        taxApplicable: true,
      });
    }

    if (config.billingModel === 'AREA_BASED' || config.billingModel === 'HYBRID') {
      baseAreaPaise = Math.round(input.areaSqFt * config.ratePerSqFtPaise);
      lineItems.push({
        description: `Area Based Maintenance (${input.areaSqFt} sq.ft @ ₹${(config.ratePerSqFtPaise / 100).toFixed(2)}/sq.ft)`,
        amountPaise: baseAreaPaise,
        category: 'AREA_BASED',
        taxApplicable: true,
      });
    }

    // 2. Additional Recurring / Custom Line Items
    let additionalChargesPaise = 0;
    if (input.additionalItems && input.additionalItems.length > 0) {
      for (const item of input.additionalItems) {
        if (item.amountPaise < 0) {
          throw new Error(`Charge for "${item.description}" cannot be negative.`);
        }
        const amt = Math.round(item.amountPaise);
        additionalChargesPaise += amt;
        lineItems.push({
          description: item.description,
          amountPaise: amt,
          category: item.category,
          taxApplicable: item.taxApplicable ?? false,
        });
      }
    }

    // 3. Adjustments and Late Fees
    const adjustmentsPaise = Math.round(input.adjustmentsPaise || 0);
    let lateFeePaise = 0;
    if (input.isLate) {
      const baseSub = baseFixedPaise + baseAreaPaise + additionalChargesPaise;
      lateFeePaise = Math.round(baseSub * (config.lateFeePercentage / 100));
      if (lateFeePaise > 0) {
        lineItems.push({
          description: `Late Payment Surcharge (${config.lateFeePercentage}%)`,
          amountPaise: lateFeePaise,
          category: 'CUSTOM',
          taxApplicable: false,
        });
      }
    }

    // 4. Subtotal Before Tax
    const subtotalPaise =
      baseFixedPaise +
      baseAreaPaise +
      additionalChargesPaise +
      adjustmentsPaise +
      lateFeePaise +
      (input.previousOutstandingPaise ? Math.round(input.previousOutstandingPaise) : 0);

    // 5. Explicit GST Handling
    let gstAmountPaise = 0;
    if (config.gstHandling === 'MANUAL' && config.gstPercentage > 0) {
      // Calculate GST on tax-applicable items
      const taxableSum = lineItems
        .filter((i) => i.taxApplicable)
        .reduce((sum, i) => sum + i.amountPaise, 0);
      gstAmountPaise = Math.round(taxableSum * (config.gstPercentage / 100));
    } else if (input.manualGstPaise && input.manualGstPaise > 0) {
      gstAmountPaise = Math.round(input.manualGstPaise);
    }

    // 6. Discount & Credits
    const discountCreditsPaise = Math.round(input.discountCreditsPaise || 0);

    // 7. Final Total Payable
    const totalAmountPaise = Math.max(0, subtotalPaise + gstAmountPaise - discountCreditsPaise);

    return {
      flatNumber: input.flatNumber,
      wing: input.wing,
      areaSqFt: input.areaSqFt,
      billingModel: config.billingModel,
      baseFixedPaise,
      baseAreaPaise,
      additionalChargesPaise,
      adjustmentsPaise,
      lateFeePaise,
      subtotalPaise,
      gstMode: config.gstHandling,
      gstPercentage: config.gstPercentage,
      gstAmountPaise,
      discountCreditsPaise,
      totalAmountPaise,
      generatedAt: new Date().toISOString(),
      configSnapshotId: config.id,
      lineItems,
    };
  }

  /**
   * Generate an Individual Flat Invoice (Persists Snapshot)
   */
  static generateInvoice(input: {
    flatId: string;
    flatNumber: string;
    wing: string;
    areaSqFt: number;
    billingPeriodId: string;
    batchId?: string;
    additionalItems?: LineItemInput[];
    adjustmentsPaise?: number;
    manualGstPaise?: number;
    discountCreditsPaise?: number;
    dueDate?: string;
  }): MaintenanceInvoice {
    const period = billingPeriodsStore.find((p) => p.id === input.billingPeriodId);
    if (!period) {
      throw new Error(`Billing period "${input.billingPeriodId}" not found.`);
    }

    // Check for duplicate invoice for this flat in this period
    const existing = invoicesStore.find(
      (inv) => inv.flatId === input.flatId && inv.billingPeriodId === input.billingPeriodId && inv.status !== 'CANCELLED'
    );
    if (existing) {
      throw new Error(
        `Invoice already exists for Flat ${input.wing}-${input.flatNumber} in billing period ${period.month}/${period.year} (${existing.invoiceNumber}).`
      );
    }

    const calcSnapshot = this.calculateMaintenanceBill({
      flatId: input.flatId,
      flatNumber: input.flatNumber,
      wing: input.wing,
      areaSqFt: input.areaSqFt,
      billingConfig: currentConfig,
      additionalItems: input.additionalItems,
      adjustmentsPaise: input.adjustmentsPaise,
      manualGstPaise: input.manualGstPaise,
      discountCreditsPaise: input.discountCreditsPaise,
    });

    const invoiceNumber = `INV-${period.year}${String(period.month).padStart(2, '0')}-${input.wing}${input.flatNumber}`;

    const invoice: MaintenanceInvoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber,
      batchId: input.batchId,
      flatId: input.flatId,
      flatNumber: input.flatNumber,
      wing: input.wing,
      billingPeriodId: period.id,
      billingPeriodMonth: period.month,
      billingPeriodYear: period.year,
      flatAreaSqFt: input.areaSqFt,
      baseFixedPaise: calcSnapshot.baseFixedPaise,
      baseAreaChargePaise: calcSnapshot.baseAreaPaise,
      additionalChargesPaise: calcSnapshot.additionalChargesPaise,
      adjustmentsPaise: calcSnapshot.adjustmentsPaise,
      lateFeePaise: calcSnapshot.lateFeePaise,
      gstRatePercentage: calcSnapshot.gstPercentage,
      gstAmountPaise: calcSnapshot.gstAmountPaise,
      discountCreditsPaise: calcSnapshot.discountCreditsPaise,
      totalAmountPaise: calcSnapshot.totalAmountPaise,
      paidAmountPaise: 0,
      outstandingBalancePaise: calcSnapshot.totalAmountPaise,
      status: 'GENERATED',
      dueDate: input.dueDate || period.dueDate,
      calculationSnapshot: calcSnapshot,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    invoicesStore.unshift(invoice);
    return invoice;
  }

  /**
   * Bulk Batch Generation for Society Flats
   */
  static generateBillingBatch(input: {
    billingPeriodId: string;
    generatedByProfileId?: string;
    customFlatMetrics?: Record<
      string,
      {
        additionalItems?: LineItemInput[];
        adjustmentsPaise?: number;
      }
    >;
  }): { batchNumber: string; invoices: MaintenanceInvoice[]; totalAmountPaise: number } {
    const period = billingPeriodsStore.find((p) => p.id === input.billingPeriodId);
    if (!period) {
      throw new Error(`Billing period "${input.billingPeriodId}" not found.`);
    }

    const batchNumber = `BATCH-${period.year}${String(period.month).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;
    const generatedInvoices: MaintenanceInvoice[] = [];
    let batchTotalPaise = 0;

    for (const flat of SOCIETY_FLATS_ROSTER) {
      const customMetrics = input.customFlatMetrics?.[flat.id];
      try {
        const inv = this.generateInvoice({
          flatId: flat.id,
          flatNumber: flat.flatNumber,
          wing: flat.wing,
          areaSqFt: flat.areaSqFt,
          billingPeriodId: period.id,
          batchId: batchNumber,
          additionalItems: customMetrics?.additionalItems,
          adjustmentsPaise: customMetrics?.adjustmentsPaise,
        });
        generatedInvoices.push(inv);
        batchTotalPaise += inv.totalAmountPaise;
      } catch (err: any) {
        // If duplicate, skip or log
        console.warn(`Skipping flat ${flat.flatNumber}: ${err.message}`);
      }
    }

    if (generatedInvoices.length === 0) {
      throw new Error('Billing already completed for this period. All flat invoices already exist.');
    }

    return {
      batchNumber,
      invoices: generatedInvoices,
      totalAmountPaise: batchTotalPaise,
    };
  }

  static listBillingPeriods(): BillingPeriod[] {
    return this.getBillingPeriods();
  }

  static listInvoices(filters?: {
    flatId?: string;
    status?: InvoiceStatus;
    billingPeriodId?: string;
  }): MaintenanceInvoice[] {
    return this.getInvoices(filters);
  }

  static listPayments(filters?: { flatId?: string; invoiceId?: string }): PaymentRecord[] {
    return this.getPayments(filters);
  }

  static listReceipts(filters?: { flatId?: string; invoiceId?: string }): PaymentReceipt[] {
    return this.getReceipts(filters);
  }

  static listDisputes(filters?: { invoiceId?: string; flatId?: string }): BillingDispute[] {
    return [...disputesStore].filter((d) => {
      if (filters?.invoiceId && d.invoiceId !== filters.invoiceId) return false;
      if (filters?.flatId && d.flatId !== filters.flatId) return false;
      return true;
    });
  }

  /**
   * Get Invoices (with Role-Based Flat Isolation)
   */
  static getInvoices(filters?: {
    flatId?: string;
    status?: InvoiceStatus;
    billingPeriodId?: string;
  }): MaintenanceInvoice[] {
    return invoicesStore.filter((inv) => {
      if (filters?.flatId && inv.flatId !== filters.flatId) return false;
      if (filters?.status && inv.status !== filters.status) return false;
      if (filters?.billingPeriodId && inv.billingPeriodId !== filters.billingPeriodId) return false;
      return true;
    });
  }

  /**
   * Get Single Invoice by ID or Number
   */
  static getInvoiceById(id: string): MaintenanceInvoice | undefined {
    return invoicesStore.find((inv) => inv.id === id || inv.invoiceNumber === id);
  }

  /**
   * Record a Payment (Online Gateway or Offline)
   * Transactionally updates invoice balance and generates receipt on success.
   */
  static recordPayment(input: {
    invoiceId: string;
    amountPaise: number;
    paymentMethod: PaymentMethod;
    payerProfileId?: string;
    verifiedByProfileId?: string;
    paymentChannel?: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    notes?: string;
    idempotencyKey?: string;
  }): { payment: PaymentRecord; invoice: MaintenanceInvoice; receipt?: PaymentReceipt } {
    if (input.amountPaise <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    // Idempotency check
    if (input.idempotencyKey) {
      const existingPayment = paymentsStore.find((p) => p.idempotencyKey === input.idempotencyKey);
      if (existingPayment) {
        const inv = this.getInvoiceById(existingPayment.invoiceId)!;
        const rec = receiptsStore.find((r) => r.paymentId === existingPayment.id);
        return { payment: existingPayment, invoice: inv, receipt: rec };
      }
    }

    const invoice = invoicesStore.find((inv) => inv.id === input.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice with ID "${input.invoiceId}" not found.`);
    }

    if (invoice.status === 'PAID') {
      throw new Error(`Invoice "${invoice.invoiceNumber}" is already fully settled.`);
    }

    const paymentRef = `PAY-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const now = new Date().toISOString();

    const isOffline = input.paymentMethod !== 'ONLINE_GATEWAY';
    // Online or verified offline payments are marked SUCCESS immediately
    const paymentStatus: PaymentStatus = isOffline && !input.verifiedByProfileId ? 'PENDING' : 'SUCCESS';

    const payment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      paymentReferenceNo: paymentRef,
      invoiceId: invoice.id,
      flatId: invoice.flatId,
      payerProfileId: input.payerProfileId,
      amountPaise: input.amountPaise,
      paymentMethod: input.paymentMethod,
      paymentChannel: input.paymentChannel || (isOffline ? 'OFFLINE_COUNTER' : 'ONLINE_GATEWAY'),
      providerOrderId: input.providerOrderId,
      providerPaymentId: input.providerPaymentId,
      status: paymentStatus,
      transactionTimestamp: now,
      verifiedByProfileId: input.verifiedByProfileId,
      verifiedAt: input.verifiedByProfileId ? now : undefined,
      idempotencyKey: input.idempotencyKey,
      notes: input.notes,
      createdAt: now,
    };

    paymentsStore.unshift(payment);

    let receipt: PaymentReceipt | undefined;

    // If payment is SUCCESS, update invoice balance and issue receipt
    if (paymentStatus === 'SUCCESS') {
      invoice.paidAmountPaise += input.amountPaise;
      invoice.outstandingBalancePaise = Math.max(0, invoice.totalAmountPaise - invoice.paidAmountPaise);

      if (invoice.outstandingBalancePaise === 0) {
        invoice.status = 'PAID';
      } else {
        invoice.status = 'PARTIALLY_PAID';
      }
      invoice.updatedAt = now;

      // Issue Receipt
      const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
      receipt = {
        id: `rec-${Date.now()}`,
        receiptNumber,
        paymentId: payment.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        flatId: invoice.flatId,
        flatNumber: invoice.flatNumber,
        wing: invoice.wing,
        amountReceivedPaise: input.amountPaise,
        paymentMethod: input.paymentMethod,
        transactionReference: input.providerPaymentId || paymentRef,
        remainingBalancePaise: invoice.outstandingBalancePaise,
        paymentDate: now,
        generatedAt: now,
      };

      receiptsStore.unshift(receipt);
      payment.receiptNumber = receiptNumber;
    }

    return { payment, invoice, receipt };
  }

  /**
   * Verify an Offline Payment by Committee Member
   */
  static verifyOfflinePayment(paymentId: string, verifiedByProfileId: string): PaymentRecord {
    const payment = paymentsStore.find((p) => p.id === paymentId);
    if (!payment) {
      throw new Error(`Payment "${paymentId}" not found.`);
    }

    if (payment.status === 'SUCCESS') {
      return payment;
    }

    const invoice = invoicesStore.find((inv) => inv.id === payment.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice for payment "${paymentId}" not found.`);
    }

    const now = new Date().toISOString();
    payment.status = 'SUCCESS';
    payment.verifiedByProfileId = verifiedByProfileId;
    payment.verifiedAt = now;

    // Update invoice
    invoice.paidAmountPaise += payment.amountPaise;
    invoice.outstandingBalancePaise = Math.max(0, invoice.totalAmountPaise - invoice.paidAmountPaise);
    invoice.status = invoice.outstandingBalancePaise === 0 ? 'PAID' : 'PARTIALLY_PAID';
    invoice.updatedAt = now;

    // Issue receipt
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const receipt: PaymentReceipt = {
      id: `rec-${Date.now()}`,
      receiptNumber,
      paymentId: payment.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      flatId: invoice.flatId,
      flatNumber: invoice.flatNumber,
      wing: invoice.wing,
      amountReceivedPaise: payment.amountPaise,
      paymentMethod: payment.paymentMethod,
      transactionReference: payment.paymentReferenceNo,
      remainingBalancePaise: invoice.outstandingBalancePaise,
      paymentDate: now,
      generatedAt: now,
    };
    receiptsStore.unshift(receipt);
    payment.receiptNumber = receiptNumber;

    return payment;
  }

  /**
   * Get Payment History (Filtered by Flat)
   */
  static getPayments(filters?: { flatId?: string; invoiceId?: string }): PaymentRecord[] {
    return paymentsStore.filter((p) => {
      if (filters?.flatId && p.flatId !== filters.flatId) return false;
      if (filters?.invoiceId && p.invoiceId !== filters.invoiceId) return false;
      return true;
    });
  }

  /**
   * Get Receipts (Filtered by Flat)
   */
  static getReceipts(filters?: { flatId?: string; invoiceId?: string }): PaymentReceipt[] {
    return receiptsStore.filter((r) => {
      if (filters?.flatId && r.flatId !== filters.flatId) return false;
      if (filters?.invoiceId && r.invoiceId !== filters.invoiceId) return false;
      return true;
    });
  }

  /**
   * Raise a Billing Dispute by Resident
   */
  static raiseDispute(input: {
    invoiceId: string;
    flatId: string;
    complainantProfileId: string;
    complainantName: string;
    title: string;
    description: string;
  }): BillingDispute {
    const invoice = this.getInvoiceById(input.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice "${input.invoiceId}" not found.`);
    }

    const dispute: BillingDispute = {
      id: `disp-${Date.now()}`,
      disputeReference: `DSP-${Date.now().toString().slice(-5)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      flatId: input.flatId,
      complainantProfileId: input.complainantProfileId,
      complainantName: input.complainantName,
      title: input.title,
      description: input.description,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    disputesStore.unshift(dispute);
    return dispute;
  }

  /**
   * Society Financial Summary & Aggregates
   */
  static getFinancialSummary(): {
    totalBilledPaise: number;
    totalCollectedPaise: number;
    totalOutstandingPaise: number;
    collectionRatePercentage: number;
    totalInvoicesCount: number;
    paidInvoicesCount: number;
    pendingInvoicesCount: number;
  } {
    let totalBilledPaise = 0;
    let totalCollectedPaise = 0;
    let totalOutstandingPaise = 0;
    let paidInvoicesCount = 0;
    let pendingInvoicesCount = 0;

    for (const inv of invoicesStore) {
      if (inv.status === 'CANCELLED') continue;
      totalBilledPaise += inv.totalAmountPaise;
      totalCollectedPaise += inv.paidAmountPaise;
      totalOutstandingPaise += inv.outstandingBalancePaise;

      if (inv.status === 'PAID') {
        paidInvoicesCount++;
      } else {
        pendingInvoicesCount++;
      }
    }

    const collectionRatePercentage =
      totalBilledPaise > 0 ? Number(((totalCollectedPaise / totalBilledPaise) * 100).toFixed(2)) : 0;

    return {
      totalBilledPaise,
      totalCollectedPaise,
      totalOutstandingPaise,
      collectionRatePercentage,
      totalInvoicesCount: invoicesStore.length,
      paidInvoicesCount,
      pendingInvoicesCount,
    };
  }

  /**
   * Test Reset
   */
  static _resetForTesting() {
    currentConfig = { ...DEFAULT_BILLING_CONFIG };
    billingPeriodsStore = [...INITIAL_PERIODS];
    invoicesStore = [];
    paymentsStore = [];
    receiptsStore = [];
    disputesStore = [];
  }
}
