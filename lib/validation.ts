export type PrimaryGoal = 
  | 'startup_funding'
  | 'business_funding'
  | 'debt_consolidation'
  | 'improve_credit'
  | 'lower_utilization'
  | 'raise_score_fast'
  | 'not_sure';

export interface FundabilityInput {
  // Identity
  first_name: string;
  last_name: string;
  email: string;

  // Core credit/income
  credit_score: number | null;
  revolving_utilization_pct: number;
  dti_pct: number | null;
  inquiries_6m: number;
  oldest_account_years: number;
  open_tradelines: number;
  recent_derogs_24m: number;
  bk_or_major_event: boolean;

  // Funding context
  requested_amount: number;
  primary_goal: PrimaryGoal;

  // Optional property
  estimated_home_value?: number | null;
  mortgage_balance?: number | null;

  // Optional meta
  source?: string;
  external_contact_id?: string;
}

interface ValidationResult {
  valid: boolean;
  data?: FundabilityInput;
  errors?: string[];
}

export function validateInput(body: any): ValidationResult {
  const errors: string[] = [];

  // Required string fields
  if (!body.first_name || typeof body.first_name !== 'string') {
    errors.push('first_name is required and must be a string');
  }
  if (!body.last_name || typeof body.last_name !== 'string') {
    errors.push('last_name is required and must be a string');
  }
  if (!body.email || typeof body.email !== 'string' || !isValidEmail(body.email)) {
    errors.push('email is required and must be a valid email address');
  }

  // Credit score (nullable)
  if (body.credit_score !== null && body.credit_score !== undefined) {
    if (typeof body.credit_score !== 'number' || body.credit_score < 300 || body.credit_score > 850) {
      errors.push('credit_score must be between 300 and 850, or null');
    }
  }

  // Utilization (required, 0-100)
  if (typeof body.revolving_utilization_pct !== 'number' || 
      body.revolving_utilization_pct < 0 || 
      body.revolving_utilization_pct > 100) {
    errors.push('revolving_utilization_pct is required and must be between 0 and 100');
  }

  // DTI (nullable, 0-100)
  if (body.dti_pct !== null && body.dti_pct !== undefined) {
    if (typeof body.dti_pct !== 'number' || body.dti_pct < 0 || body.dti_pct > 100) {
      errors.push('dti_pct must be between 0 and 100, or null');
    }
  }

  // Inquiries (default 0)
  const inquiries_6m = body.inquiries_6m ?? 0;
  if (typeof inquiries_6m !== 'number' || inquiries_6m < 0 || !Number.isInteger(inquiries_6m)) {
    errors.push('inquiries_6m must be a non-negative integer');
  }

  // Oldest account years (default 0)
  const oldest_account_years = body.oldest_account_years ?? 0;
  if (typeof oldest_account_years !== 'number' || oldest_account_years < 0) {
    errors.push('oldest_account_years must be a non-negative number');
  }

  // Open tradelines (required)
  if (typeof body.open_tradelines !== 'number' || 
      body.open_tradelines < 0 || 
      !Number.isInteger(body.open_tradelines)) {
    errors.push('open_tradelines is required and must be a non-negative integer');
  }

  // Recent derogs (default 0)
  const recent_derogs_24m = body.recent_derogs_24m ?? 0;
  if (typeof recent_derogs_24m !== 'number' || 
      recent_derogs_24m < 0 || 
      !Number.isInteger(recent_derogs_24m)) {
    errors.push('recent_derogs_24m must be a non-negative integer');
  }

  // BK/major event (default false)
  const bk_or_major_event = body.bk_or_major_event ?? false;
  if (typeof bk_or_major_event !== 'boolean') {
    errors.push('bk_or_major_event must be a boolean');
  }

  // Requested amount (required)
  if (typeof body.requested_amount !== 'number' || body.requested_amount <= 0) {
    errors.push('requested_amount is required and must be a positive number');
  }

  // Primary goal (required, enum)
  const validGoals: PrimaryGoal[] = [
    'startup_funding',
    'business_funding',
    'debt_consolidation',
    'improve_credit',
    'lower_utilization',
    'raise_score_fast',
    'not_sure'
  ];
  if (!body.primary_goal || !validGoals.includes(body.primary_goal)) {
    errors.push(`primary_goal is required and must be one of: ${validGoals.join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Build validated object with defaults applied
  const validated: FundabilityInput = {
    first_name: body.first_name,
    last_name: body.last_name,
    email: body.email,
    credit_score: body.credit_score ?? null,
    revolving_utilization_pct: body.revolving_utilization_pct,
    dti_pct: body.dti_pct ?? null,
    inquiries_6m: inquiries_6m,
    oldest_account_years: oldest_account_years,
    open_tradelines: body.open_tradelines,
    recent_derogs_24m: recent_derogs_24m,
    bk_or_major_event: bk_or_major_event,
    requested_amount: body.requested_amount,
    primary_goal: body.primary_goal,
    estimated_home_value: body.estimated_home_value ?? null,
    mortgage_balance: body.mortgage_balance ?? null,
    source: body.source,
    external_contact_id: body.external_contact_id
  };

  return { valid: true, data: validated };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
