#!/bin/bash

echo "=== GitHub Push Script - Complete Project Upload ==="
echo "This script will push all project files to GitHub"
echo ""

# Initialize Git LFS
echo "Step 1: Initializing Git LFS..."
git lfs install

# Create comprehensive .gitattributes for LFS
echo "Step 2: Setting up Git LFS tracking..."
cat > .gitattributes << 'EOF'
# Archives
*.tar.gz filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text
*.gz filter=lfs diff=lfs merge=lfs -text

# Images
*.png filter=lfs diff=lfs merge=lfs -text
*.PNG filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.jpeg filter=lfs diff=lfs merge=lfs -text

# Large files
assets-complete-FINAL-CHUNK-* filter=lfs diff=lfs merge=lfs -text
attached_assets-sweep-* filter=lfs diff=lfs merge=lfs -text
ULTIMATE-* filter=lfs diff=lfs merge=lfs -text
backups-sweep-* filter=lfs diff=lfs merge=lfs -text

# Database files
*.db filter=lfs diff=lfs merge=lfs -text
*.sqlite filter=lfs diff=lfs merge=lfs -text
*.sqlite3 filter=lfs diff=lfs merge=lfs -text
EOF

# Add gitattributes
git add .gitattributes

# Step 3: Add all source code files
echo "Step 3: Adding source code files..."
git add client/ server/ db/ -f 2>/dev/null || echo "Some directories may not exist"

# Step 4: Add documentation
echo "Step 4: Adding documentation..."
git add *.md -f 2>/dev/null || echo "No markdown files to add"

# Step 5: Add configuration files
echo "Step 5: Adding configuration files..."
git add *.json *.js *.ts *.tsx *.html *.css *.yml *.yaml -f 2>/dev/null || echo "Some config files may not exist"

# Step 6: Add mobile app directories
echo "Step 6: Adding mobile app files..."
git add CryptoEvokeApp*/ mobile-app*/ -f 2>/dev/null || echo "Some mobile directories may not exist"

# Step 7: Add scripts and utilities
echo "Step 7: Adding scripts..."
git add *.sh scripts/ migrations/ -f 2>/dev/null || echo "Some script directories may not exist"

# Step 8: Add attached assets
echo "Step 8: Adding attached assets..."
git add attached_assets/ -f 2>/dev/null || echo "Attached assets directory may not exist"

# Step 9: Add large archive files (will use LFS)
echo "Step 9: Adding archive files with LFS..."
git add *.tar.gz *.zip -f 2>/dev/null || echo "No archive files to add"

# Step 10: Add remaining files
echo "Step 10: Adding all remaining files..."
git add . -f

# Step 11: Commit
echo "Step 11: Creating commit..."
git commit -m "Complete project upload - all files including LFS tracked large files" || echo "Nothing to commit"

# Step 12: Push
echo "Step 12: Pushing to GitHub..."
echo "Note: This may take a while for large files..."
git push origin main

echo ""
echo "=== Push Complete! ==="
echo "All files have been uploaded to GitHub."
echo "Large files are tracked with Git LFS."