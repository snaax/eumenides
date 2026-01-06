#!/bin/bash
# Script to add environment variables to Vercel from .env files
# Usage: ./add-env-vars.sh preview  (reads from .env.preview)
#        ./add-env-vars.sh production  (reads from .env.production)

set -e

# Check if environment argument provided
if [ -z "$1" ]; then
  echo "Usage: ./add-env-vars.sh <preview|production>"
  echo "Example: ./add-env-vars.sh preview"
  exit 1
fi

ENV=$1

if [ "$ENV" != "preview" ] && [ "$ENV" != "production" ]; then
  echo "Error: Environment must be 'preview' or 'production'"
  exit 1
fi

ENV_FILE=".env.$ENV"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found!"
  echo "Please create $ENV_FILE with your environment variables first."
  exit 1
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use default

echo "========================================="
echo "Adding Environment Variables to Vercel"
echo "Environment: $ENV"
echo "Reading from: $ENV_FILE"
echo "========================================="
echo ""

# Function to get value from .env file
get_env_value() {
  local key=$1
  local value=$(grep "^${key}=" "$ENV_FILE" | cut -d '=' -f 2-)
  echo "$value"
}

# Function to add environment variable
add_env() {
  local key=$1
  local sensitive=$2  # "true" or "false"
  local value=$(get_env_value "$key")

  if [ -z "$value" ]; then
    echo "⚠️  Warning: $key not found in $ENV_FILE, skipping..."
    return
  fi

  echo "Adding: $key"
  if [ "$sensitive" = "true" ]; then
    echo "🔒 Sensitive: YES (will be hidden)"
    echo "Value: ***hidden***"
    echo "$value" | npx vercel env add "$key" "$ENV" --sensitive
  else
    echo "🔓 Sensitive: NO"
    echo "Value: ${value:0:40}..."
    echo "$value" | npx vercel env add "$key" "$ENV"
  fi

  if [ $? -eq 0 ]; then
    echo "✓ $key added successfully"
  else
    echo "✗ Failed to add $key"
  fi
  echo ""
}

# Add each environment variable
# Sensitive variables (will be hidden in Vercel UI)
echo "1/6 - DATABASE_URL (SENSITIVE)"
add_env "DATABASE_URL" "true"

echo "2/6 - STRIPE_SECRET_KEY (SENSITIVE)"
add_env "STRIPE_SECRET_KEY" "true"

echo "3/6 - STRIPE_WEBHOOK_SECRET (SENSITIVE)"
add_env "STRIPE_WEBHOOK_SECRET" "true"

# Non-sensitive variables (visible in Vercel UI)
echo "4/6 - STRIPE_PRICE_ID_BASIC"
add_env "STRIPE_PRICE_ID_BASIC" "false"

echo "5/6 - STRIPE_PRICE_ID_FULL"
add_env "STRIPE_PRICE_ID_FULL" "false"

echo "6/6 - ALLOWED_ORIGINS"
add_env "ALLOWED_ORIGINS" "false"

echo "========================================="
echo "✓ Done!"
echo "========================================="
echo ""
echo "Verify variables were added:"
echo "  npx vercel env ls"
echo ""
echo "Next step: Deploy to $ENV"
if [ "$ENV" = "preview" ]; then
  echo "  npx vercel"
else
  echo "  npx vercel --prod"
fi
