#!/bin/bash
# Setup script to initialize Git repository in root

set -e

echo "Initializing Git repository in root..."

# Check if .git already exists
if [ -d ".git" ]; then
    echo "Warning: .git directory already exists. Skipping git init."
else
    git init
    echo "✓ Git repository initialized"
fi

# Add all files
echo "Adding files to Git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "No changes to commit."
else
    echo "Creating initial commit..."
    git commit -m "Initial commit: Vicinae fork with extensions and scripts directories"
    echo "✓ Initial commit created"
fi

echo ""
echo "Repository setup complete!"
echo ""
echo "To connect to a remote repository, run:"
echo "  git remote add origin <your-repo-url>"
echo "  git push -u origin main"
echo ""
echo "Current status:"
git status --short
