#!/bin/bash

# Script to add all environment variables from .env.preview to Vercel
# Usage: ./add-env-vars.sh preview [--force]
# or: ./add-env-vars.sh production [--force]
#
# --force: Overwrite existing variables without prompting

ENVIRONMENT=${1:-preview}
FORCE_FLAG=""

# Check for --force flag
if [[ "$2" == "--force" ]] || [[ "$1" == "--force" ]]; then
    FORCE_FLAG="--force"
    echo "⚠️  Force mode enabled - existing variables will be overwritten"
    echo ""
fi

ENV_FILE=".env.${ENVIRONMENT}"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found!"
    exit 1
fi

echo "📦 Adding environment variables from $ENV_FILE to Vercel ($ENVIRONMENT environment)"
echo ""

# Read the file line by line
while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    if [[ -z "$line" ]] || [[ "$line" =~ ^# ]]; then
        continue
    fi

    # Extract key and value
    if [[ "$line" =~ ^([A-Z_]+)=(.*)$ ]]; then
        KEY="${BASH_REMATCH[1]}"
        VALUE="${BASH_REMATCH[2]}"

        # Remove surrounding quotes if present
        VALUE="${VALUE#\"}"
        VALUE="${VALUE%\"}"
        VALUE="${VALUE#\'}"
        VALUE="${VALUE%\'}"

        # Remove newlines and carriage returns
        VALUE=$(echo "$VALUE" | tr -d '\n\r')

        echo "Adding: $KEY"

        # Add to Vercel (will prompt for confirmation unless --force is used)
        # Use npx if vercel is not installed globally
        # Pass empty string for branch (applies to all preview branches)
        if [ -n "$FORCE_FLAG" ]; then
            echo "$VALUE" | npx vercel env add "$KEY" "$ENVIRONMENT" "" --force
        else
            echo "$VALUE" | npx vercel env add "$KEY" "$ENVIRONMENT" ""
        fi

        if [ $? -eq 0 ]; then
            echo "✅ $KEY added successfully"
        else
            echo "❌ Failed to add $KEY"
        fi
        echo ""
    fi
done < "$ENV_FILE"

echo ""
echo "✅ Done! All variables processed."
echo ""
echo "📝 To verify, run: npx vercel env ls"
echo "🚀 To deploy: npx vercel --prod"
