#!/bin/bash

# Push to GitHub - fundedfi/fundability-engine
# Run this after creating the repo on GitHub

echo "🚀 Pushing Fundability Engine to GitHub..."
echo ""

# Check if remote already exists
if git remote | grep -q "origin"; then
    echo "✓ Remote 'origin' already configured"
else
    echo "Adding remote 'origin'..."
    git remote add origin https://github.com/fundedfi/fundability-engine.git
    echo "✓ Remote added"
fi

echo ""
echo "Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code is on GitHub"
    echo ""
    echo "📦 Repository: https://github.com/fundedfi/fundability-engine"
    echo ""
    echo "Next steps:"
    echo "1. Visit your repo: https://github.com/fundedfi/fundability-engine"
    echo "2. Deploy to Vercel: cd /home/claude/fundability-engine && ./scripts/deploy.sh"
    echo "3. Connect Vercel to your GitHub repo for auto-deploys"
else
    echo ""
    echo "❌ Push failed. Please check your GitHub credentials."
    echo ""
    echo "To authenticate:"
    echo "1. Create a Personal Access Token at: https://github.com/settings/tokens"
    echo "2. Run: git remote set-url origin https://<YOUR_TOKEN>@github.com/fundedfi/fundability-engine.git"
    echo "3. Run this script again: ./scripts/push-to-github.sh"
fi
