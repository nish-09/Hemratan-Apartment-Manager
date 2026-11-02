'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  Receipt,
  Plus,
  CheckCircle2,
  XCircle,
  CreditCard,
  Search,
  Filter,
  AlertTriangle,
  Building2,
  Clock,
  Check,
  X,
  RefreshCw,
  FileText,
  DollarSign,
} from 'lucide-react';

interface ExpenseItem {
  id: string;
  expenseNumber: string;
  title: string;
  category: string;
  vendorName: string;
  description: string;
  amountPaise: number;
  expenseDate: string;
  invoiceReference?: string;
  paymentMethod: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  enteredByProfileId: string;
  enteredByName?: string;
  approvedByProfileId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  paidAt?: string;
}

export default function ExpensesManagementPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('REPAIRS');
  const [formVendor, setFormVendor] = useState('');
  const [formAmountRupees, setFormAmountRupees] = useState<number>(0);
  const [formDate, setFormDate] = useState('2026-11-05');
  const [formDesc, setFormDesc] = useState('');
  const [formRef, setFormRef] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('BANK_TRANSFER');
  const [submitting, setSubmitting] = useState(false);

  // Feedback alerts
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory, selectedStatus, searchQuery]);

  async function fetchExpenses() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatInr(paise: number = 0): string {
    const rupees = (paise / 100).toFixed(2);
    const [intPart, decPart] = rupees.split('.');
    const lastThree = intPart.slice(-3);
    const otherNumbers = intPart.slice(0, -3);
    const formatted = otherNumbers !== '' ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;
    return `₹${formatted}.${decPart}`;
  }

  async function handleCreateExpense(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          category: formCategory,
          vendorName: formVendor,
          amountPaise: Math.round(formAmountRupees * 100),
          expenseDate: formDate,
          description: formDesc,
          invoiceReference: formRef || undefined,
          paymentMethod: formPaymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record expense');
      }

      setFeedback({ text: `Expense ${data.expense.expenseNumber} submitted for approval.`, type: 'success' });
      setAddModalOpen(false);
      setFormTitle('');
      setFormVendor('');
      setFormAmountRupees(0);
      setFormDesc('');
      fetchExpenses();
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(id: string) {
    setFeedback(null);
    try {
      const res = await fetch(`/api/expenses/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: 'Verified and approved by committee.' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve expense');
      }
      setFeedback({ text: 'Expense approved successfully.', type: 'success' });
      fetchExpenses();
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Please enter reason for rejection:');
    if (!reason) return;
    setFeedback(null);

    try {
      const res = await fetch(`/api/expenses/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject expense');
      }
      setFeedback({ text: 'Expense rejected.', type: 'success' });
      fetchExpenses();
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    }
  }

  async function handleMarkPaid(id: string) {
    const ref = prompt('Enter payment transaction/cheque reference:');
    if (!ref) return;
    setFeedback(null);

    try {
      const res = await fetch(`/api/expenses/${id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'BANK_TRANSFER', paymentReference: ref }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark as paid');
      }
      setFeedback({ text: 'Expense marked as paid.', type: 'success' });
      fetchExpenses();
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'error' });
    }
  }

  return (
    <AppShell activeRole="COMMITTEE" userName="Rosa Palmour" userRoleTitle="Managing Committee (Treasurer)">
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7A7] border border-[#20243A] text-xs font-bold text-[#20243A] mb-2">
              <Receipt className="w-3.5 h-3.5" /> Society Outflow & Vendor Ledger
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#20243A]">
              Society Expense Management
            </h1>
            <p className="text-sm text-[#77798A] mt-1">
              Record society operating expenditures, enforce segregation-of-duty approvals, and track disbursements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C9F36B] hover:bg-[#b5e356] border-2 border-[#20243A] font-black text-sm text-[#20243A] shadow-[3px_3px_0px_#20243A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Record New Expense
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border-2 border-[#20243A] font-bold text-sm flex items-center justify-between shadow-[3px_3px_0px_#20243A] ${
              feedback.type === 'success' ? 'bg-[#C9F2DE] text-[#20243A]' : 'bg-rose-100 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-700" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border-2 border-[#20243A] bg-white shadow-[3px_3px_0px_#20243A]">
            <div className="text-xs font-black uppercase text-[#77798A]">Total Expenses Logged</div>
            <div className="text-2xl font-black text-[#20243A] mt-1">
              {formatInr(summary?.totalExpensesPaise || 0)}
            </div>
          </div>

          <div className="p-5 rounded-2xl border-2 border-[#20243A] bg-[#FAF7A7] shadow-[3px_3px_0px_#20243A]">
            <div className="text-xs font-black uppercase text-[#20243A]/70">Pending Approval</div>
            <div className="text-2xl font-black text-[#20243A] mt-1">
              {formatInr(summary?.pendingApprovalPaise || 0)}
            </div>
          </div>

          <div className="p-5 rounded-2xl border-2 border-[#20243A] bg-[#C9F2DE] shadow-[3px_3px_0px_#20243A]">
            <div className="text-xs font-black uppercase text-[#20243A]/70">Approved (Pending Payout)</div>
            <div className="text-2xl font-black text-[#20243A] mt-1">
              {formatInr(summary?.approvedPaise || 0)}
            </div>
          </div>

          <div className="p-5 rounded-2xl border-2 border-[#20243A] bg-[#C9F36B] shadow-[3px_3px_0px_#20243A]">
            <div className="text-xs font-black uppercase text-[#20243A]/70">Settled & Paid</div>
            <div className="text-2xl font-black text-[#20243A] mt-1">
              {formatInr(summary?.paidPaise || 0)}
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row items-center gap-3 p-4 bg-white border-2 border-[#20243A] rounded-2xl shadow-[3px_3px_0px_#20243A]">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#77798A]" />
            <input
              type="text"
              placeholder="Search by expense title, vendor name, or voucher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#20243A] rounded-xl text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-[#20243A] rounded-xl text-xs font-bold bg-[#EAE5FA]/50 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="SECURITY">Security</option>
              <option value="HOUSEKEEPING">Housekeeping</option>
              <option value="ELECTRICITY">Electricity</option>
              <option value="WATER">Water</option>
              <option value="LIFT_MAINTENANCE">Lift Maintenance</option>
              <option value="REPAIRS">Repairs & Civil</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="STAFF_SALARIES">Staff Salaries</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-[#20243A] rounded-xl text-xs font-bold bg-[#EAE5FA]/50 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <button
              onClick={fetchExpenses}
              title="Refresh"
              className="p-2 border-2 border-[#20243A] rounded-xl bg-white hover:bg-[#FAF7A7]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="border-2 border-[#20243A] rounded-2xl bg-white shadow-[4px_4px_0px_#20243A] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-[#20243A] bg-neutral-50 text-xs font-black text-[#20243A]">
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Title / Payee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions / Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {expenses.length > 0 ? (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#EAE5FA]/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-xs text-[#20243A]">
                        {exp.expenseNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-[#20243A] text-sm">{exp.title}</div>
                        <div className="text-xs text-[#77798A] font-medium">Vendor: {exp.vendorName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FAF7A7] border border-[#20243A]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-bold text-[#77798A]">{exp.expenseDate}</td>
                      <td className="py-3 px-4 text-right font-black text-[#20243A] text-sm">
                        {formatInr(exp.amountPaise)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border border-[#20243A] ${
                            exp.status === 'PAID'
                              ? 'bg-[#C9F36B] text-[#20243A]'
                              : exp.status === 'APPROVED'
                              ? 'bg-[#C9F2DE] text-[#20243A]'
                              : exp.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-[#FAF7A7] text-[#20243A]'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {(exp.status === 'SUBMITTED' || exp.status === 'DRAFT') && (
                            <>
                              <button
                                onClick={() => handleApprove(exp.id)}
                                title="Approve expense (Segregation of duties enforced)"
                                className="px-2.5 py-1 rounded-lg bg-[#C9F2DE] hover:bg-[#b0ebd0] border border-[#20243A] font-black text-xs text-[#20243A]"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(exp.id)}
                                title="Reject expense"
                                className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 border border-[#20243A] font-black text-xs text-rose-800"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {exp.status === 'APPROVED' && (
                            <button
                              onClick={() => handleMarkPaid(exp.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#C9F36B] hover:bg-[#b5e356] border border-[#20243A] font-black text-xs text-[#20243A]"
                            >
                              Mark Paid
                            </button>
                          )}
                          {exp.status === 'PAID' && (
                            <span className="text-xs font-bold text-emerald-700">✓ Settled</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#77798A] text-sm font-bold">
                      No society expenses match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RECORD NEW EXPENSE MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-3 border-[#20243A] rounded-2xl w-full max-w-lg p-6 shadow-[6px_6px_0px_#20243A] relative">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-[#20243A] bg-white hover:bg-neutral-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#C9F36B] border-2 border-[#20243A] flex items-center justify-center font-black">
                <Receipt className="w-5 h-5 text-[#20243A]" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#20243A]">Record Society Expense</h3>
                <p className="text-xs text-[#77798A]">Requires independent committee member approval</p>
              </div>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                  Expense Title / Purpose
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Overhead Tank Cleaning & Sanitization"
                  className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-xs font-bold bg-[#EAE5FA]/50 focus:outline-none"
                  >
                    <option value="SECURITY">Security</option>
                    <option value="HOUSEKEEPING">Housekeeping</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="WATER">Water</option>
                    <option value="LIFT_MAINTENANCE">Lift Maintenance</option>
                    <option value="REPAIRS">Repairs & Civil</option>
                    <option value="PLUMBING">Plumbing</option>
                    <option value="STAFF_SALARIES">Staff Salaries</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Vendor / Payee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    placeholder="e.g. Apex Cleaners Ltd"
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    required
                    value={formAmountRupees || ''}
                    onChange={(e) => setFormAmountRupees(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Expense Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                  Description / Quotation Notes
                </label>
                <textarea
                  rows={2}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Details of services delivered and committee resolution..."
                  className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <div className="p-3 bg-[#FAF7A7]/50 rounded-xl border border-[#20243A] text-[11px] text-[#20243A] font-bold">
                ⚠️ Segregation of Duties: As the creator of this voucher, you cannot self-approve it. Another authorized committee officer must verify and approve this voucher.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#C9F36B] hover:bg-[#b5e356] border-2 border-[#20243A] font-black text-sm text-[#20243A] shadow-[3px_3px_0px_#20243A] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Voucher for Committee Approval'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
