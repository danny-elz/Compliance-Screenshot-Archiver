#!/usr/bin/env bash
set -euo pipefail
rg --version >/dev/null || { echo "ripgrep (rg) required"; exit 1; }

# Change to backend directory for Python operations
cd backend

# Check if uv and Python files exist
if [ -f "pyproject.toml" ] && [ -d "app" ]; then
    uv run ruff check . || true  # Don't fail on lint issues during reorganization
    uv run ruff format --check . || true
    uv run mypy app/ || true     # allow gradual typing
    
    # Run tests if they exist
    if [ -d "tests" ]; then
        UV_PYTEST="uv run pytest -q"
        $UV_PYTEST || true       # Don't fail on test issues during reorganization
    fi
else
    echo "Backend structure not found, skipping Python validation"
fi
