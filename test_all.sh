#!/bin/bash
set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}   🎼 SIGHT-READER COMPREHENSIVE TEST SUITE 🎼      ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"
echo ""

echo -e "${CYAN}${BOLD}[1/4] Environment Check...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ node_modules found.${NC}"
else
    echo -e "${YELLOW}! node_modules not found. Installing...${NC}"
    npm install
fi

echo ""
echo -e "${CYAN}${BOLD}[2/4] Running Unit & Integration Tests...${NC}"
echo -e "${BOLD}This includes unit, integration, UI, and regression tests.${NC}"
echo ""

# Run vitest with verbose reporter to show progress as it runs
if npx vitest run --reporter=verbose; then
    echo ""
    echo -e "${CYAN}${BOLD}[3/4] Running End-to-End (E2E) Tests...${NC}"
    echo -e "${BOLD}Running Playwright tests in headless mode.${NC}"
    echo ""
    
    if npx playwright test; then
        echo ""
        echo -e "${CYAN}${BOLD}[4/4] Final Verification...${NC}"
        echo -e "${GREEN}${BOLD}✓ ALL TESTS PASSED SUCCESSFULLY!${NC}"
        echo ""
        echo -e "${BLUE}${BOLD}====================================================${NC}"
        echo -e "${GREEN}   Project is stable and ready for use. Happy coding!${NC}"
        echo -e "${BLUE}${BOLD}====================================================${NC}"
    else
        echo ""
        echo -e "\033[0;31m${BOLD}✗ E2E TESTS FAILED!${NC}"
        echo ""
        exit 1
    fi
else
    echo ""
    echo -e "${CYAN}${BOLD}[4/4] Final Verification...${NC}"
    echo -e "\033[0;31m${BOLD}✗ SOME UNIT/INTEGRATION TESTS FAILED!${NC}"
    echo ""
    exit 1
fi
