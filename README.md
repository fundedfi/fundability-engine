# Fundability Snapshot™ Engine

A production-grade, stateless HTTP API that calculates fundability scores, risk assessments, and personalized funding recommendations based on credit + income + intent data.

## 🎯 Overview

The Fundability Snapshot Engine provides:
- **Fundability Score** (0-100) with tier classification
- **6 subscores** analyzing different credit/financial dimensions
- **AI-ready metadata** for future ML model integration
- **Actionable insights**: strengths, risks, and prioritized improvement actions
- **Funding estimates**: current vs. optimized potential

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Vercel account (for deployment)
- Git

### Local Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Test endpoint at http://localhost:3000/api/fs-snapshot
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
npm run deploy

# Or simply
vercel --prod
```

## 📡 API Endpoint

**POST** `/api/fs-snapshot`

**Content-Type:** `application/json`

### Request Example

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "credit_score": 680,
  "revolving_utilization_pct": 45,
  "dti_pct": 38,
  "inquiries_6m": 3,
  "oldest_account_years": 8,
  "open_tradelines": 7,
  "recent_derogs_24m": 0,
  "bk_or_major_event": false,
  "requested_amount": 75000,
  "primary_goal": "business_funding",
  "estimated_home_value": 350000,
  "mortgage_balance": 200000,
  "source": "hubspot_form",
  "external_contact_id": "hs_12345"
}
```

### Response Example

```json
{
  "fundability_score": 76,
  "fundability_tier_numeric": 2,
  "fundability_tier_label": "Tier 2 – Tune-Up Then Ready",
  "subscores": {
    "credit_score_subscore": 80,
    "utilization_subscore": 75,
    "dti_subscore": 70,
    "inquiry_subscore": 80,
    "depth_mix_subscore": 85,
    "penalty_points": 0
  },
  "key_strengths": [
    "Strong core credit score positioning you favorably with lenders",
    "Established credit history with good depth and account mix"
  ],
  "key_risks": [
    "High utilization is suppressing score and limiting available credit"
  ],
  "high_impact_actions": [
    "Pay down revolving balances to reduce utilization below 30% - current 45% is limiting approvals",
    "Target paying off 1-2 highest monthly payment accounts to improve DTI and boost approval odds"
  ],
  "funding_range_now": "Moderate ($25K–$75K)",
  "funding_range_after_optimization": "Moderate–High ($50K–$125K)",
  "goal_path": "Ready for unsecured business lines, equipment financing, and SBA products",
  "flags": {
    "missing_credit_score": false,
    "missing_utilization": false,
    "missing_dti": false,
    "high_risk_profile": false
  },
  "meta": {
    "version": "fs_engine_v1.0",
    "generated_at": "2025-01-24T10:30:00.000Z"
  }
}
```

## 🔧 Input Parameters

### Required Fields

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `first_name` | string | Contact first name | Required |
| `last_name` | string | Contact last name | Required |
| `email` | string | Contact email | Valid email format |
| `revolving_utilization_pct` | number | Credit utilization % | 0-100 |
| `open_tradelines` | integer | Number of open accounts | ≥0 |
| `requested_amount` | number | Desired funding amount | >0 |
| `primary_goal` | enum | Funding objective | See goal types |

### Optional with Defaults

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `credit_score` | number\|null | null | FICO score (300-850) |
| `dti_pct` | number\|null | null | Debt-to-income ratio % |
| `inquiries_6m` | integer | 0 | Credit inquiries (last 6mo) |
| `oldest_account_years` | number | 0 | Age of oldest account |
| `recent_derogs_24m` | integer | 0 | Recent derogatory marks |
| `bk_or_major_event` | boolean | false | BK/foreclosure/judgment |

### Primary Goal Types

- `startup_funding`
- `business_funding`
- `debt_consolidation`
- `improve_credit`
- `lower_utilization`
- `raise_score_fast`
- `not_sure`

## 📊 Scoring Logic

### Subscore Weights

| Component | Weight | Purpose |
|-----------|--------|---------|
| Credit Score | 30% | Core creditworthiness |
| Utilization | 25% | Revolving debt management |
| DTI Ratio | 20% | Overall debt burden |
| Inquiries | 10% | Recent credit-seeking behavior |
| Depth/Mix | 10% | Credit history maturity |
| Penalties | 5% | Derogatory events impact |

### Tier System

