# Terraform Makefile for CSA Infrastructure
# Provides common operations with safety checks and best practices

.PHONY: help init plan apply destroy validate fmt check clean

# Default target
help:
	@echo "Available targets:"
	@echo "  init      - Initialize Terraform"
	@echo "  validate  - Validate Terraform configuration"
	@echo "  fmt       - Format Terraform files"
	@echo "  check     - Run validate and fmt checks"
	@echo "  plan      - Generate and show an execution plan"
	@echo "  apply     - Build or change infrastructure"
	@echo "  destroy   - Destroy Terraform-managed infrastructure"
	@echo "  clean     - Clean up Terraform files"
	@echo ""
	@echo "Environment variables:"
	@echo "  TF_VAR_file=path  - Specify tfvars file (default: terraform.tfvars)"

# Variables
TF_VAR_FILE ?= terraform.tfvars

# Check if tfvars file exists
check-tfvars:
	@if [ ! -f "$(TF_VAR_FILE)" ]; then \
		echo "❌ Error: $(TF_VAR_FILE) not found!"; \
		echo "📝 Please copy terraform.tfvars.example to $(TF_VAR_FILE) and customize it"; \
		exit 1; \
	fi

# Initialize Terraform
init:
	@echo "🚀 Initializing Terraform..."
	terraform init

# Validate configuration
validate: init
	@echo "✅ Validating Terraform configuration..."
	terraform validate

# Format Terraform files
fmt:
	@echo "🎨 Formatting Terraform files..."
	terraform fmt -recursive

# Check formatting and validation
check: fmt validate
	@echo "✅ All checks passed!"

# Generate execution plan
plan: check check-tfvars
	@echo "📋 Generating Terraform execution plan..."
	terraform plan -var-file="$(TF_VAR_FILE)" -out=tfplan

# Apply changes (requires confirmation)
apply: check check-tfvars
	@echo "🏗️ Applying Terraform changes..."
	@echo "⚠️  This will create/modify/destroy AWS resources!"
	@echo "💰 Review the plan carefully to avoid unexpected costs!"
	@read -p "Are you sure you want to continue? [y/N] " confirm && [ "$$confirm" = "y" ]
	terraform apply -var-file="$(TF_VAR_FILE)"

# Apply with auto-approval (use with caution!)
apply-auto: check check-tfvars
	@echo "🏗️ Auto-applying Terraform changes..."
	terraform apply -var-file="$(TF_VAR_FILE)" -auto-approve

# Destroy infrastructure (requires double confirmation)
destroy: check check-tfvars
	@echo "💥 Destroying Terraform-managed infrastructure..."
	@echo "⚠️  This will PERMANENTLY DELETE all resources!"
	@echo "🗄️  S3 buckets with Object Lock CANNOT be deleted!"
	@echo "💸 This may result in data loss and ongoing costs!"
	@read -p "Type 'destroy' to confirm: " confirm && [ "$$confirm" = "destroy" ]
	@read -p "Are you absolutely sure? [y/N] " confirm2 && [ "$$confirm2" = "y" ]
	terraform destroy -var-file="$(TF_VAR_FILE)"

# Show current state
show:
	@echo "📊 Showing Terraform state..."
	terraform show

# List resources
list:
	@echo "📋 Listing Terraform resources..."
	terraform state list

# Get outputs
output:
	@echo "📤 Terraform outputs:"
	terraform output

# Import existing resource (requires RESOURCE and ID parameters)
import:
	@if [ -z "$(RESOURCE)" ] || [ -z "$(ID)" ]; then \
		echo "❌ Usage: make import RESOURCE=aws_s3_bucket.example ID=bucket-name"; \
		exit 1; \
	fi
	terraform import $(RESOURCE) $(ID)

# Clean up temporary files
clean:
	@echo "🧹 Cleaning up Terraform files..."
	rm -f tfplan
	rm -f terraform.tfstate.backup
	rm -f .terraform.lock.hcl
	rm -rf .terraform/

# Emergency state unlock (use only if state is stuck)
unlock:
	@if [ -z "$(LOCK_ID)" ]; then \
		echo "❌ Usage: make unlock LOCK_ID=lock-id-from-error"; \
		exit 1; \
	fi
	terraform force-unlock $(LOCK_ID)

# Refresh state without making changes
refresh: check-tfvars
	@echo "🔄 Refreshing Terraform state..."
	terraform refresh -var-file="$(TF_VAR_FILE)"

# Taint a resource to force recreation
taint:
	@if [ -z "$(RESOURCE)" ]; then \
		echo "❌ Usage: make taint RESOURCE=aws_lambda_function.api"; \
		exit 1; \
	fi
	terraform taint $(RESOURCE)

# Untaint a resource
untaint:
	@if [ -z "$(RESOURCE)" ]; then \
		echo "❌ Usage: make untaint RESOURCE=aws_lambda_function.api"; \
		exit 1; \
	fi
	terraform untaint $(RESOURCE)

# Graph visualization (requires graphviz)
graph:
	@echo "📈 Generating Terraform dependency graph..."
	terraform graph | dot -Tpng > terraform-graph.png
	@echo "Graph saved as terraform-graph.png"

# Cost estimation (requires infracost CLI)
cost:
	@if ! command -v infracost >/dev/null 2>&1; then \
		echo "❌ infracost CLI not found. Install from: https://www.infracost.io/docs/"; \
		exit 1; \
	fi
	@echo "💰 Estimating infrastructure costs..."
	infracost breakdown --path .

# Security scan (requires checkov CLI)
security:
	@if ! command -v checkov >/dev/null 2>&1; then \
		echo "❌ checkov CLI not found. Install with: pip install checkov"; \
		exit 1; \
	fi
	@echo "🔒 Running security scan..."
	checkov -d .

# Full workflow: format, validate, plan
workflow: fmt validate plan
	@echo "🎯 Workflow complete! Review the plan before applying."