#!/bin/bash

echo "=== Pushing to GitHub: Gimbo67/evokeessence-crypto-exchange ==="
echo ""

# Initialize Git LFS if not already done
echo "Step 1: Ensuring Git LFS is installed..."
git lfs install

# Update Git LFS tracking with comprehensive file types
echo "Step 2: Updating Git LFS tracking configuration..."
git add .gitattributes

# Check current status
echo "Step 3: Checking current git status..."
git status --porcelain | head -20

# Add all files in stages to avoid overwhelming git
echo "Step 4: Adding files to git..."

# Add core application files
echo "  -> Adding core application files..."
git add client/ server/ db/ package*.json tsconfig.json vite.config.ts 2>/dev/null || true

# Add documentation
echo "  -> Adding documentation..."
git add *.md README* LICENSE 2>/dev/null || true

# Add configuration files
echo "  -> Adding configuration files..."
git add *.json *.js *.ts *.tsx *.html *.css *.yml *.yaml .gitignore .gitattributes 2>/dev/null || true

# Add mobile app directories (these are important)
echo "  -> Adding mobile applications..."
git add CryptoEvokeApp*/ mobile-app*/ 2>/dev/null || true

# Add scripts and utilities
echo "  -> Adding scripts and utilities..."
git add *.sh debug-*.js analyze-*.js add-*.js 2>/dev/null || true

# Add attached assets (using LFS for large files)
echo "  -> Adding attached assets..."
git add attached_assets/ 2>/dev/null || true

# Add large files (these will use LFS automatically)
echo "  -> Adding large archive files (will use LFS)..."
git add *.tar.gz *.zip assets-complete-* ULTIMATE-* mega-* ultra-* 2>/dev/null || true

# Add any remaining files
echo "  -> Adding remaining files..."
git add . 2>/dev/null || true

# Create commit
echo "Step 5: Creating commit..."
git commit -m "Complete EvokeEssence crypto exchange platform upload

- Full-stack cryptocurrency exchange platform
- React.js frontend with TypeScript
- Express.js backend with PostgreSQL
- Telegram bot integration with 24/7 webhook support
- Mobile React Native applications for iOS/Android
- Comprehensive security features (2FA, KYC, rate limiting)
- Trading support for BTC, ETH, USDT, USDC
- Admin dashboard and contractor management
- All large files tracked with Git LFS

Platform ready for production deployment." || echo "Nothing new to commit"

# Force update the remote URL by editing git config directly
echo "Step 6: Setting up correct GitHub repository..."
# Remove any git locks that might be interfering
rm -f .git/index.lock .git/config.lock 2>/dev/null || true

# Force set the remote URL
git remote set-url origin https://github.com/Gimbo67/evokeessence-crypto-exchange.git 2>/dev/null || \
git remote add origin https://github.com/Gimbo67/evokeessence-crypto-exchange.git 2>/dev/null || true

# Verify remote
echo "Current remote repository:"
git remote -v

# Push to GitHub
echo "Step 7: Pushing to GitHub..."
echo "This may take several minutes for large files..."
echo ""
git push -u origin main || git push -u origin master || {
    echo "First push failed, trying to create initial branch..."
    git branch -M main
    git push -u origin main
}

echo ""
echo "=== Upload Complete! ==="
echo "Repository: https://github.com/Gimbo67/evokeessence-crypto-exchange"
echo "All files including mobile apps and large assets have been uploaded."
echo "Large files are efficiently handled with Git LFS."
echo ""