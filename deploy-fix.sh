#!/bin/bash
# Deployment Script for Black Screen Fix
# Made With Love By SirAbody

echo "==================================="
echo "🚀 SaudiCord Production Fix Deploy"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Building client...${NC}"
cd client && npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Client build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Client build successful${NC}"

cd ..

echo -e "${YELLOW}📝 Committing changes...${NC}"
git add -A
git commit -m "Fix: Comprehensive black screen fix after login

- Fixed Socket.io CORS configuration for production
- Added non-blocking socket authentication
- Improved static file serving with explicit routes
- Fixed catch-all route ordering (moved before error handlers)
- Added ErrorBoundary component in React app
- Added auth check timeout (10 seconds)
- Improved error handling in authStore
- Added request ID logging for debugging
- Created production config file
- Added graceful fallback HTML when build not found
- Enhanced server startup with better error handling

Users can now login successfully without black screen issues."

echo -e "${YELLOW}🔄 Pushing to GitHub...${NC}"
git push origin master

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}"
    echo -e "${GREEN}🎉 Render will automatically deploy from GitHub${NC}"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Check Render dashboard for deployment progress"
    echo "2. Monitor logs at: https://dashboard.render.com"
    echo "3. Test login at: https://saudicord.onrender.com"
    echo ""
    echo "Test accounts:"
    echo "- Admin: username='admin', password='admin509'"
    echo "- User: username='Liongtas', password='Lion509'"
else
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    exit 1
fi

echo -e "${GREEN}💝 Made With Love By SirAbody${NC}"
