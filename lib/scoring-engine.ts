import { FundabilityInput, PrimaryGoal } from './validation';

export interface FundabilitySnapshot {
  fundability_score: number;
  fundability_tier_numeric: number;
  fundability_tier_label: string;
  subscores: {
    credit_score_subscore: number;
    utilization_subscore: number;
    dti_subscore: number;
    inquiry_subscore: number;
    depth_mix_subscore: number;
    penalty_points: number;
  };
  key_strengths: string[];
  key_risks: string[];
  high_impact_actions: string[];
  funding_range_now: string;
  funding_range_after_optimization: string;
  goal_path: string;
  flags: {
    missing_credit_score: boolean;
    missing_utilization: boolean;
    missing_dti: boolean;
    high_risk_profile: boolean;
  };
  meta: {
    version: string;
    generated_at: string;
  };
}

export function calculateFundabilitySnapshot(input: FundabilityInput): FundabilitySnapshot {
  // Calculate all subscores
  const creditScoreSubscore = calculateCreditScoreSubscore(input.credit_score);
  const utilizationSubscore = calculateUtilizationSubscore(input.revolving_utilization_pct);
  const dtiSubscore = calculateDTISubscore(input.dti_pct);
  const inquirySubscore = calculateInquirySubscore(input.inquiries_6m);
  const depthMixSubscore = calculateDepthMixSubscore(
    input.oldest_account_years,
    input.open_tradelines
  );
  const penaltyPoints = calculatePenaltyPoints(
    input.bk_or_major_event,
    input.recent_derogs_24m
  );

  // Calculate weighted fundability score
  const fundabilityScore = calculateWeightedScore({
    creditScoreSubscore,
    utilizationSubscore,
    dtiSubscore,
    inquirySubscore,
    depthMixSubscore,
    penaltyPoints
  });

  // Determine tier
  const tier = determineTier(fundabilityScore);

  // Generate insights
  const strengths = generateStrengths({
    creditScoreSubscore,
    utilizationSubscore,
    dtiSubscore,
    depthMixSubscore
  });

  const risks = generateRisks({
    utilizationSubscore,
    dtiSubscore,
    inquirySubscore,
    penaltyPoints
  });

  const actions = generateHighImpactActions(input, {
    creditScoreSubscore,
    utilizationSubscore,
    dtiSubscore,
    inquirySubscore,
    depthMixSubscore,
    penaltyPoints
  });

  // Funding ranges
  const fundingRangeNow = calculateFundingRange(tier.numeric);
  const fundingRangeOptimized = calculateOptimizedFundingRange(
    tier.numeric,
    utilizationSubscore,
    dtiSubscore,
    inquirySubscore
  );

  // Goal path
  const goalPath = generateGoalPath(input.primary_goal, tier.numeric);

  // Flags
  const flags = {
    missing_credit_score: input.credit_score === null,
    missing_utilization: false, // Required field
    missing_dti: input.dti_pct === null,
    high_risk_profile: tier.numeric === 4 || penaltyPoints <= -20
  };

  return {
    fundability_score: fundabilityScore,
    fundability_tier_numeric: tier.numeric,
    fundability_tier_label: tier.label,
    subscores: {
      credit_score_subscore: creditScoreSubscore,
      utilization_subscore: utilizationSubscore,
      dti_subscore: dtiSubscore,
      inquiry_subscore: inquirySubscore,
      depth_mix_subscore: depthMixSubscore,
      penalty_points: penaltyPoints
    },
    key_strengths: strengths,
    key_risks: risks,
    high_impact_actions: actions,
    funding_range_now: fundingRangeNow,
    funding_range_after_optimization: fundingRangeOptimized,
    goal_path: goalPath,
    flags,
    meta: {
      version: 'fs_engine_v1.0',
      generated_at: new Date().toISOString()
    }
  };
}

// Subscore calculations
function calculateCreditScoreSubscore(score: number | null): number {
  if (score === null) return 40;
  if (score >= 750) return 95;
  if (score >= 720) return 90;
  if (score >= 680) return 80;
  if (score >= 640) return 65;
  if (score >= 600) return 45;
  if (score >= 550) return 30;
  return 15;
}

function calculateUtilizationSubscore(utilization: number): number {
  if (utilization < 10) return 95;
  if (utilization < 30) return 90;
  if (utilization < 50) return 75;
  if (utilization < 75) return 50;
  if (utilization < 90) return 30;
  return 15;
}

function calculateDTISubscore(dti: number | null): number {
  if (dti === null) return 55;
  if (dti < 25) return 95;
  if (dti < 35) return 85;
  if (dti < 45) return 70;
  if (dti < 55) return 45;
  return 25;
}

