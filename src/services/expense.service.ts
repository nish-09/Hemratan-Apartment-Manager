/**
 * HEMRATAN APARTMENT MANAGER — STAGE 6
 * Society Expense Management & Approval Workflow Service
 * 
 * Rules:
 * - All expense amounts stored in integer PAISE.
 * - Strict segregation of duties: Self-approval is strictly prevented by default.
 * - Multi-stage lifecycle: DRAFT -> SUBMITTED -> APPROVED / REJECTED -> PAID.
 */

export type ExpenseCategory =
  | 'SECURITY'
  | 'HOUSEKEEPING'
  | 'ELECTRICITY'
  | 'WATER'
  | 'LIFT_MAINTENANCE'
  | 'REPAIRS'
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'GARDENING'
  | 'STAFF_SALARIES'
  | 'INSURANCE'
  | 'ADMINISTRATIVE'
  | 'EVENTS'
  | 'OTHER';

export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface SocietyExpense {
  id: string;
  expenseNumber: string;
  title: string;
  category: ExpenseCategory;
  vendorName: string;
  description: string;
  amountPaise: number;
  expenseDate: string;
  invoiceReference?: string;
  paymentMethod: string;
  status: ExpenseStatus;
  enteredByProfileId: string;
  enteredByName?: string;
  approvedByProfileId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
  attachmentPath?: string;
  createdAt: string;
  updatedAt: string;
}

// Seed society expenses
const INITIAL_EXPENSES: SocietyExpense[] = [
  {
    id: 'exp-001',
    expenseNumber: 'EXP-202611-001',
    title: 'Security Agency Monthly Contract (October)',
    category: 'SECURITY',
    vendorName: 'Apex Shield Facility Security Pvt Ltd',
    description: '4 guards round-the-clock shift staffing for Gate 1 and Gate 2.',
    amountPaise: 9200000, // ₹92,000.00
    expenseDate: '2026-11-01',
    invoiceReference: 'APX-INV-9941',
    paymentMethod: 'BANK_TRANSFER',
    status: 'APPROVED',
    enteredByProfileId: 'usr-comm-002',
    approvedByProfileId: 'usr-admin-001',
    approvedAt: '2026-11-01T10:00:00.000Z',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'exp-002',
    expenseNumber: 'EXP-202611-002',
    title: 'Lift Comprehensive AMC & Safety Audit',
    category: 'LIFT_MAINTENANCE',
    vendorName: 'Schindler Elevators India Ltd',
    description: 'Quarterly sensor alignment, motor servicing, and emergency alarm testing.',
    amountPaise: 3500000, // ₹35,000.00
    expenseDate: '2026-11-02',
    invoiceReference: 'SCH-8831',
    paymentMethod: 'CHEQUE',
    status: 'SUBMITTED',
    enteredByProfileId: 'usr-comm-002',
    createdAt: '2026-11-02T09:00:00.000Z',
    updatedAt: '2026-11-02T09:00:00.000Z',
  },
  {
    id: 'exp-003',
    expenseNumber: 'EXP-202611-003',
    title: 'Common Area LED Floodlights & Wiring Kit',
    category: 'ELECTRICAL',
    vendorName: 'Dilip Electrical Supplies',
    description: 'Replacement of 6 blown perimeter floodlights around Wing B driveway.',
    amountPaise: 850000, // ₹8,500.00
    expenseDate: '2026-11-02',
    invoiceReference: 'DEL-4412',
    paymentMethod: 'UPI',
    status: 'PAID',
    enteredByProfileId: 'usr-comm-002',
    approvedByProfileId: 'usr-admin-001',
    approvedAt: '2026-11-02T11:00:00.000Z',
    paidAt: '2026-11-02T11:30:00.000Z',
    createdAt: '2026-11-02T10:00:00.000Z',
    updatedAt: '2026-11-02T11:30:00.000Z',
  },
];

let expensesStore: SocietyExpense[] = [...INITIAL_EXPENSES];

