# Fundability Snapshot Engine - Quick Start

## ✅ Your API is Built and Tested!

All 13 test cases passed with 100% success rate. The engine is production-ready.

## 🚀 Deploy in 3 Steps (2 minutes)

### 1. Open Terminal in Project Directory
```bash
cd /home/claude/fundability-engine
```

### 2. Login to Vercel
```bash
npx vercel login
# Follow the prompts to authenticate
```

### 3. Deploy
```bash
npx vercel --prod
```

**That's it!** You'll get a URL like: `https://fundability-engine.vercel.app`

## 📡 Test Your Live API

Once deployed, test with curl:

```bash
curl -X POST https://YOUR-URL.vercel.app/api/fs-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
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

## 🎯 What You Get

### Input
Just 13 data points about a client's credit/financial profile

### Output
- **Fundability Score** (0-100)
- **Tier Classification** (1-4)
- **6 Subscores** (credit, utilization, DTI, inquiries, depth/mix, penalties)
- **Key Strengths** (2-3 bullets)
- **Key Risks** (2-3 bullets)
- **High-Impact Actions** (3-5 prioritized recommendations)
- **Funding Ranges** (now vs optimized)
- **Goal-Specific Pathway**

## 📊 Real Test Results

```
✅ Tier 1 (Prime) profiles: Working perfectly
✅ Tier 2 (Tune-up): Working perfectly  
✅ Tier 3 (Optimization needed): Working perfectly
✅ Tier 4 (Rehab): Working perfectly
✅ Edge cases (nulls, minimums, maximums): All handled
✅ Validation errors: Proper error messages returned
```

## 🔌 Integration Options

### Option 1: HubSpot Webhook
Point your HubSpot workflow webhook to:
```
POST https://YOUR-URL.vercel.app/api/fs-snapshot
```

### Option 2: Airtable Automation
Use the script in `/examples/integrations.js`

### Option 3: Google Sheets
Add the Apps Script function from `/examples/integrations.js`

### Option 4: Direct API Call
```javascript
const response = await fetch('https://YOUR-URL.vercel.app/api/fs-snapshot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(clientData)
});
const snapshot = await response.json();
```

## 📁 Project Structure

```
fundability-engine/
├── api/fs-snapshot.ts          # Main endpoint ✅
├── lib/
│   ├── validation.ts            # Input validation ✅
│   └── scoring-engine.ts        # Core logic ✅
├── tests/
│   ├── test-cases.json          # 13 test scenarios
│   └── test-runner.js           # Test suite
├── examples/integrations.js     # Integration code
├── README.md                    # Full documentation
├── DEPLOYMENT.md                # Detailed deploy guide
└── QUICK_START.md              # This file
```

## 🎨 Customization

### Adjust Scoring Weights
Edit `lib/scoring-engine.ts`, line ~150:
```typescript
const weights = {
  credit: 0.30,      // Adjust these
  utilization: 0.25,
  dti: 0.20,
  // ...
};
```

### Modify Tier Thresholds
Edit `lib/scoring-engine.ts`, line ~170:
```typescript
if (score >= 85) return { numeric: 1, label: 'Tier 1' };
// Adjust cutoffs here
```

### Change Action Priorities
Edit `lib/scoring-engine.ts`, function `generateHighImpactActions()`

After changes:
```bash
npm run build
npx vercel --prod
```

## 🔐 Add Authentication (Optional)

Add to `api/fs-snapshot.ts`:
```typescript
const apiKey = req.headers['x-api-key'];
if (apiKey !== process.env.API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

Then in Vercel dashboard:
1. Go to Settings > Environment Variables
2. Add: `API_KEY` = `your-secret-key`
3. Redeploy

Clients must include:
```
X-API-Key: your-secret-key
```

## 📈 Next Steps

### Immediate (Today)
1. ✅ Deploy to Vercel
2. ✅ Test with curl
3. ✅ Share URL with team

### This Week
1. Integrate with HubSpot/Airtable
2. Set up monitoring in Vercel dashboard
3. Add custom domain (optional)

### This Month
1. Collect feedback on scoring accuracy
2. Tune weights/thresholds based on real data
3. Build ML model training pipeline

## 💡 Pro Tips

### Tip 1: Version Your API
Create `/api/v2/fs-snapshot.ts` when making breaking changes

### Tip 2: Log Everything (Initially)
Add to the handler:
```typescript
console.log('Request:', req.body.email);
console.log('Result:', snapshot.fundability_score);
```
View logs: Vercel Dashboard > Your Project > Logs

### Tip 3: Create Webhooks for Async
See `/examples/integrations.js` for async webhook pattern

### Tip 4: Batch Processing
Use the `processBatch()` function in `/examples/integrations.js`

## 🆘 Troubleshooting

**Can't deploy?**
```bash
# Check you're in the right directory
pwd  # Should be fundability-engine

# Check you're logged in
npx vercel whoami

# Try deploying again
npx vercel --prod
```

**API returns 404?**
- Check the endpoint path: `/api/fs-snapshot`
- Wait 30 seconds after deploy for propagation

**Validation errors?**
- Ensure numeric fields are numbers, not strings
- Required fields: first_name, last_name, email, revolving_utilization_pct, open_tradelines, requested_amount, primary_goal

## 📞 Support Resources

- **Full Documentation**: README.md
- **Deployment Guide**: DEPLOYMENT.md
- **Integration Examples**: examples/integrations.js
- **Test Cases**: tests/test-cases.json
- **Vercel Docs**: https://vercel.com/docs

---

## ✨ You're Ready!

Your fundability engine is:
- ✅ Built
- ✅ Tested (100% pass rate)
- ✅ Documented
- ✅ Ready to deploy

Time to deployment: **~2 minutes**
Time to first integration: **~15 minutes**

**Deploy now:**
```bash
npx vercel --prod
```
