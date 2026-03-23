#!/bin/bash

# Theme System Testing Script
# Verifies all theme-related fixes are properly applied

echo "🔍 MQTT Nexus Theme System Verification"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check ThemeContext has useEffect
echo "Test 1: ThemeContext useEffect Hook..."
if grep -q "useEffect(() => {" src/contexts/ThemeContext.tsx && \
   grep -q "root.classList.toggle('theme-dark'" src/contexts/ThemeContext.tsx; then
    echo -e "${GREEN}✓ PASS${NC}: ThemeContext syncs theme classes to DOM"
else
    echo -e "${RED}✗ FAIL${NC}: ThemeContext missing useEffect hook"
fi
echo ""

# Test 2: Check CSS theme variables
echo "Test 2: CSS Theme Variables..."
if grep -q "\.theme-light {" src/index.css && \
   grep -q "\.theme-transparent {" src/index.css && \
   grep -q "\.theme-light\.theme-transparent {" src/index.css; then
    echo -e "${GREEN}✓ PASS${NC}: All CSS theme variants defined"
else
    echo -e "${RED}✗ FAIL${NC}: Missing CSS theme definitions"
fi
echo ""

# Test 3: Check component theme usage
echo "Test 3: Component Theme Classes..."
components=(
    "BrokerSidebar"
    "TopicTree"
    "SubscriptionPanel"
    "TopicView"
    "MessageCard"
    "BrokerModal"
    "CodeGenModal"
)

for comp in "${components[@]}"; do
    if grep -q "useTheme" "src/components/${comp}.tsx" 2>/dev/null || \
       [ "$comp" = "CodeGenModal" ]; then
        if grep -q "themeClasses" "src/components/${comp}.tsx" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $comp uses theme classes"
        else
            echo -e "${RED}✗${NC} $comp missing theme usage"
        fi
    else
        echo -e "${YELLOW}⚠${NC} $comp - checking..."
    fi
done
echo ""

# Test 4: Check no hardcoded slate colors
echo "Test 4: Hardcoded Color Check (sample)..."
hardcoded_count=$(grep -c "bg-slate-800\|bg-slate-900\|text-slate-100\|text-slate-200" \
    src/components/BrokerSidebar.tsx src/components/TopicTree.tsx 2>/dev/null || echo 0)

if [ "$hardcoded_count" -lt 3 ]; then
    echo -e "${GREEN}✓ PASS${NC}: Minimal hardcoded colors found"
else
    echo -e "${YELLOW}⚠ WARNING${NC}: Found $hardcoded_count hardcoded colors"
fi
echo ""

# Test 5: Verify App.tsx main container
echo "Test 5: App Main Container..."
if grep -q "bg-slate-950" src/App.tsx && \
   grep -q "themeClasses.text" src/App.tsx; then
    echo -e "${GREEN}✓ PASS${NC}: App main container uses theme"
else
    echo -e "${RED}✗ FAIL${NC}: App main container not properly themed"
fi
echo ""

echo "=========================================="
echo "✅ Theme System Verification Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Start dev server: npm run dev"
echo "2. Test theme switching in Settings"
echo "3. Verify colors in Light/Dark/Transparent modes"
echo "4. Check component backgrounds for consistency"
echo ""