| Score | Tier | Label | Meaning |
|-------|------|-------|---------|
| 85-100 | 1 | Ready Now (Prime) | Immediate funding eligibility |
| 70-84 | 2 | Tune-Up Then Ready | Minor optimizations needed |
| 55-69 | 3 | Optimization Required | Strategic improvements needed |
| 0-54 | 4 | Rehab / Long-Term Plan | Significant rebuilding required |

## 🏗️ Architecture

```
fundability-engine/
├── api/
│   └── fs-snapshot.ts          # Serverless endpoint
├── lib/
│   ├── validation.ts            # Input validation + types
│   └── scoring-engine.ts        # Core scoring logic
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

### Design Principles

1. **Stateless** - No database required, pure calculation
2. **Modular** - Scoring logic isolated for ML replacement
3. **Type-safe** - Full TypeScript with strict mode
4. **Fast** - <500ms response time
5. **Predictable** - Deterministic outputs for same inputs

## 🔄 Future ML Integration

The engine is architected for seamless ML model integration:

```typescript
// Current: Rules-based
const snapshot = calculateFundabilitySnapshot(input);

// Future: ML-augmented
const snapshot = await calculateMLFundabilitySnapshot(input, {
  useMLScoring: true,
  fallbackToRules: true
});
```

**Preservation:**
- Same input/output contract
- All metadata fields maintained
- Validation layer unchanged
- API endpoint signature identical

## 🧪 Testing

### Manual Testing

```bash
curl -X POST https://your-app.vercel.app/api/fs-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@test.com",
    "credit_score": 720,
    "revolving_utilization_pct": 25,
    "dti_pct": 30,
    "inquiries_6m": 1,
    "oldest_account_years": 10,
    "open_tradelines": 8,
    "recent_derogs_24m": 0,
    "bk_or_major_event": false,
    "requested_amount": 50000,
    "primary_goal": "business_funding"
  }'
```

### Test Cases

See `/tests/test-cases.json` for comprehensive scenarios including:
- Tier 1 (Prime) profiles
- Tier 4 (Rehab) profiles
- Edge cases (null values, high utilization)
- Goal-specific pathways

## 🔐 Security Considerations

1. **No PII storage** - Stateless API doesn't persist data
2. **Input sanitization** - Strict validation prevents injection
3. **Rate limiting** - Implement via Vercel Edge Config
4. **CORS** - Configure allowed origins in production
5. **Authentication** - Add JWT/API key layer before production

## 📈 Performance

- **Cold start:** <800ms
- **Warm request:** <200ms
- **Memory:** ~50MB per invocation
- **Concurrency:** Unlimited (serverless)

## 🚨 Error Handling

### Validation Errors (400)

```json
{
  "error": "Validation failed",
  "details": [
    "credit_score must be between 300 and 850, or null",
    "email is required and must be a valid email address"
  ]
}
```

### Server Errors (500)

```json
{
  "error": "Internal server error",
  "details": ["An unexpected error occurred processing your request"]
}
```

## 🔗 Integration Examples

### HubSpot Webhook

```javascript
// Trigger on form submission
const response = await fetch('https://your-engine.vercel.app/api/fs-snapshot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...formData,
    source: 'hubspot_form',
    external_contact_id: contact.vid
  })
});

const snapshot = await response.json();

// Update HubSpot contact properties
await updateContact(contact.vid, {
  fundability_score: snapshot.fundability_score,
  fundability_tier: snapshot.fundability_tier_label,
  // ... other fields
});
```

### Google Sheets (Apps Script)

```javascript
function calculateFundability() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const payload = {
      first_name: data[i][0],
      // ... map other columns
    };
    
    const response = UrlFetchApp.fetch('https://your-engine.vercel.app/api/fs-snapshot', {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
    
    const result = JSON.parse(response.getContentText());
    
    // Write score back to sheet
    sheet.getRange(i + 1, 15).setValue(result.fundability_score);
  }
}
```

## 📝 Changelog

### v1.0.0 (2025-01-24)
- Initial production release
- Rules-based scoring engine
- 6 subscores + weighted calculation
- Tier classification (1-4)
- Dynamic action generation
- Funding range estimation
- Goal-specific pathways

## 📄 License

Proprietary - StackLoans Platform
© 2025 All Rights Reserved

## 🤝 Support

For questions or issues:
- Platform documentation: [Internal wiki]
- Technical lead: [Contact info]
- Emergency: [On-call rotation]
