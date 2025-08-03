# GitHub Integration Setup Guide

## Prerequisites
1. A GitHub account
2. Git installed locally (if running outside Replit)
3. Access to your project files

## Method 1: Push Existing Repository to GitHub

### Step 1: Create GitHub Repository
1. Go to GitHub.com and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name your repository (e.g., "evokeessence-crypto-exchange")
5. Set visibility (Private recommended for production projects)
6. Do NOT initialize with README, .gitignore, or license (since they already exist)
7. Click "Create repository"

### Step 2: Configure Git (if not already configured)
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Step 3: Add GitHub Remote and Push
```bash
# Add your GitHub repository as origin
git remote add origin https://github.com/yourusername/your-repository-name.git

# Check current status
git status

# Add all files to staging
git add .

# Commit changes
git commit -m "Initial commit - EvokeEssence Crypto Exchange Platform"

# Push to GitHub (set upstream)
git push -u origin main
```

### Step 4: Verify Upload
1. Go to your GitHub repository URL
2. Verify all files are present
3. Check that sensitive files are properly ignored (thanks to .gitignore)

## Method 2: Using GitHub CLI (Alternative)
If you have GitHub CLI installed:

```bash
# Login to GitHub
gh auth login

# Create repository and push
gh repo create evokeessence-crypto-exchange --private --source=. --remote=origin --push
```

## Important Security Notes

### Files Already Protected by .gitignore:
- Environment variables (.env files)
- Database files (*.sqlite, *.sqlite3)
- SSL certificates (*.pem, *.key, *.crt)
- Service account keys (certain-mission-*.json, client_secret_*.json)
- Logs and temporary files
- User-specific files (admin_cookie.txt)
- Large assets folder (attached_assets/)

### Additional Security Recommendations:
1. **Never commit sensitive data** - Always use environment variables
2. **Use private repositories** for production code
3. **Enable branch protection** on main branch
4. **Set up CI/CD** with GitHub Actions (optional)

## Ongoing Workflow

### Making Changes:
```bash
# Check status
git status

# Add changes
git add .

# Commit with meaningful message
git commit -m "Describe your changes"

# Push to GitHub
git push
```

### Pulling Changes (if working with team):
```bash
git pull origin main
```

## Troubleshooting

### If remote already exists:
```bash
git remote remove origin
git remote add origin https://github.com/yourusername/your-repository-name.git
```

### If you need to change repository URL:
```bash
git remote set-url origin https://github.com/yourusername/your-new-repository-name.git
```

### Large file issues:
If you encounter errors about large files, you may need Git LFS:
```bash
git lfs install
git lfs track "*.zip"
git lfs track "*.png"
git add .gitattributes
```

## Repository Structure
Your GitHub repository will contain:
- Full source code (frontend + backend)
- Database schema and migrations
- Configuration files
- Documentation
- Mobile app projects (React Native)
- All project assets (excluding sensitive files)

This gives you full version control, collaboration capabilities, and backup of your entire project.