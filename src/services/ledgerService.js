import db from './db';

export const LEDGER_ENTRY_TYPES = {
  REVENUE: 'Revenue',
  DIRECT_EXPENSE: 'Direct Expense',
};

export function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

export function isRlsPolicyError(error) {
  return (error?.message || '').toLowerCase().includes('row-level security policy');
}

export async function recordRevenueEntry({ amount, description, orderId = null, entryDate = getTodayDateString() }) {
  await db.insert('financial_ledger', {
    entry_type: LEDGER_ENTRY_TYPES.REVENUE,
    amount,
    description,
    order_id: orderId,
    entry_date: entryDate,
  });
}

export function isPosLedgerEntry(entry) {
  const description = entry?.description || '';
  return description.includes('POS Sale') || description.includes('Quick Sell');
}

export async function loadPosSalesHistory() {
  const logs = await db.getAll('financial_ledger');
  return (logs || []).filter(isPosLedgerEntry).reverse();
}
