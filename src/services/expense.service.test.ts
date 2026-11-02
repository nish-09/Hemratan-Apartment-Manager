import { describe, it, expect, beforeEach } from 'vitest';
import { ExpenseService } from './expense.service';

describe('ExpenseService (Stage 6 Society Expense Management)', () => {
  beforeEach(() => {
    ExpenseService._resetForTesting();
  });

  it('records a new society expense with valid integer paise amount', () => {
    const expense = ExpenseService.recordExpense({
      title: 'Water Tanker Supply (2 Loads)',
      category: 'WATER',
      vendorName: 'Mahalaxmi Water Suppliers',
      description: 'Emergency supply during municipal pipe repair.',
      amountPaise: 400000, // ₹4,000.00
      expenseDate: '2026-11-02',
      enteredByProfileId: 'usr-comm-002',
    });

    expect(expense.expenseNumber).toContain('EXP-');
    expect(expense.amountPaise).toBe(400000);
    expect(expense.status).toBe('SUBMITTED');
  });

  it('enforces segregation of duties by blocking self-approval of expenses', () => {
    const expense = ExpenseService.recordExpense({
      title: 'Gardening Tools & Pesticides',
      category: 'GARDENING',
      vendorName: 'Green Nursery',
      description: 'Lawn trimmer maintenance and fertilizer bags.',
      amountPaise: 250000,
      expenseDate: '2026-11-02',
      enteredByProfileId: 'usr-comm-002',
    });

    // Same user attempts to approve their own expense -> MUST THROW
    expect(() =>
      ExpenseService.approveExpense({
        expenseId: expense.id,
        approverProfileId: 'usr-comm-002', // Same as enteredByProfileId
      })
    ).toThrow('Self-approval violation');
  });

  it('allows another committee member or super admin to approve and mark paid', () => {
    const expense = ExpenseService.recordExpense({
      title: 'Diesel for Backup Generator',
      category: 'ELECTRICITY',
      vendorName: 'Bharat Petroleum Outlet',
      description: '50 Litres diesel for society generator.',
      amountPaise: 480000,
      expenseDate: '2026-11-02',
      enteredByProfileId: 'usr-comm-002',
    });

    // Different user approves
    const approved = ExpenseService.approveExpense({
      expenseId: expense.id,
      approverProfileId: 'usr-admin-001',
    });

    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedByProfileId).toBe('usr-admin-001');

    // Mark paid
    const paid = ExpenseService.markExpensePaid({
      expenseId: expense.id,
      paidByProfileId: 'usr-admin-001',
    });

    expect(paid.status).toBe('PAID');
    expect(paid.paidAt).toBeDefined();
  });

  it('rejects an expense with a mandatory recorded reason', () => {
    const expense = ExpenseService.recordExpense({
      title: 'Unbudgeted Painting Touchup',
      category: 'REPAIRS',
      vendorName: 'Local Painter',
      description: 'Small corridor touchup.',
      amountPaise: 150000,
      expenseDate: '2026-11-02',
      enteredByProfileId: 'usr-comm-002',
    });

    const rejected = ExpenseService.rejectExpense({
      expenseId: expense.id,
      rejectorProfileId: 'usr-admin-001',
      reason: 'Requires prior committee meeting signoff as per society bye-laws.',
    });

    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toContain('prior committee meeting');
  });

  it('calculates aggregate expense summary and category breakdown', () => {
    const summary = ExpenseService.getExpenseSummary();
    expect(summary.totalExpensesPaise).toBeGreaterThan(0);
    expect(summary.categoryBreakdown.SECURITY).toBeDefined();
  });
});
