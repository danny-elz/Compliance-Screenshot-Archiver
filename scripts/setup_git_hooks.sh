#!/bin/bash
# Setup script to configure git hooks for TASK.md auto-updating

set -e

echo "🔧 Setting up git hooks for TASK.md auto-updating..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy our custom hooks
if [ -f ".githooks/post-commit" ]; then
    cp .githooks/post-commit .git/hooks/post-commit
    chmod +x .git/hooks/post-commit
    echo "✅ post-commit hook installed"
else
    echo "❌ .githooks/post-commit not found"
    exit 1
fi

# Set git config to use our hooks directory (optional alternative approach)
# git config core.hooksPath .githooks

echo "🎉 Git hooks setup complete!"
echo ""
echo "Now every commit will automatically:"
echo "  • Check for completed tasks"
echo "  • Update TASK.md with checkmarks"
echo "  • Auto-commit TASK.md changes"
echo ""
echo "To disable: rm .git/hooks/post-commit"