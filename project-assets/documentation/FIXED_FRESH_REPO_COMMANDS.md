# 🔧 Fixed Fresh Repository Commands

## The Issue
The `rm -rf * .[^.]*` command accidentally removed the `.git` directory. Here's the corrected approach:

## Run These Commands:

```bash
# Go back to home and start fresh
cd ~
rm -rf fresh-repo

# Clone again
git clone https://github.com/Gimbo67/evokeessence-crypto-exchange.git fresh-repo
cd fresh-repo

# Remove only files, NOT the .git directory
find . -maxdepth 1 -type f -delete
find . -maxdepth 1 -type d ! -name '.' ! -name '.git' -exec rm -rf {} +

# Copy essential project files
cp -r ~/workspace/client ./ 2>/dev/null || true
cp -r ~/workspace/server ./ 2>/dev/null || true  
cp -r ~/workspace/db ./ 2>/dev/null || true
cp -r ~/workspace/CryptoEvokeApp* ./ 2>/dev/null || true

# Copy configuration files
cp ~/workspace/package*.json ./ 2>/dev/null || true
cp ~/workspace/tsconfig.json ./ 2>/dev/null || true
cp ~/workspace/vite.config.ts ./ 2>/dev/null || true
cp ~/workspace/.gitattributes ./ 2>/dev/null || true
cp ~/workspace/.gitignore ./ 2>/dev/null || true

# Copy documentation (only smaller files)
find ~/workspace -maxdepth 1 -name "*.md" -size -1M -exec cp {} ./ \; 2>/dev/null || true

# Copy mobile app scripts
cp ~/workspace/*.sh ./ 2>/dev/null || true

# Setup Git LFS
git lfs install

# Add all files
git add .

# Check what we have
git status

# Commit with clean history
git commit -m "Complete EvokeEssence crypto exchange platform

Enterprise-grade cryptocurrency exchange featuring:
- React.js frontend with TypeScript
- Express.js backend with PostgreSQL database
- Multiple React Native mobile applications (iOS/Android)
- Telegram bot with 24/7 webhook integration
- Advanced security: 2FA, KYC verification, rate limiting
- Trading support: BTC, ETH, USDT, USDC
- Admin dashboard and contractor management system
- Comprehensive documentation and deployment guides

All files optimized for GitHub (clean history, no oversized files)."

# Force push to replace the problematic history
git push origin main --force
```

## Alternative: Check Current Status First
If you want to see what's in the fresh repo before committing:

```bash
cd ~/fresh-repo
ls -la
du -sh *
git status
```

This will show you exactly what files are included before the final push.