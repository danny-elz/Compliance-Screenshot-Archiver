# Compliance Screenshot Archiver (CSA)

Automated web content archiving for compliance and regulatory requirements.

## Authoritative docs
- **Spec (normative):** [docs/CSA-Spec.md](docs/CSA-Spec.md)
- **Design:** [docs/CSA-Design.md](docs/CSA-Design.md)

Agents and contributors must consult these before implementing or changing features.

## Quick Start

1. **Set up automated TASK.md tracking**:
   ```bash
   # Enable auto-completion detection
   ./scripts/setup_git_hooks.sh
   ```

2. **Install dependencies**:
   ```bash
   uv sync
   ```

3. **Deploy infrastructure**:
   ```bash
   cd infra
   terraform init
   terraform plan
   terraform apply
   ```

4. **Configure authentication**:
   ```bash
   # Copy environment template
   cp .env .env
   
   # Set Cognito configuration (from Terraform outputs)
   export COGNITO_USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
   export COGNITO_CLIENT_ID=$(terraform output -raw cognito_user_pool_client_id)
   ```

5. **Test authentication**:
   ```bash
   # Check API health and auth config
   curl http://localhost:8000/api/health
   curl http://localhost:8000/api/auth/config
   ```

## Automated TASK.md Management

### How It Works

TASK.md is **automatically updated** when you complete work:

```bash
# 1. Write code (e.g., implement S3 bucket)
vim infra/s3_artifacts.tf

# 2. Commit your changes  
git add infra/s3_artifacts.tf
git commit -m "feat: configure S3 with Object Lock"

# 3. TASK.md auto-updates! ✅
# Post-commit hook detects completion and checks off criteria:
# - [x] S3 bucket created with Object Lock in Compliance mode
# - [x] Default retention period set to 7 years
```

### What Gets Auto-Detected

**Infrastructure completions:**
- ✅ S3 Object Lock configuration
- ✅ KMS key creation
- ✅ DynamoDB table setup
- ✅ CloudTrail logging

**Code completions:**
- ✅ Lambda function implementations
- ✅ API endpoint creation
- ✅ Hash computation logic
- ✅ Security controls

**Testing completions:**
- ✅ Test coverage thresholds
- ✅ Security test implementation
- ✅ Integration test coverage

### Manual Override

If auto-detection misses something:
```bash
# Manually run detection
python3 scripts/auto_update_tasks.py

# Or manually edit TASK.md
vim TASK.md
```

### CI/CD Integration

GitHub Actions automatically:
- 🔍 **Validates** TASK.md is updated with code changes
- ✅ **Auto-updates** TASK.md on main branch pushes  
- 🚫 **Blocks PRs** if tasks aren't tracked properly

## Development Workflow

```bash
# 1. Check what needs to be done
grep -A5 "Status.*PENDING" TASK.md

# 2. Work on a task
# (implementation happens here)

# 3. Commit - TASK.md updates automatically!
git commit -m "feat: implement capture engine"

# 4. TASK.md now shows:
# ✅ Status: COMPLETED 
# ✅ Completed: 2024-01-22, auto-detected
```

## Task Status Flow

```
PENDING → IN_PROGRESS → COMPLETED ✅
   ↑           ↑            ↑
Manual     Auto-detected   All criteria
 start      any progress    completed
```

## Security & Compliance

This system ensures regulatory compliance by:
- 📋 **Tracking all requirements** with acceptance criteria
- 🔍 **Auto-verifying completions** to prevent gaps
- 📝 **Maintaining audit trail** of what was built when
- 🚫 **Blocking releases** until MUST requirements complete

## Authentication

The API uses **JWT tokens from AWS Cognito** for authentication with role-based access control:

- **Admin**: Full access to all resources
- **Operator**: Can view and trigger captures
- **Viewer**: Read-only access

See [docs/authentication.md](docs/authentication.md) for complete setup guide.

### Quick Auth Test
```bash
# Test with JWT token
python scripts/test_auth.py --token "your-jwt-token"

# API usage
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/captures
```

## Files

- `TASK.md` - Living task list (auto-updated)
- `PLANNING.md` - Requirements and architecture reference
- `validation-gates.md` - Security and compliance rules
- `docs/authentication.md` - JWT authentication setup guide
- `scripts/auto_update_tasks.py` - Auto-completion detection engine
- `scripts/task_completion_rules.yaml` - Detection rules configuration
- `scripts/test_auth.py` - Authentication testing utility

## Troubleshooting

**TASK.md not auto-updating?**
```bash
# Check if git hooks are installed
ls .git/hooks/post-commit

# Reinstall if missing
./scripts/setup_git_hooks.sh

# Test manually
python3 scripts/auto_update_tasks.py
```

**False positives/negatives?**
```bash
# Adjust detection rules
vim scripts/task_completion_rules.yaml

# Test detection logic
python3 scripts/auto_update_tasks.py --dry-run
```

---

*TASK.md is automatically maintained - focus on building, not tracking!* ✨
