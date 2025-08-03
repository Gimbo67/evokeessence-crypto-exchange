#!/bin/bash

echo "=== Pushing Clean Repository (Under 2GB LFS Limit) ==="

# Remove git locks
rm -f .git/index.lock .git/config.lock .git/objects/*/tmp_obj_* 2>/dev/null || true

# Add all file deletions and changes
git add -A

# Commit the cleanup
git commit -m "Remove oversized files (>2GB) and prepare clean repository

Removed files:
- super-archive-1.tar.gz (5.6G)
- remaining-archives.tar.gz (4.3G) 
- large-cache-data.tar.gz (3.8G)
- evokeessence-complete.tar.gz (3.2G)
- All other files over 1GB

Keeping essential project files:
- Complete source code (client/, server/, db/)
- Mobile applications (CryptoEvokeApp folders)
- Documentation (1,856+ .md files)
- Configuration files
- Assets under 618MB (compatible with Git LFS)

Repository now complies with GitHub 2GB LFS limits."

# Push to GitHub
echo "Pushing to GitHub..."
git push origin main

echo "✅ Clean repository pushed successfully!"
echo "Repository: https://github.com/Gimbo67/evokeessence-crypto-exchange"