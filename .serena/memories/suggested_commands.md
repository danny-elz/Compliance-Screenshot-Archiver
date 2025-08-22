# Suggested Development Commands

## Environment Setup
```bash
# Activate Python virtual environment (ALWAYS use this for Python commands)
source venv_linux/bin/activate

# Install dependencies 
uv sync

# Frontend dependencies
npm -C frontend install
```

## Development Commands

### Code Quality (REQUIRED before every commit)
```bash
# Lint and format code
uv run ruff check .
uv run ruff format --check .

# Type checking
uv run mypy src/

# Security linting
uv run bandit -c pyproject.toml -r app

# Run all quality checks together
uv run ruff check . && uv run ruff format --check . && uv run mypy src/ && uv run pytest -q
```

### Testing
```bash
# Run tests
uv run pytest -q

# Run with coverage
uv run pytest --cov=app --cov-report=html

# Run specific test file
uv run pytest tests/test_specific.py -v
```

### Local Development
```bash
# Run API server locally
uv run fastapi dev app/main.py

# Run frontend dev server
npm -C frontend run dev

# Build frontend for production
npm -C frontend run build
```

### Infrastructure
```bash
# Terraform commands (from infra/ directory)
terraform fmt -check
terraform validate  
terraform plan
terraform apply

# Infrastructure quality checks
checkov -d infra
```

### Pre-commit Hooks
```bash
# Install pre-commit hooks
pre-commit install

# Run pre-commit on all files
pre-commit run --all-files
```

### Docker (Capture Engine)
```bash
# Build capture Lambda container image
docker build -t csa-capture:dev app/capture_engine

# Test capture engine locally
docker run --rm csa-capture:dev
```

## Mandatory Validation Gates
These MUST pass before any code changes:
1. `uv run ruff check .`
2. `uv run mypy src/`  
3. `uv run pytest -q`
4. Pre-commit hooks (black, ruff, mypy, bandit)

## CI/CD Commands
```bash
# What CI runs for validation
uv run ruff check . && uv run mypy src/ && uv run pytest -q
terraform -chdir=infra fmt -check && terraform -chdir=infra validate
```

## Useful System Commands (Darwin/macOS)
```bash
# Find files
find . -name "*.py" -type f

# Search in files  
grep -r "pattern" app/

# List directory contents
ls -la

# Git operations
git status
git add .
git commit -m "message"
git push
```