/**
 * Fundability Snapshot Engine - Integration Examples
 * 
 * This file contains example code for integrating the Fundability Snapshot API
 * into various platforms and workflows.
 */

// ============================================================================
// 1. Node.js / Express Backend Integration
// ============================================================================

async function getFundabilitySnapshot(contactData) {
  const API_ENDPOINT = process.env.FUNDABILITY_API_URL || 'https://your-app.vercel.app/api/fs-snapshot';
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication header if needed
        // 'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify(contactData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error} - ${error.details?.join(', ')}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fundability snapshot error:', error);
    throw error;
  }
}

// Usage example
const exampleContact = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  credit_score: 680,
  revolving_utilization_pct: 45,
  dti_pct: 38,
  inquiries_6m: 3,
  oldest_account_years: 8,
  open_tradelines: 7,
  recent_derogs_24m: 0,
  bk_or_major_event: false,
  requested_amount: 75000,
  primary_goal: 'business_funding'
};

// getFundabilitySnapshot(exampleContact)
//   .then(snapshot => console.log('Fundability Score:', snapshot.fundability_score))
//   .catch(error => console.error(error));


// ============================================================================
// 2. HubSpot Workflow Integration
// ============================================================================

/**
 * Call this from a HubSpot custom code workflow action
 * or webhook endpoint
 */
async function hubspotWorkflowAction(contact) {
  const payload = {
    first_name: contact.properties.firstname,
    last_name: contact.properties.lastname,
    email: contact.properties.email,
    credit_score: contact.properties.credit_score || null,
    revolving_utilization_pct: contact.properties.utilization_pct || 50,
    dti_pct: contact.properties.dti_ratio || null,
    inquiries_6m: contact.properties.recent_inquiries || 0,
    oldest_account_years: contact.properties.oldest_account_years || 0,
    open_tradelines: contact.properties.open_accounts || 3,
    recent_derogs_24m: contact.properties.recent_derogs || 0,
    bk_or_major_event: contact.properties.has_bankruptcy || false,
    requested_amount: contact.properties.requested_funding || 50000,
    primary_goal: contact.properties.funding_goal || 'not_sure',
    source: 'hubspot_workflow',
    external_contact_id: contact.vid
  };

  const snapshot = await getFundabilitySnapshot(payload);

  // Update HubSpot contact with results
  const hubspotUpdatePayload = {
    properties: {
      fundability_score: snapshot.fundability_score,
      fundability_tier: snapshot.fundability_tier_label,
      funding_range_now: snapshot.funding_range_now,
      funding_range_optimized: snapshot.funding_range_after_optimization,
      key_strengths: snapshot.key_strengths.join('; '),
      key_risks: snapshot.key_risks.join('; '),
      next_actions: snapshot.high_impact_actions.slice(0, 3).join('; '),
      last_assessment_date: new Date().toISOString()
    }
  };

  return hubspotUpdatePayload;
}


// ============================================================================
// 3. Airtable Automation Script
// ============================================================================

/**
 * Airtable automation script to calculate fundability on record update
 */
const airtableAutomation = `
// This runs in Airtable's scripting block or automation

let table = base.getTable('Clients');
let record = input.config();

// Fetch fundability snapshot
let response = await fetch('https://your-app.vercel.app/api/fs-snapshot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    first_name: record.getCellValue('First Name'),
    last_name: record.getCellValue('Last Name'),
    email: record.getCellValue('Email'),
    credit_score: record.getCellValue('Credit Score'),
    revolving_utilization_pct: record.getCellValue('Utilization %'),
    dti_pct: record.getCellValue('DTI %'),
    inquiries_6m: record.getCellValue('Recent Inquiries'),
    oldest_account_years: record.getCellValue('Oldest Account Years'),
    open_tradelines: record.getCellValue('Open Accounts'),
    recent_derogs_24m: record.getCellValue('Recent Derogs'),
    bk_or_major_event: record.getCellValue('Has Bankruptcy'),
    requested_amount: record.getCellValue('Requested Amount'),
    primary_goal: record.getCellValue('Primary Goal')
  })
});

let snapshot = await response.json();

// Update the record
await table.updateRecordAsync(record.id, {
  'Fundability Score': snapshot.fundability_score,
  'Tier': snapshot.fundability_tier_label,
  'Funding Range Now': snapshot.funding_range_now,
  'Key Strengths': snapshot.key_strengths.join('\\n'),
  'High Impact Actions': snapshot.high_impact_actions.join('\\n')
});
`;


// ============================================================================
// 4. Google Sheets Custom Function (Apps Script)
// ============================================================================

/**
 * Add this to Google Sheets via Extensions > Apps Script
 * Then use formula: =FUNDABILITY_SCORE(A2, B2, C2, ...)
 */
