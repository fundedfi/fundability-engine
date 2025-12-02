/**
 * Webhook Notification System
 * Send real-time fundability snapshots to external systems (Slack, Discord, custom endpoints)
 */

interface WebhookConfig {
  url: string;
  type: 'slack' | 'discord' | 'generic' | 'hubspot';
  secret?: string;
  enabled?: boolean;
}

interface FundabilityWebhookPayload {
  event: 'fundability_calculated';
  timestamp: string;
  client: {
    name: string;
    email: string;
  };
  score: {
    value: number;
    tier: number;
    tier_label: string;
  };
  summary: {
    strengths: string[];
    risks: string[];
    top_actions: string[];
    funding_range: string;
  };
  flags: {
    high_risk: boolean;
    missing_data: boolean;
  };
}

/**
 * Format payload for Slack webhook
 */
function formatSlackMessage(payload: FundabilityWebhookPayload): object {
  const tierEmoji = {
    1: '🟢',
    2: '🟡',
    3: '🟠',
    4: '🔴',
  }[payload.score.tier] || '⚪';

  const color = {
    1: '#4CAF50',
    2: '#FFC107',
    3: '#FF9800',
    4: '#F44336',
  }[payload.score.tier] || '#9E9E9E';

  return {
    attachments: [
      {
        color: color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${tierEmoji} New Fundability Assessment`,
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Client:*\n${payload.client.name}`,
              },
              {
                type: 'mrkdwn',
                text: `*Score:*\n${payload.score.value}/100`,
              },
              {
                type: 'mrkdwn',
                text: `*Tier:*\n${payload.score.tier_label}`,
              },
              {
                type: 'mrkdwn',
                text: `*Funding Range:*\n${payload.summary.funding_range}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*💪 Key Strengths*\n${payload.summary.strengths.map((s) => `• ${s}`).join('\n')}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*⚠️ Key Risks*\n${payload.summary.risks.map((r) => `• ${r}`).join('\n')}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*🎯 Top Actions*\n${payload.summary.top_actions.slice(0, 3).map((a, i) => `${i + 1}. ${a}`).join('\n')}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📧 ${payload.client.email} | ⏰ ${new Date(payload.timestamp).toLocaleString()}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Format payload for Discord webhook
 */
function formatDiscordMessage(payload: FundabilityWebhookPayload): object {
  const tierEmoji = {
    1: '🟢',
    2: '🟡',
    3: '🟠',
    4: '🔴',
  }[payload.score.tier] || '⚪';

  const color = {
    1: 0x4caf50,
    2: 0xffc107,
    3: 0xff9800,
    4: 0xf44336,
  }[payload.score.tier] || 0x9e9e9e;

  return {
    embeds: [
      {
        title: `${tierEmoji} Fundability Assessment: ${payload.client.name}`,
        color: color,
        fields: [
          {
            name: 'Score',
            value: `**${payload.score.value}/100** (${payload.score.tier_label})`,
            inline: true,
          },
          {
            name: 'Funding Range',
            value: payload.summary.funding_range,
            inline: true,
          },
          {
            name: '💪 Key Strengths',
            value: payload.summary.strengths.map((s) => `• ${s}`).join('\n') || 'None',
            inline: false,
          },
          {
            name: '⚠️ Key Risks',
            value: payload.summary.risks.map((r) => `• ${r}`).join('\n') || 'None',
            inline: false,
          },
          {
            name: '🎯 Top Actions',
            value:
              payload.summary.top_actions
                .slice(0, 3)
                .map((a, i) => `${i + 1}. ${a}`)
                .join('\n') || 'None',
            inline: false,
          },
        ],
        footer: {
          text: `${payload.client.email} • ${new Date(payload.timestamp).toLocaleString()}`,
        },
      },
    ],
  };
}

/**
 * Format payload for generic webhook
 */
function formatGenericPayload(payload: FundabilityWebhookPayload): object {
  return payload;
}

/**
 * Format payload for HubSpot workflow webhook
 */
function formatHubSpotPayload(payload: FundabilityWebhookPayload): object {
  return {
    email: payload.client.email,
    properties: {
      fundability_score: payload.score.value,
      fundability_tier: payload.score.tier,
      fundability_tier_label: payload.score.tier_label,
      funding_range_current: payload.summary.funding_range,
      key_strengths: payload.summary.strengths.join('; '),
      key_risks: payload.summary.risks.join('; '),
      recommended_actions: payload.summary.top_actions.join('; '),
      high_risk_flag: payload.flags.high_risk,
      assessment_date: payload.timestamp,
    },
  };
}

/**
 * Send webhook notification
 */
export async function sendWebhook(config: WebhookConfig, payload: FundabilityWebhookPayload): Promise<boolean> {
  if (config.enabled === false) {
    return false;
  }

  let formattedPayload: object;

  switch (config.type) {
    case 'slack':
      formattedPayload = formatSlackMessage(payload);
      break;
    case 'discord':
      formattedPayload = formatDiscordMessage(payload);
      break;
    case 'hubspot':
      formattedPayload = formatHubSpotPayload(payload);
      break;
    case 'generic':
    default:
      formattedPayload = formatGenericPayload(payload);
      break;
  }

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.secret && { Authorization: `Bearer ${config.secret}` }),
      },
      body: JSON.stringify(formattedPayload),
    });

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Webhook error:', error);
    return false;
  }
}

/**
 * Create webhook payload from fundability result
 */
export function createWebhookPayload(
  input: {
    first_name: string;
    last_name: string;
    email: string;
  },
  result: {
    fundability_score: number;
    fundability_tier_numeric: number;
    fundability_tier_label: string;
    key_strengths: string[];
    key_risks: string[];
    high_impact_actions: string[];
    funding_range_now: string;
    flags: {
      high_risk_profile?: boolean;
      missing_credit_score?: boolean;
      missing_dti?: boolean;
    };
  }
): FundabilityWebhookPayload {
  return {
    event: 'fundability_calculated',
    timestamp: new Date().toISOString(),
    client: {
      name: `${input.first_name} ${input.last_name}`,
      email: input.email,
    },
    score: {
      value: result.fundability_score,
      tier: result.fundability_tier_numeric,
      tier_label: result.fundability_tier_label,
    },
    summary: {
      strengths: result.key_strengths,
      risks: result.key_risks,
      top_actions: result.high_impact_actions,
      funding_range: result.funding_range_now,
    },
    flags: {
      high_risk: result.flags.high_risk_profile || false,
      missing_data: result.flags.missing_credit_score || result.flags.missing_dti || false,
    },
  };
}

/**
 * Multi-webhook broadcaster
 * Send to multiple webhook endpoints simultaneously
 */
export async function broadcastToWebhooks(
  configs: WebhookConfig[],
  payload: FundabilityWebhookPayload
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(configs.map((config) => sendWebhook(config, payload)));

  const success = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - success;

  return { success, failed };
}

/**
 * Example usage in API endpoint:
 *
 * // In api/fs-snapshot.ts
 * import { createWebhookPayload, broadcastToWebhooks } from '../lib/webhooks';
 *
 * const result = calculateFundabilitySnapshot(input);
 *
 * // Send to configured webhooks
 * const webhookConfigs = [
 *   {
 *     url: process.env.SLACK_WEBHOOK_URL,
 *     type: 'slack',
 *     enabled: true
 *   },
 *   {
 *     url: process.env.HUBSPOT_WEBHOOK_URL,
 *     type: 'hubspot',
 *     enabled: true
 *   }
 * ];
 *
 * const webhookPayload = createWebhookPayload(input, result);
 * await broadcastToWebhooks(webhookConfigs, webhookPayload);
 *
 * return result;
 */
