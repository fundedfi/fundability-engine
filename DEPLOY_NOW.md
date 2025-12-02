# Deploy Your Fundability Engine NOW

## Option 1: Automated Deployment (Recommended)

```bash
cd fundability-engine
./scripts/deploy.sh
```

The script will:
1. ✓ Check Node.js version
2. ✓ Install dependencies
3. ✓ Compile TypeScript
4. ✓ Run all tests
5. ✓ Deploy to Vercel
6. ✓ Test the live endpoint

**Time: ~2 minutes**

---

## Option 2: Manual Deployment

```bash
# 1. Install Vercel CLI (if not installed)
npm install -g vercel

# 2. Deploy to production
vercel --prod

# 3. Test your endpoint
curl -X POST https://your-app.vercel.app/api/fs-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "credit_score": 720,
    "revolving_utilization_pct": 25,
    "dti_pct": 30,
    "inquiries_6m": 2,
    "oldest_account_years": 8,
    "open_tradelines": 5,
    "recent_derogs_24m": 0,
    "bk_or_major_event": false,
    "requested_amount": 150000,
    "primary_goal": "business_funding"
  }'
```

---

## After Deployment

### 1. Test the Web Interface
Visit: `https://your-app.vercel.app/test-interface.html`

### 2. Enable Webhooks (Optional)
Uncomment lines 48-71 in `api/fs-snapshot.ts` and set environment variables:
```bash
vercel env add SLACK_WEBHOOK_URL
vercel env add ENABLE_WEBHOOKS
```

### 3. Enable Analytics (Optional)
Uncomment lines 38-44 in `api/fs-snapshot.ts`

### 4. Integrate with Your Platform
See `examples/integrations.js` for:
- HubSpot workflows
- Airtable automations
- Google Sheets functions
- React components
- Zapier webhooks

---

## Quick Integration Examples

### HubSpot Workflow Webhook
```
URL: https://your-app.vercel.app/api/fs-snapshot
Method: POST
Headers: Content-Type: application/json
Body: {JSON from contact properties}
```

### React Component
```javascript
const response = await fetch('https://your-app.vercel.app/api/fs-snapshot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
const snapshot = await response.json();
```

### Zapier Integration
1. Add Webhooks by Zapier action
2. Set URL: https://your-app.vercel.app/api/fs-snapshot
3. Method: POST
4. Map fields from trigger

---

## Monitoring

View logs in real-time:
```bash
vercel logs --follow
```

View analytics at:
```
https://your-app.vercel.app/api/fs-analytics
```

---

## Tweak Scoring Weights

Edit `lib/scoring-engine.ts` lines 204-211:

```typescript
const weights = {
  credit: 0.30,       // Increase for credit-focused scoring
  utilization: 0.25,  // Increase for utilization sensitivity
  dti: 0.20,         // Adjust DTI importance
  inquiry: 0.10,     // Modify inquiry impact
  depthMix: 0.10,    // Change depth/mix weight
  penalty: 0.05      // Adjust penalty severity
};
```

After changes:
```bash
npm run build
vercel --prod
```

---

## Support Files

- `README.md` - Full API documentation
- `DEPLOYMENT.md` - Detailed deployment guide
- `QUICK_START.md` - 2-minute quick start
- `PROJECT_SUMMARY.md` - Complete system overview
- `docs/MONITORING.md` - Monitoring best practices
- `examples/integrations.js` - Integration code samples

---

## Need Help?

All 13 tests passing ✓
TypeScript compiled ✓
Production-ready ✓
Documentation complete ✓

**You're ready to deploy NOW!** 🚀
