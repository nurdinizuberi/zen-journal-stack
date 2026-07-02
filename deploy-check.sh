#!/bin/bash

# Deployment Pre-flight Check Script
# Run this before deploying to catch common issues

echo "🔍 Zen Journal Stack - Deployment Pre-flight Check"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}❌ Error: render.yaml not found. Run this script from zen-journal-stack directory${NC}"
    exit 1
fi

echo "📦 Checking Backend..."
echo "-------------------"

# Check backend dependencies
if [ -f "backend/package.json" ]; then
    echo -e "${GREEN}✓${NC} backend/package.json exists"
    
    # Check for required dependencies
    if grep -q "\"express\"" backend/package.json; then
        echo -e "${GREEN}✓${NC} Express dependency found"
    else
        echo -e "${RED}✗${NC} Express dependency missing"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "\"@prisma/client\"" backend/package.json; then
        echo -e "${GREEN}✓${NC} Prisma client dependency found"
    else
        echo -e "${RED}✗${NC} Prisma client dependency missing"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} backend/package.json not found"
    ERRORS=$((ERRORS + 1))
fi

# Check Prisma schema
if [ -f "backend/prisma/schema.prisma" ]; then
    echo -e "${GREEN}✓${NC} Prisma schema exists"
else
    echo -e "${RED}✗${NC} Prisma schema not found"
    ERRORS=$((ERRORS + 1))
fi

# Check for .env file (should not be committed)
if [ -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠${NC}  backend/.env exists (ensure it's in .gitignore)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check for .env.example
if [ -f "backend/.env.example" ]; then
    echo -e "${GREEN}✓${NC} backend/.env.example exists"
else
    echo -e "${YELLOW}⚠${NC}  backend/.env.example not found (recommended)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "🎨 Checking Frontend..."
echo "--------------------"

# Check frontend dependencies
if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✓${NC} frontend/package.json exists"
    
    if grep -q "\"next\"" frontend/package.json; then
        echo -e "${GREEN}✓${NC} Next.js dependency found"
    else
        echo -e "${RED}✗${NC} Next.js dependency missing"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC} frontend/package.json not found"
    ERRORS=$((ERRORS + 1))
fi

# Check for .env.example
if [ -f "frontend/.env.example" ]; then
    echo -e "${GREEN}✓${NC} frontend/.env.example exists"
else
    echo -e "${YELLOW}⚠${NC}  frontend/.env.example not found (recommended)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "🔧 Checking Configuration Files..."
echo "--------------------------------"

# Check render.yaml
if [ -f "render.yaml" ]; then
    echo -e "${GREEN}✓${NC} render.yaml exists"
    
    if grep -q "YOUR-VERCEL-APP" render.yaml; then
        echo -e "${YELLOW}⚠${NC}  render.yaml contains placeholder URLs (update before deploying)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC}  render.yaml not found (optional)"
    WARNINGS=$((WARNINGS + 1))
fi

# Check vercel.json
if [ -f "frontend/vercel.json" ]; then
    echo -e "${GREEN}✓${NC} frontend/vercel.json exists"
else
    echo -e "${YELLOW}⚠${NC}  frontend/vercel.json not found (optional)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "📝 Checking Git Status..."
echo "-----------------------"

# Check if git is initialized
if [ -d "../.git" ]; then
    echo -e "${GREEN}✓${NC} Git repository initialized"
    
    # Check for uncommitted changes
    cd ..
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠${NC}  You have uncommitted changes"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✓${NC} No uncommitted changes"
    fi
    cd zen-journal-stack
else
    echo -e "${YELLOW}⚠${NC}  Git repository not initialized"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "=================================================="
echo "📊 Summary"
echo "=================================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to deploy! 🚀${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found. Review before deploying.${NC}"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo -e "${RED}Please fix errors before deploying.${NC}"
    exit 1
fi