export class ExpenseService {
  /**
   * Record a New Society Expense
   */
  static recordExpense(input: {
    title: string;
    category: ExpenseCategory;
    vendorName: string;
    description: string;
    amountPaise: number;
    expenseDate: string;
    invoiceReference?: string;
    paymentMethod?: string;
    enteredByProfileId: string;
    attachmentPath?: string;
  }): SocietyExpense {
    if (!input.title || input.title.trim().length < 3) {
      throw new Error('Expense title must be at least 3 characters.');
    }
    if (input.amountPaise <= 0) {
      throw new Error('Expense amount must be greater than zero paise.');
    }
    if (!input.vendorName || input.vendorName.trim().length < 2) {
      throw new Error('Vendor name is required.');
    }

    const now = new Date().toISOString();
    const expenseNumber = `EXP-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const expense: SocietyExpense = {
      id: `exp-${Date.now()}`,
      expenseNumber,
      title: input.title.trim(),
      category: input.category,
      vendorName: input.vendorName.trim(),
      description: input.description.trim(),
      amountPaise: Math.round(input.amountPaise),
      expenseDate: input.expenseDate,
      invoiceReference: input.invoiceReference,
      paymentMethod: input.paymentMethod || 'BANK_TRANSFER',
      status: 'SUBMITTED',
      enteredByProfileId: input.enteredByProfileId,
      attachmentPath: input.attachmentPath,
      createdAt: now,
      updatedAt: now,
    };

    expensesStore.unshift(expense);
    return expense;
  }

  /**
   * Approve an Expense (Enforcing Segregation of Duties)
   */
  static approveExpense(input: {
    expenseId: string;
    approverProfileId: string;
    comments?: string;
  }): SocietyExpense {
    const expense = expensesStore.find((e) => e.id === input.expenseId);
    if (!expense) {
      throw new Error(`Expense "${input.expenseId}" not found.`);
    }

    if (expense.status === 'APPROVED' || expense.status === 'PAID') {
      return expense;
    }

    // Segregation of duties: Self-approval is strictly forbidden
    if (expense.enteredByProfileId === input.approverProfileId) {
      throw new Error('Self-approval violation: An expense cannot be approved by the same committee member who entered it.');
    }

    const now = new Date().toISOString();
    expense.status = 'APPROVED';
    expense.approvedByProfileId = input.approverProfileId;
    expense.approvedAt = now;
    expense.updatedAt = now;

    return expense;
  }

  /**
   * Reject an Expense
   */
  static rejectExpense(input: {
    expenseId: string;
    rejectorProfileId: string;
    reason: string;
  }): SocietyExpense {
    const expense = expensesStore.find((e) => e.id === input.expenseId);
    if (!expense) {
      throw new Error(`Expense "${input.expenseId}" not found.`);
    }

    if (!input.reason || input.reason.trim().length < 5) {
      throw new Error('A detailed reason is mandatory for rejecting an expense.');
    }

    const now = new Date().toISOString();
    expense.status = 'REJECTED';
    expense.approvedByProfileId = input.rejectorProfileId;
    expense.rejectionReason = input.reason.trim();
    expense.updatedAt = now;

    return expense;
  }

  /**
   * Mark Approved Expense as Paid
   */
  static markExpensePaid(input: {
    expenseId: string;
    paidByProfileId: string;
  }): SocietyExpense {
    const expense = expensesStore.find((e) => e.id === input.expenseId);
    if (!expense) {
      throw new Error(`Expense "${input.expenseId}" not found.`);
    }

    if (expense.status !== 'APPROVED') {
      throw new Error(`Cannot pay expense with status "${expense.status}". Expense must be APPROVED first.`);
    }

    const now = new Date().toISOString();
    expense.status = 'PAID';
    expense.paidAt = now;
    expense.updatedAt = now;

    return expense;
  }

  /**
   * Get Single Expense by ID
   */
  static getExpenseById(id: string): SocietyExpense | undefined {
    return expensesStore.find((e) => e.id === id || e.expenseNumber === id);
  }

  /**
   * Update an Eligible Expense (Only DRAFT or SUBMITTED status can be edited)
   */
  static updateExpense(input: {
    expenseId: string;
    title?: string;
    category?: ExpenseCategory;
    vendorName?: string;
    description?: string;
    amountPaise?: number;
    expenseDate?: string;
    invoiceReference?: string;
    paymentMethod?: string;
    attachmentPath?: string;
    updatedByProfileId: string;
  }): SocietyExpense {
    const expense = expensesStore.find((e) => e.id === input.expenseId);
    if (!expense) {
      throw new Error(`Expense "${input.expenseId}" not found.`);
    }

    if (expense.status === 'APPROVED' || expense.status === 'PAID') {
      throw new Error(`Cannot edit expense with status "${expense.status}". Only DRAFT or SUBMITTED expenses can be modified.`);
    }

    if (input.title !== undefined) {
      if (input.title.trim().length < 3) throw new Error('Expense title must be at least 3 characters.');
      expense.title = input.title.trim();
    }
    if (input.vendorName !== undefined) {
      if (input.vendorName.trim().length < 2) throw new Error('Vendor name is required.');
      expense.vendorName = input.vendorName.trim();
    }
    if (input.description !== undefined) {
      expense.description = input.description.trim();
    }
    if (input.amountPaise !== undefined) {
      if (input.amountPaise <= 0) throw new Error('Expense amount must be greater than zero paise.');
      expense.amountPaise = Math.round(input.amountPaise);
    }
    if (input.category !== undefined) {
      expense.category = input.category;
    }
    if (input.expenseDate !== undefined) {
      expense.expenseDate = input.expenseDate;
    }
    if (input.invoiceReference !== undefined) {
      expense.invoiceReference = input.invoiceReference;
    }
    if (input.paymentMethod !== undefined) {
      expense.paymentMethod = input.paymentMethod;
    }
    if (input.attachmentPath !== undefined) {
      expense.attachmentPath = input.attachmentPath;
    }

    expense.updatedAt = new Date().toISOString();
    return expense;
  }

  /**
   * List Expenses with Filters
   */
  static listExpenses(filters?: {
    category?: ExpenseCategory;
    status?: ExpenseStatus;
    search?: string;
  }): SocietyExpense[] {
    return expensesStore.filter((e) => {
      if (filters?.category && e.category !== filters.category) return false;
      if (filters?.status && e.status !== filters.status) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.vendorName.toLowerCase().includes(q) ||
          e.expenseNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  /**
   * Get Expense Summary and Category Breakdown
   */
  static getExpenseSummary(): {
    totalExpensesPaise: number;
    pendingApprovalPaise: number;
    approvedPaise: number;
    paidPaise: number;
    categoryBreakdown: Record<ExpenseCategory, number>;
  } {
    let totalExpensesPaise = 0;
    let pendingApprovalPaise = 0;
    let approvedPaise = 0;
    let paidPaise = 0;

    const categoryBreakdown: Partial<Record<ExpenseCategory, number>> = {};

    for (const exp of expensesStore) {
      if (exp.status === 'REJECTED') continue;
      totalExpensesPaise += exp.amountPaise;

      if (exp.status === 'SUBMITTED' || exp.status === 'DRAFT') {
        pendingApprovalPaise += exp.amountPaise;
      } else if (exp.status === 'APPROVED') {
        approvedPaise += exp.amountPaise;
      } else if (exp.status === 'PAID') {
        paidPaise += exp.amountPaise;
      }

      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amountPaise;
    }

    return {
      totalExpensesPaise,
      pendingApprovalPaise,
      approvedPaise,
      paidPaise,
      categoryBreakdown: categoryBreakdown as Record<ExpenseCategory, number>,
    };
  }

  /**
   * Reset for Test Suite
   */
  static _resetForTesting() {
    expensesStore = [...INITIAL_EXPENSES];
  }
}
