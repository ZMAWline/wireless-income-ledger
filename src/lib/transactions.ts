// Shared transaction processing helpers for consistent calculations across the app

export type TransactionType = {
  activity_type?: string;
  note?: string;
  cycle?: string;
  amount?: any;
};

export type ClassifiedTransaction = {
  amount: number;
  type: 'ACT' | 'RESIDUAL' | 'DEACT';
  isUpfront: boolean;
  isMonthly: boolean;
  isChargeback: boolean;
};

export type LineTotals = {
  upfrontTotal: number;
  monthlyTotal: number;
  chargebacks: number;
  netTotal: number;
  hasUpfront: boolean;
  hasMonthlyCommission: boolean;
  paymentStatus: 'complete' | 'partial' | 'none';
};

/**
 * Parse numeric values from strings, removing currency symbols and spaces
 */
export const toNum = (v: any): number => {
  const n = parseFloat(String(v ?? 0).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
};

/**
 * Normalize transaction types for robust detection
 */
export const normalizeType = (t: TransactionType): 'ACT' | 'RESIDUAL' | 'DEACT' => {
  const raw = (t.activity_type || '').trim().toUpperCase();
  const note = (t.note || '').toLowerCase();
  const cycle = (t.cycle || '').toLowerCase();

  // Detect DEACT/chargebacks first to avoid matching 'ACT' inside 'DEACT'
  if (
    /\bDEACT\b/.test(raw) ||
    raw.includes('CHARGEBACK') ||
    raw.includes('CLAWBACK') ||
    note.includes('chargeback') ||
    note.includes('clawback')
  ) {
    return 'DEACT';
  }

  // Detect ACT (upfronts / activations) using whole-word matching
  if (
    /\bACT\b/.test(raw) ||
    raw.includes('ACTIVATION') ||
    note.includes('activation') ||
    note.includes('upfront') ||
    note.includes('up front') ||
    cycle.includes('upfront') ||
    cycle.includes('up front')
  ) {
    return 'ACT';
  }

  // Detect residuals / spifs
  if (
    /\bRESIDUAL\b/.test(raw) ||
    raw.includes('RESID') ||
    raw.includes('SPIF') ||
    raw.includes('SPIFF') ||
    note.includes('spif') ||
    note.includes('residual')
  ) {
    return 'RESIDUAL';
  }

  // Default to RESIDUAL when unsure (most recurring payments are residuals)
  return 'RESIDUAL';
};

/**
 * Classify a transaction into upfront, monthly, or chargeback
 */
export const classifyTransaction = (t: TransactionType): ClassifiedTransaction => {
  const type = normalizeType(t);
  const amount = toNum(t.amount);

  // Negative amounts or DEACT types are chargebacks
  const isChargeback = amount < 0 || type === 'DEACT';
  
  // ACT with positive amount (not a chargeback) is upfront
  const isUpfront = type === 'ACT' && amount > 0 && !isChargeback;
  
  // RESIDUAL with positive amount (not a chargeback) is monthly commission
  const isMonthly = type === 'RESIDUAL' && amount > 0 && !isChargeback;

  return {
    amount,
    type,
    isUpfront,
    isMonthly,
    isChargeback,
  };
};

/**
 * Compute totals for a line's transactions
 */
export const computeLineTotals = (transactions: any[]): LineTotals => {
  let upfrontTotal = 0;
  let monthlyTotal = 0;
  let chargebacks = 0;
  let netTotal = 0;

  transactions.forEach((t) => {
    const classified = classifyTransaction(t);
    netTotal += classified.amount;

    if (classified.isChargeback) {
      chargebacks += classified.amount;
    } else if (classified.isUpfront) {
      upfrontTotal += classified.amount;
    } else if (classified.isMonthly) {
      monthlyTotal += classified.amount;
    }
  });

  const hasUpfront = upfrontTotal > 0;
  const hasMonthlyCommission = monthlyTotal > 0;

  let paymentStatus: 'complete' | 'partial' | 'none' = 'none';
  if (hasUpfront && hasMonthlyCommission) {
    paymentStatus = 'complete';
  } else if (hasUpfront || hasMonthlyCommission) {
    paymentStatus = 'partial';
  }

  return {
    upfrontTotal,
    monthlyTotal,
    chargebacks,
    netTotal,
    hasUpfront,
    hasMonthlyCommission,
    paymentStatus,
  };
};
