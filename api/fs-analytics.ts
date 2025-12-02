/**
 * Analytics API Endpoint
 * GET /api/fs-analytics
 * 
 * Returns aggregated metrics for fundability assessments
 * Useful for building dashboards and tracking trends
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AnalyticsQuery {
  start_date?: string; // ISO date
  end_date?: string;   // ISO date
  tier?: string;       // Filter by tier (1-4)
  goal?: string;       // Filter by primary_goal
}

interface AnalyticsMetrics {
  period: {
    start: string;
    end: string;
  };
  totals: {
    assessments: number;
    unique_clients: number;
    avg_score: number;
  };
  tier_distribution: {
    tier_1: number;
    tier_2: number;
    tier_3: number;
    tier_4: number;
  };
  goal_distribution: {
    [key: string]: number;
  };
  score_ranges: {
    '85-100': number;
    '70-84': number;
    '55-69': number;
    '0-54': number;
  };
  flags: {
    high_risk: number;
    missing_credit: number;
    missing_dti: number;
  };
  top_strengths: Array<{ strength: string; count: number }>;
  top_risks: Array<{ risk: string; count: number }>;
  top_actions: Array<{ action: string; count: number }>;
  funding_ranges: {
    low: number;
    low_moderate: number;
    moderate: number;
    moderate_high: number;
    high: number;
  };
}

/**
 * In-memory store for demo purposes
 * In production, replace with a database (PostgreSQL, MongoDB, etc.)
 */
let assessmentStore: any[] = [];

/**
 * Store an assessment result for analytics
 */
export function trackAssessment(input: any, result: any): void {
  assessmentStore.push({
    timestamp: new Date().toISOString(),
    client_email: input.email,
    client_name: `${input.first_name} ${input.last_name}`,
    score: result.fundability_score,
    tier: result.fundability_tier_numeric,
    tier_label: result.fundability_tier_label,
    primary_goal: input.primary_goal,
    strengths: result.key_strengths,
    risks: result.key_risks,
    actions: result.high_impact_actions,
    funding_range: result.funding_range_now,
    flags: result.flags,
  });

  // Keep only last 10,000 assessments in memory
  if (assessmentStore.length > 10000) {
    assessmentStore = assessmentStore.slice(-10000);
  }
}

/**
 * Calculate analytics metrics
 */
function calculateAnalytics(query: AnalyticsQuery): AnalyticsMetrics {
  const now = new Date();
  const startDate = query.start_date ? new Date(query.start_date) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const endDate = query.end_date ? new Date(query.end_date) : now;

  // Filter assessments by date range
  let filtered = assessmentStore.filter((a) => {
    const ts = new Date(a.timestamp);
    return ts >= startDate && ts <= endDate;
  });

  // Apply additional filters
  if (query.tier) {
    filtered = filtered.filter((a) => a.tier === parseInt(query.tier!));
  }
  if (query.goal) {
    filtered = filtered.filter((a) => a.primary_goal === query.goal);
  }

  // Calculate metrics
  const totalAssessments = filtered.length;
  const uniqueClients = new Set(filtered.map((a) => a.client_email)).size;
  const avgScore = totalAssessments > 0
    ? filtered.reduce((sum, a) => sum + a.score, 0) / totalAssessments
    : 0;

  // Tier distribution
  const tierDist = {
    tier_1: filtered.filter((a) => a.tier === 1).length,
    tier_2: filtered.filter((a) => a.tier === 2).length,
    tier_3: filtered.filter((a) => a.tier === 3).length,
    tier_4: filtered.filter((a) => a.tier === 4).length,
  };

  // Goal distribution
  const goalDist: { [key: string]: number } = {};
  filtered.forEach((a) => {
    goalDist[a.primary_goal] = (goalDist[a.primary_goal] || 0) + 1;
  });

  // Score ranges
  const scoreRanges = {
    '85-100': filtered.filter((a) => a.score >= 85).length,
    '70-84': filtered.filter((a) => a.score >= 70 && a.score < 85).length,
    '55-69': filtered.filter((a) => a.score >= 55 && a.score < 70).length,
    '0-54': filtered.filter((a) => a.score < 55).length,
  };

  // Flags
  const flags = {
    high_risk: filtered.filter((a) => a.flags.high_risk_profile).length,
    missing_credit: filtered.filter((a) => a.flags.missing_credit_score).length,
    missing_dti: filtered.filter((a) => a.flags.missing_dti).length,
  };

  // Top strengths
  const strengthCounts: { [key: string]: number } = {};
  filtered.forEach((a) => {
    a.strengths.forEach((s: string) => {
      strengthCounts[s] = (strengthCounts[s] || 0) + 1;
    });
  });
  const topStrengths = Object.entries(strengthCounts)
    .map(([strength, count]) => ({ strength, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top risks
  const riskCounts: { [key: string]: number } = {};
  filtered.forEach((a) => {
    a.risks.forEach((r: string) => {
      riskCounts[r] = (riskCounts[r] || 0) + 1;
    });
  });
  const topRisks = Object.entries(riskCounts)
    .map(([risk, count]) => ({ risk, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Top actions
  const actionCounts: { [key: string]: number } = {};
  filtered.forEach((a) => {
    a.actions.slice(0, 3).forEach((action: string) => {
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });
  });
  const topActions = Object.entries(actionCounts)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Funding ranges
  const fundingRanges = {
    low: filtered.filter((a) => a.funding_range === 'Low').length,
    low_moderate: filtered.filter((a) => a.funding_range === 'Low-Moderate').length,
    moderate: filtered.filter((a) => a.funding_range === 'Moderate').length,
    moderate_high: filtered.filter((a) => a.funding_range === 'Moderate-High').length,
    high: filtered.filter((a) => a.funding_range === 'High').length,
  };

  return {
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    totals: {
      assessments: totalAssessments,
      unique_clients: uniqueClients,
      avg_score: Math.round(avgScore * 10) / 10,
    },
    tier_distribution: tierDist,
    goal_distribution: goalDist,
    score_ranges: scoreRanges,
    flags,
    top_strengths: topStrengths,
    top_risks: topRisks,
    top_actions: topActions,
    funding_ranges: fundingRanges,
  };
}

/**
 * Analytics API handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const query: AnalyticsQuery = {
      start_date: req.query.start_date as string | undefined,
      end_date: req.query.end_date as string | undefined,
      tier: req.query.tier as string | undefined,
      goal: req.query.goal as string | undefined,
    };

    const analytics = calculateAnalytics(query);

    return res.status(200).json({
      success: true,
      data: analytics,
      meta: {
        version: 'fs_analytics_v1.0',
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Example queries:
 * 
 * GET /api/fs-analytics
 * Returns analytics for last 30 days
 * 
 * GET /api/fs-analytics?start_date=2024-01-01&end_date=2024-01-31
 * Returns analytics for January 2024
 * 
 * GET /api/fs-analytics?tier=1
 * Returns analytics for Tier 1 clients only
 * 
 * GET /api/fs-analytics?goal=business_funding
 * Returns analytics for business_funding goal only
 * 
 * GET /api/fs-analytics?start_date=2024-01-01&tier=4&goal=debt_consolidation
 * Returns analytics for Tier 4 debt consolidation clients in 2024
 */
