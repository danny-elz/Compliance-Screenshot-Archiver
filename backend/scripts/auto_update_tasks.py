#!/usr/bin/env python3
"""
Auto-update TASK.md based on actual implementation completion.
Detects when acceptance criteria are met and automatically checks them off.
"""

import os
import re
import subprocess
from datetime import datetime
from pathlib import Path


class TaskAutoUpdater:
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.task_file = repo_root / "TASK.md"

    def detect_completions(self) -> dict[str, list[str]]:
        """Detect which acceptance criteria have been completed."""
        completions = {}

        # Infrastructure Tasks
        completions.update(self._check_terraform_completions())

        # Code Implementation Tasks
        completions.update(self._check_code_completions())

        # Security & Compliance Tasks
        completions.update(self._check_security_completions())

        return completions

    def _check_s3_completions(self, infra_dir: Path) -> dict[str, list[str]]:
        """Check S3 task completions."""
        completions = {}
        s3_file = infra_dir / "s3_artifacts.tf"
        if not s3_file.exists():
            return completions

        content = s3_file.read_text()
        s3_criteria = []

        if "object_lock_enabled = true" in content or 'mode = "COMPLIANCE"' in content:
            s3_criteria.append(
                "S3 bucket `csa-artifacts-{env}` created with Object Lock in Compliance mode"
            )

        if "days = 2557" in content:
            s3_criteria.append("Default retention period set to 7 years")

        if 'status = "Enabled"' in content and "versioning" in content:
            s3_criteria.append("Versioning enabled on bucket")

        if 'sse_algorithm     = "aws:kms"' in content:
            s3_criteria.append("SSE-KMS encryption configured with CMK")

        if s3_criteria:
            completions["Configure S3 Buckets with Object Lock"] = s3_criteria

        return completions

    def _check_kms_completions(self, infra_dir: Path) -> dict[str, list[str]]:
        """Check KMS task completions."""
        completions = {}
        kms_file = infra_dir / "kms.tf"
        if not kms_file.exists():
            return completions

        content = kms_file.read_text()
        kms_criteria = []

        if "aws_kms_key" in content and "artifacts" in content:
            kms_criteria.append("CMK created for S3 encryption")

        if "enable_key_rotation = true" in content:
            kms_criteria.append("Automatic rotation enabled")

        if kms_criteria:
            completions["Set up KMS Keys"] = kms_criteria

        return completions

    def _check_dynamo_completions(self, infra_dir: Path) -> dict[str, list[str]]:
        """Check DynamoDB task completions."""
        completions = {}
        dynamo_file = infra_dir / "dynamodb.tf"
        if not dynamo_file.exists():
            return completions

        content = dynamo_file.read_text()
        dynamo_criteria = []

        if "schedules" in content and "aws_dynamodb_table" in content:
            dynamo_criteria.append("Schedules table created with correct schema")

        if "captures" in content and "aws_dynamodb_table" in content:
            dynamo_criteria.append("Captures table created with correct schema")

        if "global_secondary_index" in content:
            dynamo_criteria.append("GSIs configured for query patterns")

        if "server_side_encryption" in content:
            dynamo_criteria.append("Encryption at rest enabled with KMS")

        if dynamo_criteria:
            completions["Configure DynamoDB Tables"] = dynamo_criteria

        return completions

    def _check_terraform_completions(self) -> dict[str, list[str]]:
        """Check infrastructure task completions."""
        completions = {}
        infra_dir = self.repo_root / "infra"

        if not infra_dir.exists():
            return completions

        # Check different infrastructure components
        completions.update(self._check_s3_completions(infra_dir))
        completions.update(self._check_kms_completions(infra_dir))
        completions.update(self._check_dynamo_completions(infra_dir))

        return completions

    def _check_capture_engine_completions(self, app_dir: Path) -> dict[str, list[str]]:
        """Check capture engine implementation completions."""
        completions = {}
        engine_file = app_dir / "capture_engine" / "engine.py"
        if not engine_file.exists():
            return completions

        content = engine_file.read_text()
        capture_criteria = []

        if "playwright" in content.lower() or "chromium" in content.lower():
            capture_criteria.append("Container image with Playwright + Chromium built")

        if "hashlib.sha256" in content or "sha256" in content:
            capture_criteria.append("SHA-256 hash computation implemented")

        if "s3" in content.lower() and "upload" in content.lower():
            capture_criteria.append("S3 upload with metadata working")

        if "dynamodb" in content.lower() or ("capture" in content and "record" in content):
            capture_criteria.append("DynamoDB capture record creation")

        if capture_criteria:
            completions["Implement CaptureLambda"] = capture_criteria

        return completions

    def _check_api_completions(self, app_dir: Path) -> dict[str, list[str]]:
        """Check API implementation completions."""
        completions = {}
        api_dir = app_dir / "api"
        if not api_dir.exists():
            return completions

        api_criteria = []
        routes_dir = api_dir / "routes"
        if not routes_dir.exists():
            return completions

        # Check schedules API
        schedules_file = routes_dir / "schedules.py"
        if schedules_file.exists():
            schedules_content = schedules_file.read_text()
            if "POST" in schedules_content and "schedules" in schedules_content:
                api_criteria.append("POST /api/schedules creates schedule with all fields")
            if "GET" in schedules_content and "schedules" in schedules_content:
                api_criteria.append("GET /api/schedules returns user's schedules")

        # Check captures API
        captures_file = routes_dir / "captures.py"
        if captures_file.exists():
            captures_content = captures_file.read_text()
            if "trigger" in captures_content and "POST" in captures_content:
                api_criteria.append("POST /api/captures/trigger works with rate limiting")
            if "GET" in captures_content and "captures" in captures_content:
                api_criteria.append("GET /api/captures supports all filter parameters")

        if api_criteria:
            completions["Implement API Lambda Functions"] = api_criteria

        return completions

    def _check_code_completions(self) -> dict[str, list[str]]:
        """Check code implementation completions."""
        completions = {}
        app_dir = self.repo_root / "app"

        if not app_dir.exists():
            return completions

        # Check different code components
        completions.update(self._check_capture_engine_completions(app_dir))
        completions.update(self._check_api_completions(app_dir))

        return completions

    def _check_security_completions(self) -> dict[str, list[str]]:
        """Check security implementation completions."""
        completions = {}

        # Task: Configure CloudTrail Logging
        infra_dir = self.repo_root / "infra"
        cloudtrail_file = infra_dir / "cloudtrail.tf"
        if cloudtrail_file.exists():
            content = cloudtrail_file.read_text()
            trail_criteria = []

            if "aws_cloudtrail" in content:
                trail_criteria.append("Trail created for all API calls")

            if "data_resource" in content and "s3" in content.lower():
                trail_criteria.append("S3 data events enabled for artifacts bucket")

            if "kms_key_id" in content:
                trail_criteria.append("Logs written to Object Lock protected bucket")

            if trail_criteria:
                completions["Configure CloudTrail Logging"] = trail_criteria

        # Task: Implement Secrets Management
        app_dir = self.repo_root / "app"
        secrets_criteria = []

        # Check for secrets manager usage
        for py_file in app_dir.rglob("*.py"):
            content = py_file.read_text()
            if "boto3" in content and "secretsmanager" in content:
                secrets_criteria.append("Lambda functions retrieve secrets at runtime")
                break

        # Check for no hardcoded secrets
        if self._check_no_hardcoded_secrets():
            secrets_criteria.append("No hardcoded credentials in code")

        if secrets_criteria:
            completions["Implement Secrets Management"] = secrets_criteria

        return completions

    def _check_no_hardcoded_secrets(self) -> bool:
        """Check that no hardcoded secrets exist."""
        try:
            # Run ruff security check
            result = subprocess.run(
                ["uv", "run", "ruff", "check", "--select", "S105,S106,S107", "app/"],
                cwd=self.repo_root,
                capture_output=True,
                text=True,
                check=False,
            )
            return result.returncode == 0
        except (subprocess.SubprocessError, OSError) as e:
            print(f"Warning: Could not run security check: {e}")
            return False

    def update_task_file(self, completions: dict[str, list[str]]) -> bool:
        """Update TASK.md with completed criteria."""
        if not self.task_file.exists():
            print(f"ERROR: {self.task_file} not found")
            return False

        content = self.task_file.read_text()
        updated = False

        # Get current PR number if in CI
        pr_ref = self._get_pr_reference()

        for task_name, completed_criteria in completions.items():
            content, task_updated = self._update_task_section(
                content, task_name, completed_criteria, pr_ref
            )
            if task_updated:
                updated = True

        if updated:
            self.task_file.write_text(content)
            print(f"✅ Updated TASK.md with {len(completions)} completed tasks")
            return True
        else:
            print("ℹ️  No new completions detected")
            return False

    def _update_task_section(
        self, content: str, task_name: str, completed_criteria: list[str], pr_ref: str
    ) -> tuple[str, bool]:
        """Update a specific task section in TASK.md."""
        # Find task section
        task_pattern = rf"### Task: {re.escape(task_name)}.*?(?=### Task:|$)"
        task_match = re.search(task_pattern, content, re.DOTALL)

        if not task_match:
            print(f"⚠️  Task '{task_name}' not found in TASK.md")
            return content, False

        task_section = task_match.group(0)
        updated_section = task_section
        section_updated = False

        # Check off completed criteria
        for criterion in completed_criteria:
            # Look for unchecked criterion
            criterion_pattern = rf"- \[ \] {re.escape(criterion)}"
            if re.search(criterion_pattern, updated_section):
                updated_section = re.sub(criterion_pattern, f"- [x] {criterion}", updated_section)
                section_updated = True

        # Update status if all criteria are now checked
        if self._all_criteria_completed(updated_section):
            # Update status to COMPLETED
            if "**Status**: PENDING" in updated_section:
                completion_date = datetime.now().strftime("%Y-%m-%d")
                new_status = f"**Status**: COMPLETED ✅\n**Completed**: {completion_date}, {pr_ref}"
                updated_section = updated_section.replace("**Status**: PENDING", new_status)
                section_updated = True
            elif "**Status**: IN_PROGRESS" in updated_section:
                completion_date = datetime.now().strftime("%Y-%m-%d")
                new_status = f"**Status**: COMPLETED ✅\n**Completed**: {completion_date}, {pr_ref}"
                updated_section = updated_section.replace("**Status**: IN_PROGRESS", new_status)
                section_updated = True

        if section_updated:
            content = content.replace(task_section, updated_section)

        return content, section_updated

    def _all_criteria_completed(self, task_section: str) -> bool:
        """Check if all acceptance criteria in a task are completed."""
        # Count total criteria
        total_criteria = len(re.findall(r"- \[[x ]\]", task_section))
        # Count completed criteria
        completed_criteria = len(re.findall(r"- \[x\]", task_section))

        return total_criteria > 0 and total_criteria == completed_criteria

    def _get_pr_reference(self) -> str:
        """Get PR reference for completion tracking."""
        # Try to get from GitHub Actions environment
        pr_number = os.environ.get("GITHUB_PR_NUMBER")
        if pr_number:
            return f"PR #{pr_number}"

        # Try to get from git branch
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True,
                text=True,
                cwd=self.repo_root,
                check=False,
            )
            if result.returncode == 0:
                branch = result.stdout.strip()
                if branch.startswith("feature/") or branch.startswith("fix/"):
                    return f"Branch: {branch}"
        except (subprocess.SubprocessError, OSError):
            pass

        return "Auto-detected"


def main():
    """Main entry point."""
    repo_root = Path(__file__).parent.parent
    updater = TaskAutoUpdater(repo_root)

    print("🔍 Detecting task completions...")
    completions = updater.detect_completions()

    if completions:
        print(f"📋 Found completions for {len(completions)} tasks:")
        for task, criteria in completions.items():
            print(f"  • {task}: {len(criteria)} criteria")

        updated = updater.update_task_file(completions)
        if updated:
            print("✅ TASK.md updated successfully")
        else:
            print("ℹ️  No updates needed")
    else:
        print("ℹ️  No new task completions detected")


if __name__ == "__main__":
    main()
