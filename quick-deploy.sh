#!/bin/bash

# Quick Deploy Script for Zen Journal Stack
# This script helps you deploy quickly with interactive prompts

echo "🚀 Zen Journal Stack - Quick Deploy Helper"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will help you deploy your application.${NC}"
echo ""

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ Error: render.yaml not found. Run this script from zen-journal-stack directory"
    exit 1
fi

echo "📝 Step 1: Update Configuration Files"
echo "-----------------------------------"
echo ""

# Ask for Render service name
read -p "Enter your Render service URL (e.g., zen-journal-backend.onrender.com): " RENDER_URL

if [ -z "$RENDER_URL" ]; then
    echo "❌ Render URL is required"
    exit 1
fi

# Add https:// if not present
if [[ ! $RENDER_URL == https://* ]]; then
    RENDER_URL="https://$RENDER_URL"
fi

# Ask for Vercel app name
read -p "Enter your Vercel app URL (e.g., my-journal-app.vercel.app): " VERCEL_URL

if [ -z "$VERCEL_URL" ]; then
    echo "❌ Vercel URL is required"
    exit 1
fi

# Add https:// if not present
if [[ ! $VERCEL_URL == https://* ]]; then
    VERCEL_URL="https://$VERCEL_URL"
fi

echo ""
echo -e "${GREEN}✓ Configuration collected${NC}"
echo ""

# Update render.yaml
echo "📝 Updating render.yaml..."

# For macOS (BSD sed) and Linux (GNU sed) compatibility
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|https://YOUR-VERCEL-APP.vercel.app|$VERCEL_URL|g" render.yaml
    sed -i '' "s|https://YOUR-RENDER-SERVICE.onrender.com|$RENDER_URL|g" render.yaml
else
    # Linux
    sed -i "s|https://YOUR-VERCEL-APP.vercel.app|$VERCEL_URL|g" render.yaml
    sed -i "s|https://YOUR-RENDER-SERVICE.onrender.com|$RENDER_URL|g" render.yaml
fi

echo -e "${GREEN}✓ render.yaml updated${NC}"
echo ""

echo "📋 Next Steps:"
echo "-------------"
echo ""
echo "1. Backend Deployment (Render):"
echo "   • Go to https://render.com"
echo "   • Create a new Web Service"
echo "   • Connect your GitHub repository"
echo "   • Render will use the render.yaml configuration"
echo "   • Or manually configure with:"
echo "     - Root Directory: zen-journal-stack/backend"
echo "     - Build Command: npm install && npx prisma generate && npx prisma migrate deploy"
echo "     - Start Command: npm start"
echo ""

echo "2. Frontend Deployment (Vercel):"
echo "   • Go to https://vercel.com"
echo "   • Import your GitHub repository"
echo "   • Set Root Directory: zen-journal-stack/frontend"
echo "   • Add environment variable:"
echo "     NEXT_PUBLIC_API_URL=$RENDER_URL/api"
echo ""

echo "3. After Deployment:"
echo "   • Update CORS_ORIGIN on Render to: $VERCEL_URL"
echo "   • Test your application"
echo ""

echo -e "${YELLOW}💡 Tip: Run './deploy-check.sh' to verify your setup before deploying${NC}"
echo ""

# Ask if user wants to commit changes
read -p "Do you want to commit these changes to git? (y/n): " COMMIT_CHOICE

if [ "$COMMIT_CHOICE" = "y" ] || [ "$COMMIT_CHOICE" = "Y" ]; then
    cd ..
    git add zen-journal-stack/render.yaml
    git commit -m "Configure deployment URLs"
    echo -e "${GREEN}✓ Changes committed${NC}"
    echo ""
    read -p "Push to GitHub? (y/n): " PUSH_CHOICE
    if [ "$PUSH_CHOICE" = "y" ] || [ "$PUSH_CHOICE" = "Y" ]; then
        git push
        echo -e "${GREEN}✓ Changes pushed to GitHub${NC}"
    fi
    cd zen-journal-stack
fi

echo ""
echo -e "${GREEN}✓ Setup complete! Follow the next steps above to deploy.${NC}"
