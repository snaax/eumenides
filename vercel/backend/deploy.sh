#!/bin/bash

# Eumenides Premium Backend - Vercel Deployment Script

echo "🚀 Eumenides Premium Backend - Vercel Deployment"
echo "================================================"
echo ""

# Check if logged in
echo "📝 Step 1: Checking Vercel authentication..."
if ! npx vercel whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to Vercel"
    echo "Please run: npx vercel login"
    exit 1
fi

echo "✅ Logged in as: $(npx vercel whoami)"
echo ""

# Deploy
echo "📦 Step 2: Deploying to Vercel..."
echo ""

# First deployment (will prompt for project setup)
npx vercel

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables (see below)"
echo "2. Deploy to production: npx vercel --prod"
echo "3. Configure Stripe webhook"
echo ""
echo "Environment variables needed:"
echo "  - DATABASE_URL (from Supabase)"
echo "  - STRIPE_SECRET_KEY (from Stripe)"
echo "  - STRIPE_WEBHOOK_SECRET (from Stripe after webhook setup)"
echo "  - STRIPE_PRICE_ID (from Stripe)"
echo "  - ALLOWED_ORIGINS (your Chrome extension ID)"
echo ""
echo "Set them with:"
echo "  npx vercel env add DATABASE_URL production"
echo "  npx vercel env add STRIPE_SECRET_KEY production"
echo "  npx vercel env add STRIPE_WEBHOOK_SECRET production"
echo "  npx vercel env add STRIPE_PRICE_ID production"
echo "  npx vercel env add ALLOWED_ORIGINS production"