function calculateInquirySubscore(inquiries: number): number {
  if (inquiries <= 1) return 95;
  if (inquiries <= 3) return 80;
  if (inquiries <= 5) return 60;
  if (inquiries <= 8) return 35;
  return 20;
}

function calculateDepthMixSubscore(oldestYears: number, tradelines: number): number {
  if (oldestYears >= 10 && tradelines >= 6) return 95;
  if (oldestYears >= 7 && tradelines >= 4) return 85;
  if (oldestYears >= 3 && tradelines >= 3) return 70;
  return 45;
}

function calculatePenaltyPoints(bkOrMajorEvent: boolean, recentDerogs: number): number {
  let penalty = 0;
  
  if (bkOrMajorEvent) {
    penalty -= 25; // Assuming within last 2 years for simplicity
  }
  
  if (recentDerogs >= 3) {
    penalty -= 20;
  } else if (recentDerogs >= 1) {
    penalty -= 10;
  }
  
  // Cap at -35
  return Math.max(penalty, -35);
}

// Weighted score calculation
interface Subscores {
  creditScoreSubscore: number;
  utilizationSubscore: number;
  dtiSubscore: number;
  inquirySubscore: number;
  depthMixSubscore: number;
  penaltyPoints: number;
}

function calculateWeightedScore(subscores: Subscores): number {
  const weights = {
    credit: 0.30,
    utilization: 0.25,
    dti: 0.20,
    inquiry: 0.10,
    depthMix: 0.10,
    penalty: 0.05
  };

  const weightedSum = 
    subscores.creditScoreSubscore * weights.credit +
    subscores.utilizationSubscore * weights.utilization +
    subscores.dtiSubscore * weights.dti +
    subscores.inquirySubscore * weights.inquiry +
    subscores.depthMixSubscore * weights.depthMix;

  // Apply penalty (penalty is already negative)
  const rawScore = weightedSum + subscores.penaltyPoints;

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

// Tier determination
function determineTier(score: number): { numeric: number; label: string } {
  if (score >= 85) return { numeric: 1, label: 'Tier 1 – Ready Now (Prime)' };
  if (score >= 70) return { numeric: 2, label: 'Tier 2 – Tune-Up Then Ready' };
  if (score >= 55) return { numeric: 3, label: 'Tier 3 – Optimization Required' };
  return { numeric: 4, label: 'Tier 4 – Rehab / Long-Term Plan' };
}

// Generate strengths
function generateStrengths(subscores: {
  creditScoreSubscore: number;
  utilizationSubscore: number;
  dtiSubscore: number;
  depthMixSubscore: number;
}): string[] {
  const strengths: string[] = [];

  if (subscores.creditScoreSubscore >= 80) {
    strengths.push('Strong core credit score positioning you favorably with lenders');
  }
  if (subscores.utilizationSubscore >= 80) {
    strengths.push('Low revolving utilization demonstrating strong credit management');
  }
  if (subscores.dtiSubscore >= 80) {
    strengths.push('Healthy debt-to-income profile showing strong repayment capacity');
  }
  if (subscores.depthMixSubscore >= 80) {
    strengths.push('Established credit history with good depth and account mix');
  }

  // If no clear strengths, provide at least one positive note
  if (strengths.length === 0) {
    strengths.push('Active credit profile with opportunity for strategic optimization');
  }

  return strengths.slice(0, 3);
}

// Generate risks
function generateRisks(subscores: {
  utilizationSubscore: number;
  dtiSubscore: number;
  inquirySubscore: number;
  penaltyPoints: number;
}): string[] {
  const risks: string[] = [];

  if (subscores.utilizationSubscore <= 50) {
    risks.push('High utilization is suppressing score and limiting available credit');
  }
  if (subscores.dtiSubscore <= 45) {
    risks.push('Elevated DTI ratio is constraining approval odds and loan amounts');
  }
  if (subscores.inquirySubscore <= 60) {
    risks.push('Recent inquiry activity is raising risk flags with underwriters');
  }
  if (subscores.penaltyPoints < 0) {
    risks.push('Recent derogatory events are significantly impacting approval probability');
  }

  // If no clear risks identified
  if (risks.length === 0) {
    risks.push('Profile requires fine-tuning to maximize funding potential');
  }

  return risks.slice(0, 3);
}

// Generate high-impact actions
function generateHighImpactActions(
  input: FundabilityInput,
  subscores: Subscores
): string[] {
  interface ActionItem {
    priority: number;
    action: string;
  }

  const actions: ActionItem[] = [];

  // High utilization
  if (subscores.utilizationSubscore <= 75) {
    const priority = subscores.utilizationSubscore <= 50 ? 100 : 80;
    actions.push({
      priority,
      action: `Pay down revolving balances to reduce utilization below 30% - current ${input.revolving_utilization_pct}% is limiting approvals`
    });
  }

  // High DTI
  if (subscores.dtiSubscore <= 70) {
    const priority = subscores.dtiSubscore <= 45 ? 95 : 75;
    actions.push({
      priority,
      action: 'Target paying off 1-2 highest monthly payment accounts to improve DTI and boost approval odds'
    });
  }

  // Too many inquiries
  if (subscores.inquirySubscore <= 60) {
    actions.push({
      priority: 85,
      action: `Avoid new credit applications for 60-90 days to let ${input.inquiries_6m} recent inquiries age off impact period`
    });
  }

  // Penalties present
  if (subscores.penaltyPoints < 0) {
    actions.push({
      priority: 90,
      action: 'Review and dispute any inaccurate derogatory marks; negotiate payment-for-deletion on valid collections'
    });
  }

  // Thin file
  if (subscores.depthMixSubscore <= 70) {
    actions.push({
      priority: 60,
      action: 'Add 1-2 new tradelines (authorized user or credit builder loan) to strengthen credit mix and depth'
    });
  }

  // Low credit score
  if (subscores.creditScoreSubscore <= 65) {
    actions.push({
      priority: 70,
      action: 'Focus on on-time payments for next 6 months - payment history is the #1 score driver'
    });
  }

  // Balance transfer opportunity
  if (input.revolving_utilization_pct >= 50 && subscores.creditScoreSubscore >= 65) {
    actions.push({
      priority: 85,
      action: 'Consider balance transfer or consolidation product to restructure expensive revolving debt at lower rates'
    });
  }

  // Sort by priority and return top 5
  actions.sort((a, b) => b.priority - a.priority);
  return actions.slice(0, 5).map(a => a.action);
}

// Funding ranges
function calculateFundingRange(tier: number): string {
  switch (tier) {
    case 1: return 'Moderate–High ($50K–$150K+)';
    case 2: return 'Moderate ($25K–$75K)';
    case 3: return 'Low–Moderate ($10K–$50K)';
    case 4: return 'Low ($5K–$25K)';
    default: return 'Low';
  }
}

function calculateOptimizedFundingRange(
  tier: number,
  utilization: number,
  dti: number,
  inquiry: number
): string {
  // Check if there's clear optimization potential
  const hasOptimizationPotential = utilization <= 75 || dti <= 70 || inquiry <= 60;

  if (!hasOptimizationPotential) {
    // Already optimized, same range
    return calculateFundingRange(tier);
  }

  // Bump up one tier for optimization potential
  const optimizedTier = Math.max(1, tier - 1);
  
  switch (optimizedTier) {
    case 1: return 'High ($75K–$200K+)';
    case 2: return 'Moderate–High ($50K–$125K)';
    case 3: return 'Moderate ($25K–$75K)';
    case 4: return 'Low–Moderate ($15K–$50K)';
    default: return 'Moderate';
  }
}

// Goal path generation
function generateGoalPath(goal: PrimaryGoal, tier: number): string {
  const pathMap: Record<PrimaryGoal, string> = {
    startup_funding: tier >= 3 
      ? 'Credit optimization → secured/alternative startup capital → traditional business funding'
      : 'Direct path to startup funding with credit-backed business lines and term loans',
    
    business_funding: tier >= 3
      ? 'Strengthen credit profile → explore revenue-based or collateral-backed options → scale to unsecured lines'
      : 'Ready for unsecured business lines, equipment financing, and SBA products',
    
    debt_consolidation: tier >= 3
      ? 'Targeted consolidation of high-APR debt → rebuild utilization → qualify for larger business funding'
      : 'Consolidate with balance transfer or personal loan → leverage improved profile for business capital',
    
    improve_credit: 'Execute high-impact actions over 90-180 days → re-position for prime funding opportunities',
    
    lower_utilization: tier >= 3
      ? 'Pay down revolving debt or secure consolidation loan → improved scores unlock better funding products'
      : 'Strategic utilization reduction → immediate access to expanded credit lines and funding',
    
    raise_score_fast: 'Focus on rapid-impact tactics: utilization reduction, dispute errors, add authorized user tradelines',
    
    not_sure: tier >= 3
      ? 'Strengthen fundability foundation → explore funding options aligned with business goals'
      : 'Strong fundability position - evaluate business vs personal funding needs and optimal structure'
  };

  return pathMap[goal] || 'Custom funding path based on profile optimization and business objectives';
}
