#!/bin/bash

# Script to push all files to GitHub using Git LFS for large files

echo "Setting up Git LFS and pushing all files to GitHub..."

# First, let's track large files with Git LFS
echo "Tracking large files with Git LFS..."

# Track all .tar.gz files
git lfs track "*.tar.gz"
git lfs track "*.zip"
git lfs track "*.PNG"
git lfs track "*.png"
git lfs track "*.jpg"
git lfs track "*.jpeg"
git lfs track "*.pdf"
git lfs track "*.db"
git lfs track "*.sqlite"
git lfs track "*.sqlite3"

# Track specific large files
git lfs track "assets-complete-FINAL-CHUNK-*"
git lfs track "attached_assets-sweep-*"
git lfs track "ULTIMATE-*"

# Add .gitattributes file
git add .gitattributes

# Now let's add all files
echo "Adding all files to git..."

# Add all markdown files
git add *.md

# Add configuration files
git add *.json
git add *.js
git add *.ts
git add *.tsx
git add *.html
git add *.css
git add *.yaml
git add *.yml

# Add shell scripts
git add *.sh

# Add log files
git add *.log
git add *.txt

# Add directories
git add client/
git add server/
git add db/
git add attached_assets/
git add CryptoEvokeApp*/
git add mobile-app*/
git add scripts/
git add migrations/
git add .vscode/
git add backups/
git add github-repo/
git add node_modules/

# Add all remaining files
git add .

# Commit all changes
echo "Committing all files..."
git commit -m "Complete project push - all files including large files via Git LFS"

# Push to GitHub
echo "Pushing to GitHub..."
git push origin main

echo "Push complete! All files have been uploaded to GitHub."