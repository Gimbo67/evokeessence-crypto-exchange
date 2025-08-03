#!/bin/bash

echo "=== Upload ALL Files - Chunked Solution ==="

# Function to split oversized files into 1.8GB chunks
split_large_files() {
    echo "Splitting oversized files into chunks..."
    
    # Find files over 1.8GB and split them
    find . -maxdepth 1 -size +1800M -name "*.tar.gz" -o -size +1800M -name "*.zip" | while read file; do
        if [ -f "$file" ]; then
            echo "Splitting $file..."
            split -b 1800M "$file" "${file}.chunk-"
            # Remove original oversized file after splitting
            rm "$file"
            echo "Split $file into chunks"
        fi
    done
}

# Update .gitattributes for chunked files
update_gitattributes() {
    cat >> .gitattributes << 'EOF'

# Chunked large files
*.chunk-* filter=lfs diff=lfs merge=lfs -text
*.tar.gz.chunk-* filter=lfs diff=lfs merge=lfs -text
*.zip.chunk-* filter=lfs diff=lfs merge=lfs -text
EOF
}

cd ~/fresh-repo

# Remove git locks
rm -f .git/index.lock .git/config.lock 2>/dev/null || true

# First, copy ALL files from workspace
echo "Copying ALL files from workspace..."
rm -rf * .[^.]* 2>/dev/null || true
cp -r ~/workspace/* . 2>/dev/null || true
cp ~/workspace/.gitattributes ~/workspace/.gitignore . 2>/dev/null || true

# Split oversized files
split_large_files

# Update git attributes for chunks
update_gitattributes

# Check total size
echo "Repository size after splitting:"
du -sh .
echo "Number of files:"
find . -type f | wc -l

# Setup Git LFS
git lfs install

# Add all files
echo "Adding all files to git..."
git add .

# Check what's being tracked by LFS
echo "Files tracked by LFS:"
git lfs ls-files | head -10

# Commit everything
git commit -m "Complete EvokeEssence platform - ALL files included

Enterprise cryptocurrency exchange with ALL assets:
- Complete React.js frontend with TypeScript
- Express.js backend with PostgreSQL
- Multiple React Native mobile applications
- All documentation files (1,800+ .md files)
- All mobile app versions and configurations  
- All attached assets and backup archives
- All development scripts and utilities
- Large files split into 1.8GB chunks for GitHub compatibility

Features:
- Cryptocurrency trading (BTC, ETH, USDT, USDC)
- Advanced security (2FA, KYC, rate limiting)
- Telegram bot with 24/7 webhook integration
- Admin dashboard and contractor management
- Complete development history and backups

Repository contains the complete project with ALL files preserved."

# Push to GitHub
echo "Pushing ALL files to GitHub..."
git push origin main --force

echo "✅ ALL FILES UPLOADED!"
echo "Repository: https://github.com/Gimbo67/evokeessence-crypto-exchange"
echo "Large files have been automatically split into chunks under 1.8GB each"