const googleSheetsFunction = `
function FUNDABILITY_SCORE(firstName, lastName, email, creditScore, utilization, dti, inquiries, oldestYears, tradelines, derogs, hasBK, requestedAmount, goal) {
  const url = 'https://your-app.vercel.app/api/fs-snapshot';
  
  const payload = {
    first_name: firstName,
    last_name: lastName,
    email: email,
    credit_score: creditScore || null,
    revolving_utilization_pct: utilization,
    dti_pct: dti || null,
    inquiries_6m: inquiries || 0,
    oldest_account_years: oldestYears || 0,
    open_tradelines: tradelines,
    recent_derogs_24m: derogs || 0,
    bk_or_major_event: hasBK || false,
    requested_amount: requestedAmount,
    primary_goal: goal || 'not_sure'
  };
  
  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) {
      return 'ERROR: ' + data.error;
    }
    
    return data.fundability_score;
  } catch (error) {
    return 'ERROR: ' + error.message;
  }
}

// Get full snapshot as JSON
function GET_FUNDABILITY_SNAPSHOT(firstName, lastName, email, creditScore, utilization, dti, inquiries, oldestYears, tradelines, derogs, hasBK, requestedAmount, goal) {
  // Same as above but return full JSON
  // Parse in subsequent columns with: =INDEX(data, "fundability_tier_label")
}
`;


// ============================================================================
// 5. Zapier Webhook Integration
// ============================================================================

/**
 * Use in Zapier's "Webhooks by Zapier" action
 * 
 * Setup:
 * 1. Action: POST Request
 * 2. URL: https://your-app.vercel.app/api/fs-snapshot
 * 3. Payload Type: JSON
 * 4. Data: Map fields from trigger
 */

const zapierExample = {
  method: 'POST',
  url: 'https://your-app.vercel.app/api/fs-snapshot',
  headers: {
    'Content-Type': 'application/json'
  },
  data: {
    first_name: '{{first_name}}',
    last_name: '{{last_name}}',
    email: '{{email}}',
    credit_score: '{{credit_score}}',
    revolving_utilization_pct: '{{utilization}}',
    dti_pct: '{{dti}}',
    inquiries_6m: '{{inquiries}}',
    oldest_account_years: '{{oldest_years}}',
    open_tradelines: '{{tradelines}}',
    recent_derogs_24m: '{{derogs}}',
    bk_or_major_event: '{{has_bk}}',
    requested_amount: '{{amount}}',
    primary_goal: '{{goal}}'
  }
};


// ============================================================================
// 6. React Frontend Integration
// ============================================================================

import React, { useState } from 'react';

function FundabilityForm() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    credit_score: '',
    revolving_utilization_pct: '',
    // ... other fields
  });
  
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fs-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          credit_score: formData.credit_score ? parseInt(formData.credit_score) : null,
          revolving_utilization_pct: parseFloat(formData.revolving_utilization_pct),
          // ... parse other numeric fields
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details?.join(', ') || errorData.error);
      }

      const data = await response.json();
      setSnapshot(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Form fields */}
        <button type="submit" disabled={loading}>
          {loading ? 'Calculating...' : 'Get Fundability Score'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {snapshot && (
        <div className="results">
          <h2>Fundability Score: {snapshot.fundability_score}</h2>
          <p>{snapshot.fundability_tier_label}</p>
          
          <h3>Strengths</h3>
          <ul>
            {snapshot.key_strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          <h3>High-Impact Actions</h3>
          <ol>
            {snapshot.high_impact_actions.map((a, i) => <li key={i}>{a}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// 7. Batch Processing Example
// ============================================================================

async function processBatch(contacts) {
  const API_ENDPOINT = 'https://your-app.vercel.app/api/fs-snapshot';
  const BATCH_SIZE = 10; // Process 10 at a time
  const DELAY_MS = 100; // Rate limiting

  const results = [];
  
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(contact =>
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      })
      .then(r => r.json())
      .catch(err => ({ error: err.message, contact_email: contact.email }))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Rate limiting delay
    if (i + BATCH_SIZE < contacts.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    console.log(`Processed ${Math.min(i + BATCH_SIZE, contacts.length)} of ${contacts.length}`);
  }

  return results;
}


// ============================================================================
// 8. Webhook Receiver (for async processing)
// ============================================================================

/**
 * Example Express endpoint that receives a webhook, calculates fundability,
 * and posts results back to another system
 */
const express = require('express');
const app = express();

app.post('/webhook/calculate-fundability', async (req, res) => {
  // Acknowledge receipt immediately
  res.status(202).json({ status: 'processing' });

  // Process asynchronously
  try {
    const snapshot = await getFundabilitySnapshot(req.body);

    // Post results back to source system
    await fetch(req.body.callback_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: req.body.external_contact_id,
        fundability_data: snapshot
      })
    });
  } catch (error) {
    console.error('Async processing error:', error);
    // Could implement retry logic or error notification here
  }
});


// ============================================================================
// Export for use
// ============================================================================

module.exports = {
  getFundabilitySnapshot,
  hubspotWorkflowAction,
  processBatch
};
