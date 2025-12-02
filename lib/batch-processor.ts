/**
 * Batch Processing System for Fundability Assessments
 * Process multiple clients in bulk with rate limiting and error handling
 */

import { calculateFundabilitySnapshot } from './scoring-engine';
import { validateInput, FundabilityInput } from './validation';
import { createWebhookPayload, broadcastToWebhooks } from './webhooks';

interface BatchProcessConfig {
  concurrency?: number; // Max concurrent requests (default: 10)
  delayMs?: number; // Delay between batches (default: 100ms)
  webhooks?: any[]; // Optional webhook configs
  onProgress?: (processed: number, total: number) => void;
  onError?: (client: any, error: Error) => void;
}

interface BatchResult {
  success: any[];
  failed: any[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duration_ms: number;
  };
}

/**
 * Process multiple fundability assessments in batch
 */
export async function processBatch(clients: FundabilityInput[], config: BatchProcessConfig = {}): Promise<BatchResult> {
  const startTime = Date.now();
  const {
    concurrency = 10,
    delayMs = 100,
    webhooks = [],
    onProgress = () => {},
    onError = () => {},
  } = config;

  const success: any[] = [];
  const failed: any[] = [];

  // Split into chunks for rate limiting
  const chunks: FundabilityInput[][] = [];
  for (let i = 0; i < clients.length; i += concurrency) {
    chunks.push(clients.slice(i, i + concurrency));
  }

  let processed = 0;

  for (const chunk of chunks) {
    const promises = chunk.map(async (client) => {
      try {
        // Validate input
        const validationErrors = validateInput(client);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }

        // Calculate fundability
        const result = calculateFundabilitySnapshot(client);

        // Send webhooks if configured
        if (webhooks.length > 0) {
          const webhookPayload = createWebhookPayload(client, result);
          await broadcastToWebhooks(webhooks, webhookPayload);
        }

        return {
          status: 'success',
          client: {
            name: `${client.first_name} ${client.last_name}`,
            email: client.email,
          },
          result,
        };
      } catch (error) {
        onError(client, error as Error);
        return {
          status: 'failed',
          client: {
            name: `${client.first_name} ${client.last_name}`,
            email: client.email,
          },
          error: (error as Error).message,
        };
      }
    });

    const results = await Promise.all(promises);

    results.forEach((result) => {
      if (result.status === 'success') {
        success.push(result);
      } else {
        failed.push(result);
      }
      processed++;
      onProgress(processed, clients.length);
    });

    // Delay between chunks
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const duration = Date.now() - startTime;

  return {
    success,
    failed,
    summary: {
      total: clients.length,
      successful: success.length,
      failed: failed.length,
      duration_ms: duration,
    },
  };
}

/**
 * Export batch results to CSV format
 */
export function exportToCSV(batchResult: BatchResult): string {
  const headers = [
    'Name',
    'Email',
    'Score',
    'Tier',
    'Tier Label',
    'Funding Range Now',
    'Funding Range Optimized',
    'Key Strengths',
    'Key Risks',
    'Top Actions',
    'High Risk Flag',
    'Status',
  ];

  const rows: string[][] = [headers];

  // Add successful results
  batchResult.success.forEach((item) => {
    const r = item.result;
    rows.push([
      item.client.name,
      item.client.email,
      r.fundability_score.toString(),
      r.fundability_tier_numeric.toString(),
      r.fundability_tier_label,
      r.funding_range_now,
      r.funding_range_after_optimization,
      r.key_strengths.join('; '),
      r.key_risks.join('; '),
      r.high_impact_actions.slice(0, 3).join('; '),
      r.flags.high_risk_profile ? 'Yes' : 'No',
      'Success',
    ]);
  });

  // Add failed results
  batchResult.failed.forEach((item) => {
    rows.push([
      item.client.name,
      item.client.email,
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      `Failed: ${item.error}`,
    ]);
  });

  // Convert to CSV
  return rows
    .map((row) =>
      row
        .map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = cell.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
    .join('\n');
}

/**
 * Export batch results to JSON format
 */
export function exportToJSON(batchResult: BatchResult): string {
  return JSON.stringify(batchResult, null, 2);
}

/**
 * Parse CSV file to client array
 */
export function parseCSVToClients(csvContent: string): FundabilityInput[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim());

  const clients: FundabilityInput[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const client: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (!value) return;

      // Map CSV headers to input fields
      switch (header.toLowerCase()) {
        case 'first_name':
        case 'firstname':
          client.first_name = value;
          break;
        case 'last_name':
        case 'lastname':
          client.last_name = value;
          break;
        case 'email':
          client.email = value;
          break;
        case 'credit_score':
        case 'creditscore':
          client.credit_score = value === '' ? null : parseInt(value);
          break;
        case 'revolving_utilization_pct':
        case 'utilization':
        case 'utilization_pct':
          client.revolving_utilization_pct = parseFloat(value);
          break;
        case 'dti_pct':
        case 'dti':
          client.dti_pct = value === '' ? null : parseFloat(value);
          break;
        case 'inquiries_6m':
        case 'inquiries':
          client.inquiries_6m = parseInt(value) || 0;
          break;
        case 'oldest_account_years':
        case 'account_age':
          client.oldest_account_years = parseFloat(value) || 0;
          break;
        case 'open_tradelines':
        case 'tradelines':
          client.open_tradelines = parseInt(value);
          break;
        case 'recent_derogs_24m':
        case 'derogs':
          client.recent_derogs_24m = parseInt(value) || 0;
          break;
        case 'bk_or_major_event':
        case 'bankruptcy':
          client.bk_or_major_event = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
          break;
        case 'requested_amount':
        case 'amount':
          client.requested_amount = parseFloat(value);
          break;
        case 'primary_goal':
        case 'goal':
          client.primary_goal = value;
          break;
      }
    });

    clients.push(client as FundabilityInput);
  }

  return clients;
}

/**
 * Parse a single CSV line with proper quote handling
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Example CSV template
 */
export const CSV_TEMPLATE = `first_name,last_name,email,credit_score,revolving_utilization_pct,dti_pct,inquiries_6m,oldest_account_years,open_tradelines,recent_derogs_24m,bk_or_major_event,requested_amount,primary_goal
John,Smith,john.smith@example.com,720,35,32,2,8,7,0,false,50000,business_funding
Jane,Doe,jane.doe@example.com,680,55,45,4,5,5,1,false,25000,debt_consolidation
Mike,Johnson,mike.j@example.com,780,15,20,0,12,10,0,false,100000,startup_funding`;

/**
 * Example usage:
 *
 * // Process from CSV file
 * const csvContent = fs.readFileSync('clients.csv', 'utf-8');
 * const clients = parseCSVToClients(csvContent);
 *
 * // Process batch with progress tracking
 * const result = await processBatch(clients, {
 *   concurrency: 10,
 *   delayMs: 100,
 *   onProgress: (processed, total) => {
 *     console.log(`Progress: ${processed}/${total}`);
 *   },
 *   onError: (client, error) => {
 *     console.error(`Error processing ${client.email}:`, error.message);
 *   }
 * });
 *
 * // Export results
 * const csvOutput = exportToCSV(result);
 * fs.writeFileSync('results.csv', csvOutput);
 *
 * console.log(`Processed ${result.summary.total} clients in ${result.summary.duration_ms}ms`);
 * console.log(`Success: ${result.summary.successful}, Failed: ${result.summary.failed}`);
 */
