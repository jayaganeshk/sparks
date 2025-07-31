#!/bin/bash

# Terraform Environment Management Script
# Simplifies Terraform operations across different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_bold() { echo -e "${BOLD}$1${NC}"; }

# Show usage information
show_usage() {
    echo "Usage: $0 <environment> <command> [options]"
    echo
    echo "Arguments:"
    echo "  environment    Target environment (dev, staging, prod)"
    echo "  command        Terraform command (init, plan, apply, destroy, output, workspace)"
    echo
    echo "Commands:"
    echo "  init           Initialize Terraform"
    echo "  plan           Create execution plan"
    echo "  apply          Apply changes"
    echo "  destroy        Destroy infrastructure"
    echo "  output         Show outputs"
    echo "  workspace      Manage workspaces (list, show, select, new, delete)"
    echo
    echo "Examples:"
    echo "  $0 dev plan              # Plan changes for dev environment"
    echo "  $0 prod apply            # Apply changes to prod environment"
    echo "  $0 staging output        # Show staging outputs"
    echo "  $0 dev workspace show    # Show current workspace"
}

# Parse command line arguments
parse_arguments() {
    if [ $# -lt 2 ]; then
        print_error "Environment and command parameters are required"
        echo
        show_usage
        exit 1
    fi
    
    ENVIRONMENT="$1"
    COMMAND="$2"
    shift 2
    EXTRA_ARGS="$@"
    
    # Validate environment
    case "$ENVIRONMENT" in
        dev|staging|prod)
            print_status "Working with $ENVIRONMENT environment"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Supported environments: dev, staging, prod"
            exit 1
            ;;
    esac
    
    # Set environment-specific paths
    TFVARS_FILE="$TERRAFORM_DIR/environments/$ENVIRONMENT/variables.tfvars"
    
    # Check if terraform variables file exists
    if [ ! -f "$TFVARS_FILE" ]; then
        print_error "Terraform variables file not found: $TFVARS_FILE"
        exit 1
    fi
}

# Initialize Terraform
terraform_init() {
    print_status "Initializing Terraform..."
    cd "$TERRAFORM_DIR"
    
    terraform init
    
    # Setup workspace
    if ! terraform workspace list | grep -q "^[[:space:]]*$ENVIRONMENT$"; then
        print_status "Creating workspace: $ENVIRONMENT"
        terraform workspace new "$ENVIRONMENT"
    else
        print_status "Selecting workspace: $ENVIRONMENT"
        terraform workspace select "$ENVIRONMENT"
    fi
    
    print_success "Terraform initialized for $ENVIRONMENT"
}

# Plan changes
terraform_plan() {
    print_status "Planning changes for $ENVIRONMENT..."
    cd "$TERRAFORM_DIR"
    
    # Ensure correct workspace
    terraform workspace select "$ENVIRONMENT"
    
    terraform plan -var-file="$TFVARS_FILE" -out="terraform-$ENVIRONMENT.tfplan" $EXTRA_ARGS
    
    print_success "Plan created: terraform-$ENVIRONMENT.tfplan"
}

# Apply changes
terraform_apply() {
    print_status "Applying changes for $ENVIRONMENT..."
    cd "$TERRAFORM_DIR"
    
    # Ensure correct workspace
    terraform workspace select "$ENVIRONMENT"
    
    if [ -f "terraform-$ENVIRONMENT.tfplan" ]; then
        print_status "Using existing plan file"
        terraform apply "terraform-$ENVIRONMENT.tfplan" $EXTRA_ARGS
    else
        print_status "No plan file found, applying directly"
        terraform apply -var-file="$TFVARS_FILE" $EXTRA_ARGS
    fi
    
    print_success "Changes applied to $ENVIRONMENT"
}

# Destroy infrastructure
terraform_destroy() {
    print_warning "This will DESTROY all infrastructure in $ENVIRONMENT environment!"
    read -p "Are you sure? Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status "Destroy cancelled"
        exit 0
    fi
    
    print_status "Destroying infrastructure for $ENVIRONMENT..."
    cd "$TERRAFORM_DIR"
    
    # Ensure correct workspace
    terraform workspace select "$ENVIRONMENT"
    
    terraform destroy -var-file="$TFVARS_FILE" $EXTRA_ARGS
    
    print_success "Infrastructure destroyed for $ENVIRONMENT"
}

# Show outputs
terraform_output() {
    print_status "Showing outputs for $ENVIRONMENT..."
    cd "$TERRAFORM_DIR"
    
    # Ensure correct workspace
    terraform workspace select "$ENVIRONMENT"
    
    if [ -n "$EXTRA_ARGS" ]; then
        terraform output -var-file="$TFVARS_FILE" $EXTRA_ARGS
    else
        terraform output -var-file="$TFVARS_FILE"
    fi
}

# Manage workspaces
terraform_workspace() {
    cd "$TERRAFORM_DIR"
    
    case "$EXTRA_ARGS" in
        list)
            print_status "Listing workspaces..."
            terraform workspace list
            ;;
        show)
            print_status "Current workspace:"
            terraform workspace show
            ;;
        select)
            print_status "Selecting workspace: $ENVIRONMENT"
            terraform workspace select "$ENVIRONMENT"
            ;;
        new)
            print_status "Creating workspace: $ENVIRONMENT"
            terraform workspace new "$ENVIRONMENT"
            ;;
        delete)
            print_warning "This will delete the $ENVIRONMENT workspace!"
            read -p "Are you sure? Type 'yes' to confirm: " confirm
            if [ "$confirm" = "yes" ]; then
                terraform workspace delete "$ENVIRONMENT"
                print_success "Workspace $ENVIRONMENT deleted"
            else
                print_status "Delete cancelled"
            fi
            ;;
        *)
            print_error "Invalid workspace command: $EXTRA_ARGS"
            print_status "Available commands: list, show, select, new, delete"
            exit 1
            ;;
    esac
}

# Main execution
main() {
    echo
    print_bold "🏗️  TERRAFORM ENVIRONMENT MANAGER"
    print_bold "Multi-environment infrastructure management"
    echo
    
    parse_arguments "$@"
    
    cd "$TERRAFORM_DIR"
    
    case "$COMMAND" in
        init)
            terraform_init
            ;;
        plan)
            terraform_plan
            ;;
        apply)
            terraform_apply
            ;;
        destroy)
            terraform_destroy
            ;;
        output)
            terraform_output
            ;;
        workspace)
            terraform_workspace
            ;;
        *)
            print_error "Invalid command: $COMMAND"
            echo
            show_usage
            exit 1
            ;;
    esac
    
    echo
    print_success "✅ Operation completed for $ENVIRONMENT environment"
}

main "$@"
