#!/bin/bash

# AgenticAiHome Test Suite Runner
# 
# Runs the complete test suite with proper environment setup
# 
# Usage:
#   ./tests/run.sh
#   chmod +x tests/run.sh && ./tests/run.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 AgenticAiHome Test Suite${NC}"
echo "=================================="

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}❌ Error: Not in project root directory${NC}"
    echo "Please run this script from the agenticaihome project root"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    echo "Please install Node.js to run the tests"
    exit 1
fi

# Check if tsx is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ Error: npx is not available${NC}"
    echo "Please install npm to run the tests"
    exit 1
fi

echo -e "${BLUE}📦 Checking dependencies...${NC}"

# Check if tsx is installed (needed to run TypeScript directly)
if ! npx tsx --version &> /dev/null; then
    echo -e "${YELLOW}⚠️  tsx not found, installing...${NC}"
    npm install -D tsx
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"

# Set NODE_ENV to test
export NODE_ENV=test

echo -e "${BLUE}🚀 Starting test suite...${NC}"
echo ""

# Run the test suite
if npx tsx tests/run.ts; then
    echo ""
    echo -e "${GREEN}🎉 Test suite completed successfully!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}💥 Test suite failed!${NC}"
    exit 1
fi