import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateInput, FundabilityInput } from '../lib/validation';
import { calculateFundabilitySnapshot } from '../lib/scoring-engine';

// Optional: Import webhook and analytics functionality
// Uncomment these imports when you're ready to use them
// import { createWebhookPayload, broadcastToWebhooks } from '../lib/webhooks';
// import { trackAssessment } from './fs-analytics';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const validationResult = validateInput(req.body);
    
    if (!validationResult.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.errors
      });
    }

    const input = validationResult.data as FundabilityInput;

    // Calculate fundability snapshot
    const snapshot = calculateFundabilitySnapshot(input);

    // Optional: Track assessment for analytics
    // Uncomment when ready to use
    // try {
    //   trackAssessment(input, snapshot);
    // } catch (analyticsError) {
    //   console.error('Analytics tracking failed:', analyticsError);
    //   // Don't fail the request if analytics fails
    // }

    // Optional: Send webhooks
    // Uncomment and configure environment variables when ready
    // const webhookConfigs = [
    //   process.env.SLACK_WEBHOOK_URL && {
    //     url: process.env.SLACK_WEBHOOK_URL,
    //     type: 'slack' as const,
    //     enabled: process.env.ENABLE_WEBHOOKS === 'true',
    //   },
    //   process.env.HUBSPOT_WEBHOOK_URL && {
    //     url: process.env.HUBSPOT_WEBHOOK_URL,
    //     type: 'hubspot' as const,
    //     enabled: process.env.ENABLE_WEBHOOKS === 'true',
    //   },
    // ].filter(Boolean) as any[];
    //
    // if (webhookConfigs.length > 0) {
    //   try {
    //     const webhookPayload = createWebhookPayload(input, snapshot);
    //     // Fire and forget - don't wait for webhooks
    //     broadcastToWebhooks(webhookConfigs, webhookPayload).catch(err => {
    //       console.error('Webhook broadcast failed:', err);
    //     });
    //   } catch (webhookError) {
    //     console.error('Webhook preparation failed:', webhookError);
    //   }
    // }

    // Optional: Log performance metrics
    const duration = Date.now() - startTime;
    if (process.env.DEBUG === 'true') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: 'fundability_assessment',
        email: input.email,
        score: snapshot.fundability_score,
        tier: snapshot.fundability_tier_numeric,
        duration_ms: duration,
      }));
    }

    // Return success response
    return res.status(200).json(snapshot);

  } catch (error) {
    // Log error for monitoring
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'fundability_assessment_error',
      error: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
    }));

    return res.status(500).json({
      error: 'Internal server error',
      details: [process.env.NODE_ENV === 'development' 
        ? (error as Error).message 
        : 'An unexpected error occurred processing your request']
    });
  }
}
