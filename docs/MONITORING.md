# Monitoring & Observability Guide

This guide covers how to monitor, log, and track the health of your Fundability Snapshot Engine.

## Table of Contents
- [Built-in Vercel Monitoring](#built-in-vercel-monitoring)
- [Custom Logging](#custom-logging)
- [Error Tracking with Sentry](#error-tracking-with-sentry)
- [Analytics Dashboard](#analytics-dashboard)
- [Alerting & Notifications](#alerting--notifications)
- [Performance Metrics](#performance-metrics)

---

## Built-in Vercel Monitoring

### 1. Real-time Function Logs
```bash
# View live logs
vercel logs your-deployment-url --follow

# View logs for specific function
vercel logs your-deployment-url --follow --scope api/fs-snapshot

# Filter logs by time
vercel logs your-deployment-url --since 1h
```

### 2. Vercel Dashboard Metrics
Access at: `https://vercel.com/your-team/your-project`

**Available Metrics:**
- Request count & latency
- Error rate & status codes
- Cold start frequency
- Memory usage
- Bandwidth consumption
- Edge cache hit rate

### 3. Set Up Vercel Alerts
```javascript
// In vercel.json
{
  "monitoring": {
    "alerts": {
      "error_rate": {
        "threshold": 5,  // 5% error rate
        "period": "5m"
      },
      "latency": {
        "threshold": 2000,  // 2 seconds
        "period": "5m"
      }
    }
  }
}
```

---

## Custom Logging

### Structured Logging Library

```typescript
// lib/logger.ts
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, context?: any, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      ...(error && {
        error: {
          message: error.message,
          stack: this.isDev ? error.stack : undefined,
        },
      }),
    };

    // Console output (captured by Vercel)
    console.log(JSON.stringify(entry));

    // Send to external logging service (optional)
    this.sendToExternal(entry);
  }

  private async sendToExternal(entry: LogEntry) {
    // Send to Datadog, LogRocket, etc.
    if (process.env.DATADOG_API_KEY) {
      // await fetch('https://http-intake.logs.datadoghq.com/v1/input', {...})
    }
  }

  debug(message: string, context?: any) {
    if (this.isDev) this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: any) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: any) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: any) {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

export const logger = new Logger();
```

### Usage in API Endpoints

```typescript
// api/fs-snapshot.ts
import { logger } from '../lib/logger';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  try {
    logger.info('Fundability assessment started', {
      email: req.body.email,
      source: req.body.source,
    });

    const result = calculateFundabilitySnapshot(input);
    const duration = Date.now() - startTime;

    logger.info('Fundability assessment completed', {
      email: input.email,
      score: result.fundability_score,
      tier: result.fundability_tier_numeric,
      duration_ms: duration,
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Fundability assessment failed', error as Error, {
      email: req.body?.email,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Error Tracking with Sentry

### 1. Installation
```bash
npm install @sentry/node @sentry/integrations
```

### 2. Configuration
```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend(event, hint) {
    // Scrub sensitive data
    if (event.request?.data) {
      delete event.request.data.credit_score;
      delete event.request.data.email;
    }
    return event;
  },
});

export { Sentry };
```

### 3. Integration
```typescript
// api/fs-snapshot.ts
import { Sentry } from '../lib/sentry';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Your code
  } catch (error) {
    Sentry.captureException(error, {
      contexts: {
        request: {
          method: req.method,
          url: req.url,
        },
      },
      tags: {
        endpoint: 'fs-snapshot',
        tier: result?.fundability_tier_numeric,
      },
    });
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## Analytics Dashboard

### Key Metrics to Track

**Real-time Metrics:**
- Total assessments (last 24h, 7d, 30d)
- Average fundability score
- Tier distribution
- Goal distribution
- Error rate
- Average response time

**Business Metrics:**
- Conversion rate by tier
- Top strengths/risks/actions
- Funding range distribution
- High-risk profile percentage

### Sample Dashboard Query

```typescript
// Get dashboard data
const dashboardData = await fetch('/api/fs-analytics?start_date=2024-01-01');
const analytics = await dashboardData.json();

// Display metrics
console.log(`Total Assessments: ${analytics.totals.assessments}`);
console.log(`Average Score: ${analytics.totals.avg_score}`);
console.log(`Tier 1: ${analytics.tier_distribution.tier_1}`);
```

### External Analytics Services

**Recommended Tools:**
- **Mixpanel**: User behavior tracking
- **Amplitude**: Product analytics
- **PostHog**: Open-source analytics
- **Google Analytics 4**: Free web analytics

```typescript
// lib/analytics.ts
export function trackEvent(event: string, properties: Record<string, any>) {
  // Mixpanel
  if (process.env.MIXPANEL_TOKEN) {
    // mixpanel.track(event, properties);
  }
  
  // PostHog
  if (process.env.POSTHOG_API_KEY) {
    // posthog.capture(event, properties);
  }
  
  // Google Analytics 4
  if (process.env.GA4_MEASUREMENT_ID) {
    // gtag('event', event, properties);
  }
}
```

---

## Alerting & Notifications

### 1. Slack Alerts

```typescript
// lib/alerts.ts
async function sendSlackAlert(message: string, severity: 'info' | 'warning' | 'critical') {
  const colors = {
    info: '#36a64f',
    warning: '#ffcc00',
    critical: '#ff0000',
  };

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [{
        color: colors[severity],
        text: message,
        footer: 'Fundability Engine',
        ts: Math.floor(Date.now() / 1000),
      }],
    }),
  });
}

// Usage
if (errorRate > 0.05) {
  sendSlackAlert('🚨 Error rate exceeded 5%', 'critical');
}
```

### 2. Email Alerts (SendGrid)

```typescript
// lib/email-alerts.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmailAlert(subject: string, html: string) {
  await sgMail.send({
    to: process.env.ADMIN_EMAIL,
    from: process.env.FROM_EMAIL,
    subject: `[Fundability Engine] ${subject}`,
    html,
  });
}

// Usage
if (avgScore < 50) {
  sendEmailAlert(
    'Low Score Alert',
    '<p>Average fundability score dropped below 50</p>'
  );
}
```

### 3. PagerDuty Integration

```typescript
async function triggerPagerDuty(message: string, severity: 'critical' | 'error' | 'warning') {
  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      routing_key: process.env.PAGERDUTY_ROUTING_KEY,
      event_action: 'trigger',
      payload: {
        summary: message,
        severity,
        source: 'fundability-engine',
        timestamp: new Date().toISOString(),
      },
    }),
  });
}
```

---

## Performance Metrics

### 1. Response Time Tracking

```typescript
// lib/performance.ts
export class PerformanceTracker {
  private startTime: number;
  private metrics: Record<string, number> = {};

  constructor() {
    this.startTime = Date.now();
  }

  mark(label: string) {
    this.metrics[label] = Date.now() - this.startTime;
  }

  getMetrics() {
    return {
      ...this.metrics,
      total: Date.now() - this.startTime,
    };
  }
}

// Usage
const perf = new PerformanceTracker();
const input = validateInput(req.body);
perf.mark('validation');

const result = calculateFundabilitySnapshot(input);
perf.mark('calculation');

await sendWebhooks(webhooks, payload);
perf.mark('webhooks');

logger.info('Performance metrics', perf.getMetrics());
// Output: { validation: 5, calculation: 42, webhooks: 156, total: 203 }
```

### 2. Memory Usage Tracking

```typescript
function logMemoryUsage() {
  const usage = process.memoryUsage();
  logger.info('Memory usage', {
    rss_mb: Math.round(usage.rss / 1024 / 1024),
    heap_used_mb: Math.round(usage.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(usage.heapTotal / 1024 / 1024),
  });
}
```

### 3. Database Query Performance

```typescript
async function trackQueryPerformance<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    logger.info('Database query', {
      query: queryName,
      duration_ms: duration,
      success: true,
    });
    
    return result;
  } catch (error) {
    logger.error('Database query failed', error as Error, {
      query: queryName,
    });
    throw error;
  }
}
```

---

## Health Check Endpoint

```typescript
// api/health.ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    version: process.env.API_VERSION || 'unknown',
  };

  return res.status(200).json(health);
}
```

Test health: `curl https://your-app.vercel.app/api/health`

---

## Monitoring Checklist

- [ ] Vercel dashboard configured
- [ ] Structured logging implemented
- [ ] Error tracking with Sentry
- [ ] Analytics endpoint created
- [ ] Slack alerts configured
- [ ] Email alerts configured
- [ ] Performance tracking added
- [ ] Health check endpoint deployed
- [ ] Dashboard metrics reviewed weekly

---

## Recommended Monitoring Stack

**Free Tier:**
- Vercel built-in monitoring
- Sentry (5k errors/month)
- PostHog (1M events/month)
- UptimeRobot (50 monitors)

**Paid Tier (for scale):**
- Datadog ($15/host/month)
- New Relic ($49/month)
- LogRocket ($99/month)
- PagerDuty ($19/user/month)
