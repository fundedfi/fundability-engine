# Fundability Snapshot Engine - Deployment Guide

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Git installed and configured
- [ ] Vercel account created (free tier works)
- [ ] GitHub repository created (optional but recommended)

## 🚀 Quick Deploy (5 minutes)

### Option 1: Direct Vercel Deploy (Fastest)

```bash
# 1. Navigate to project directory
cd fundability-engine

# 2. Install dependencies
npm install

# 3. Login to Vercel
npx vercel login

# 4. Deploy
npx vercel --prod
```

That's it! Your API will be live at `https://your-project.vercel.app/api/fs-snapshot`

### Option 2: Deploy from GitHub (Recommended for CI/CD)

```bash
# 1. Initialize git and push to GitHub
git init
git add .
git commit -m "Initial commit: Fundability Snapshot Engine"
git remote add origin https://github.com/YOUR_USERNAME/fundability-engine.git
git push -u origin main

# 2. Connect to Vercel
# - Go to https://vercel.com/new
# - Import your GitHub repository
# - Vercel will auto-detect the project and deploy
# - Every push to main will auto-deploy
```

## 🧪 Testing Your Deployment

### Test with cURL

```bash
# Replace YOUR_URL with your actual Vercel URL
curl -X POST https://YOUR_URL.vercel.app/api/fs-snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
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

### Test with Postman

1. Create new request
2. Method: POST
3. URL: `https://YOUR_URL.vercel.app/api/fs-snapshot`
4. Headers: `Content-Type: application/json`
5. Body: Raw JSON (use example from test-cases.json)
6. Send!

### Test with JavaScript

```javascript
fetch('https://YOUR_URL.vercel.app/api/fs-snapshot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    credit_score: 680,
    revolving_utilization_pct: 35,
    dti_pct: 32,
    inquiries_6m: 2,
    oldest_account_years: 5,
    open_tradelines: 6,
    recent_derogs_24m: 0,
    bk_or_major_event: false,
    requested_amount: 40000,
    primary_goal: 'startup_funding'
  })
})
.then(r => r.json())
.then(data => console.log('Fundability Score:', data.fundability_score));
```

## 🔧 Configuration

### Environment Variables (Optional)

Create `.env` file for local development:

```env
# Optional: Add authentication
API_KEY=your-secret-key-here

# Optional: Enable detailed logging
DEBUG=true

# Optional: CORS allowed origins
ALLOWED_ORIGINS=https://yourapp.com,https://staging.yourapp.com
```

To use environment variables in Vercel:
1. Go to project settings in Vercel dashboard
2. Navigate to "Environment Variables"
3. Add your variables for Production/Preview/Development

### Custom Domain

1. Go to Vercel dashboard > Your Project > Settings > Domains
2. Add your custom domain (e.g., `api.yourdomain.com`)
3. Follow DNS configuration instructions
4. Update your integration endpoints to use custom domain

## 📊 Monitoring & Analytics

### Vercel Analytics (Built-in)

- Real-time function invocations
- Error tracking
- Performance metrics
- Available in Vercel dashboard

### Add Custom Logging

Update `api/fs-snapshot.ts`:

```typescript
// Add at the top of handler
console.log('Fundability request:', {
  email: req.body.email,
  timestamp: new Date().toISOString()
});

// Add before return
console.log('Fundability result:', {
  email: validationResult.data.email,
  score: snapshot.fundability_score,
  tier: snapshot.fundability_tier_numeric
});
```

View logs in Vercel dashboard or via CLI:
```bash
vercel logs YOUR_PROJECT_NAME
```

## 🔐 Adding Authentication (Optional)

### Option 1: API Key Authentication

Update `api/fs-snapshot.ts`:

```typescript
// Add at top of handler function
const apiKey = req.headers['x-api-key'];
if (!process.env.API_KEY || apiKey !== process.env.API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

Then add to Vercel environment variables:
```
API_KEY=your-secure-random-key-here
```

Clients must include header:
```
X-API-Key: your-secure-random-key-here
```

### Option 2: JWT Authentication

Install dependencies:
```bash
npm install jsonwebtoken
```

Add verification middleware (see examples/auth.js)

## 🔄 Continuous Deployment

### Automatic Deployments

With GitHub integration:
- **Push to main** → Auto-deploy to production
- **Pull requests** → Preview deployments
- **Commits** → Automatic builds

### Manual Deployments

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Promote preview to production
vercel promote
```

## 📈 Scaling Considerations

### Current Setup (Free Tier)
- 100GB bandwidth/month
- 100 hours serverless execution/month
- Unlimited API requests (within execution time)
- ~1000 requests/day comfortably

### Optimization Tips

1. **Enable Edge Caching** (if response is static for same input):
```typescript
res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
```

2. **Rate Limiting** - Add Vercel Edge Config:
```typescript
import { get } from '@vercel/edge-config';

// Check rate limit
const rateLimitKey = req.headers['x-forwarded-for'] || 'default';
// Implement rate limiting logic
```

3. **Error Tracking** - Integrate Sentry:
```bash
npm install @sentry/node
```

## 🚨 Troubleshooting

### Common Issues

**Error: "Module not found"**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
vercel --prod
```

**Error: "Function timeout"**
- Default timeout is 10s (sufficient for this API)
- Check for infinite loops in scoring logic
- Review console logs in Vercel dashboard

**Error: "CORS blocked"**
Add to `api/fs-snapshot.ts`:
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

**Validation errors in production**
- Check JSON formatting
- Verify numeric fields are numbers, not strings
- Review required fields in documentation

## 🔄 Updating the Engine

```bash
# 1. Make changes to code
# 2. Test locally
npm run dev

# 3. Commit changes
git add .
git commit -m "Update: description of changes"

# 4. Push (auto-deploys if GitHub connected)
git push origin main

# Or manual deploy
vercel --prod
```

## 📞 Support & Next Steps

### After Deployment

1. **Document your URL** - Save API endpoint for team
2. **Test all scenarios** - Run through test-cases.json
3. **Integrate** - Connect to HubSpot/Airtable/etc.
4. **Monitor** - Check logs first few days
5. **Iterate** - Adjust scoring rules based on feedback

### Enhancement Ideas

- [ ] Add webhook callbacks for async processing
- [ ] Implement result caching for duplicate requests
- [ ] Build admin dashboard for score analytics
- [ ] Add PDF report generation endpoint
- [ ] Create partner API with usage tracking
- [ ] Integrate with credit bureau APIs
- [ ] Build ML model to replace rules engine

### Resources

- **Vercel Docs**: https://vercel.com/docs
- **API Documentation**: See README.md
- **Test Cases**: tests/test-cases.json
- **Integration Examples**: examples/integrations.js

---

## ✅ Deployment Checklist

- [ ] Code deployed to Vercel
- [ ] Test endpoint with cURL successful
- [ ] All test cases pass
- [ ] Custom domain configured (if applicable)
- [ ] Environment variables set
- [ ] Monitoring/logging enabled
- [ ] Authentication added (if required)
- [ ] Team notified of new API endpoint
- [ ] Integration code updated with production URL
- [ ] Documentation shared with stakeholders

---

**Deployment Time**: ~5 minutes  
**First integration**: ~15 minutes  
**Full platform integration**: ~1-2 hours

**You're ready to go! 🎉**
