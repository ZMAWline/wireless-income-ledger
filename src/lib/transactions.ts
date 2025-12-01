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
  const s = String(v ?? 0).trim();
  const isParenNeg = /^\(.*\)$/.test(s);
  const cleaned = s.replace(/[$,\s]/g, '').replace(/[()]/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return isParenNeg ? -Math.abs(n) : n;
};

/**
 * Parse a cycle string to an ISO date (YYYY-MM-DD). If only month/year exist, use day=01
 */
export const parseCycleToDate = (cycle?: string | null): string | null => {
  if (!cycle) return null;
  const s = String(cycle).trim();

  // MM/DD/YYYY
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // MM/YYYY
  m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-01`;
  }

  // YYYY-MM
  m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    const [, yyyy, mm] = m;
    return `${yyyy}-${String(mm).padStart(2, '0')}-01`;
  }

  // Mon YYYY or Month YYYY (e.g., Nov 2025, November 2025)
  m = s.match(/^([A-Za-z]{3,9})[\s-](\d{4})$/);
  if (m) {
    const [, mon, yyyy] = m;
    const monthNames: Record<string, number> = {
      jan: 1, january: 1,
      feb: 2, february: 2,
      mar: 3, march: 3,
      apr: 4, april: 4,
      may: 5,
      jun: 6, june: 6,
      jul: 7, july: 7,
      aug: 8, august: 8,
      sep: 9, sept: 9, september: 9,
      oct: 10, october: 10,
      nov: 11, november: 11,
      dec: 12, december: 12,
    };
    const mm = monthNames[mon.toLowerCase()];
    if (mm) return `${yyyy}-${String(mm).padStart(2, '0')}-01`;
  }

  // If all else fails, try Date.parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

/**
 * Resolve a transaction's intended date (transaction_date -> parsed cycle -> created_at)
 */
export const resolveTransactionDate = (t: { transaction_date?: string | null; created_at?: string; cycle?: string | null; }): Date => {
  const dStr = t.transaction_date || parseCycleToDate(t.cycle) || t.created_at || new Date().toISOString();
  return new Date(dStr as string);
};

/**
 * Normalize transaction types for robust detection at runtime
 * This is the single source of truth for transaction classification
 */
export const normalizeType = (t: TransactionType): 'ACT' | 'RESIDUAL' | 'DEACT' => {
  const raw = (t.activity_type || '').trim().toUpperCase();
  const note = (t.note || '').toLowerCase();
  const cycle = (t.cycle || '').toLowerCase();
  const amount = toNum(t.amount);

  // PRIORITY 1: Detect DEACT/chargebacks first (highest priority)
  if (
    /\bDEACT\b/.test(raw) ||
    raw.includes('CHARGEBACK') ||
    raw.includes('CLAWBACK') ||
    note.includes('chargeback') ||
    note.includes('clawback') ||
    note.includes('deact') ||
    amount < 0
  ) {
    return 'DEACT';
  }

  // PRIORITY 2: Detect ACT (upfronts/activations) - check note content thoroughly
  if (
    /\bACT\b/.test(raw) ||
    raw.includes('ACTIVATION') ||
    raw.includes('UPFRONT') ||
    raw.includes('UP FRONT') ||
    raw.includes('UP-FRONT') ||
    note.includes('activation') ||
    note.includes('upfront') ||
    note.includes('up front') ||
    note.includes('up-front') ||
    note.includes('component:upfront') ||
    note.includes('product type:gross adds') ||
    cycle.includes('upfront') ||
    cycle.includes('up front') ||
    cycle.includes('up-front')
  ) {
    return 'ACT';
  }

  // PRIORITY 3: Detect residuals/spifs (recurring commissions)
  if (
    /\bRESIDUAL\b/.test(raw) ||
    raw.includes('RESID') ||
    raw.includes('SPIF') ||
    raw.includes('SPIFF') ||
    note.includes('spif') ||
    note.includes('residual') ||
    note.includes('recurring') ||
    note.includes('monthly')
  ) {
    return 'RESIDUAL';
  }

  // DEFAULT: If we can't determine the type, treat as RESIDUAL
  // (most transactions without clear indicators are recurring payments)
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
