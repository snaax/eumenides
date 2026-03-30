#!/bin/bash

# Script to add environment variables to Vercel projects
# Usage: ./add-env-vars.sh [environment] [project] [--force]
#
# environment: preview (default) | production
# project:     backend (default) | frontend | all
# --force:     Overwrite existing variables without prompting
#
# Examples:
#   ./add-env-vars.sh preview all --force
#   ./add-env-vars.sh production backend
#   ./add-env-vars.sh production frontend

ENVIRONMENT="preview"
PROJECT="backend"
FORCE_FLAG=""

for arg in "$@"; do
    case "$arg" in
        production|preview) ENVIRONMENT="$arg" ;;
        backend|frontend|all) PROJECT="$arg" ;;
        --force) FORCE_FLAG="--force"; echo "⚠️  Force mode enabled - existing variables will be overwritten"; echo "" ;;
    esac
done

provision_project() {
    local project_dir="$1"
    local env_file="${project_dir}/.env.${ENVIRONMENT}"

    if [ ! -f "$env_file" ]; then
        echo "⚠️  Skipping ${project_dir}: ${env_file} not found"
        return
    fi

    echo "📦 Provisioning ${project_dir} from ${env_file} (${ENVIRONMENT})"
    echo ""

    while IFS= read -r line || [ -n "$line" ]; do
        [[ -z "$line" ]] || [[ "$line" =~ ^# ]] && continue

        if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
            KEY="${BASH_REMATCH[1]}"
            VALUE="${BASH_REMATCH[2]}"
            VALUE="${VALUE#\"}"
            VALUE="${VALUE%\"}"
            VALUE="${VALUE#\'}"
            VALUE="${VALUE%\'}"
            VALUE=$(echo "$VALUE" | tr -d '\n\r')

            echo "Adding: $KEY"
            if [ -n "$FORCE_FLAG" ]; then
                echo -n "$VALUE" | npx vercel env add "$KEY" "$ENVIRONMENT" "" --force --cwd "$project_dir"
            else
                echo -n "$VALUE" | npx vercel env add "$KEY" "$ENVIRONMENT" "" --cwd "$project_dir"
            fi

            [ $? -eq 0 ] && echo "✅ $KEY added" || echo "❌ Failed to add $KEY"
            echo ""
        fi
    done < "$env_file"

    echo "✅ Done provisioning ${project_dir}"
    echo ""
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$PROJECT" in
    all)
        provision_project "${SCRIPT_DIR}/backend"
        provision_project "${SCRIPT_DIR}/frontend"
        ;;
    frontend)
        provision_project "${SCRIPT_DIR}/frontend"
        ;;
    *)
        provision_project "${SCRIPT_DIR}/backend"
        ;;
esac

echo "📝 To verify: npx vercel env ls --cwd ${SCRIPT_DIR}/backend"
echo "📝 To verify: npx vercel env ls --cwd ${SCRIPT_DIR}/frontend"
