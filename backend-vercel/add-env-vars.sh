#!/bin/bash
# Script to add environment variables to Vercel from .env files
# Usage: ./add-env-vars.sh preview  (reads from .env.preview)
#        ./add-env-vars.sh production  (reads from .env.production)
#        ./add-env-vars.sh preview --force  (override existing variables)

# Don't exit on error - we want to handle errors gracefully
set +e

# Check if environment argument provided
if [ -z "$1" ]; then
  echo "Usage: ./add-env-vars.sh <preview|production> [--force]"
  echo "Example: ./add-env-vars.sh preview"
  echo "         ./add-env-vars.sh preview --force  (override existing variables)"
  exit 1
fi

ENV=$1
FORCE=false

# Check for --force flag
if [ "$2" = "--force" ]; then
  FORCE=true
fi

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

# Check if Node.js is available (either via nvm or system installation)
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed!"
  echo "Please install Node.js first."
  exit 1
fi

# Try to use nvm if available, otherwise use system Node.js
if [ -d "$HOME/.nvm" ]; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm use default 2>/dev/null || true
fi

echo "========================================="
echo "Using Node.js: $(node --version)"
echo "Adding Environment Variables to Vercel"
echo "Environment: $ENV"
echo "Reading from: $ENV_FILE"
if [ "$FORCE" = true ]; then
  echo "Mode: FORCE (will override existing variables)"
else
  echo "Mode: Normal (will skip existing variables)"
fi
echo "========================================="
echo ""

# Function to get value from .env file
get_env_value() {
  local key=$1
  local value=$(grep "^${key}=" "$ENV_FILE" | cut -d '=' -f 2- | tr -d '\r\n' | sed 's/[[:space:]]*$//')
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

  # In force mode, remove existing variable first
  if [ "$FORCE" = true ]; then
    echo "🔄 Removing existing variable (force mode)..."
    npx vercel env rm "$key" "$ENV" -y 2>/dev/null || echo "   (variable didn't exist, continuing...)"
  fi

  # Try to add the variable
  # Vercel CLI reads the value from stdin
  if [ "$sensitive" = "true" ]; then
    echo "🔒 Sensitive: YES (will be hidden)"
    echo "Value: ***hidden***"
    output=$(printf "%s\n" "$value" | npx vercel env add "$key" "$ENV" --sensitive 2>&1)
    exit_code=$?
  else
    echo "🔓 Sensitive: NO"
    echo "Value: ${value:0:40}..."
    output=$(printf "%s\n" "$value" | npx vercel env add "$key" "$ENV" 2>&1)
    exit_code=$?
  fi

  # Check the output for success or already exists
  if [ $exit_code -eq 124 ]; then
    echo "⏱️  Timeout - command took too long"
  elif echo "$output" | grep -q "already exists"; then
    echo "ℹ️  Variable already exists - skipping (use --force to override)"
  elif echo "$output" | grep -iq "success\|created\|added"; then
    echo "✓ $key added successfully"
  elif echo "$output" | grep -iq "error"; then
    echo "✗ Failed to add $key"
    echo "   Error: $output"
  elif [ $exit_code -eq 0 ]; then
    echo "✓ $key added successfully"
  else
    echo "⚠️  Unknown result (exit code: $exit_code)"
    echo "   Output: $output"
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
echo "4/7 - STRIPE_PRICE_ID_BASIC"
add_env "STRIPE_PRICE_ID_BASIC" "false"

echo "5/7 - STRIPE_PRICE_ID_FULL"
add_env "STRIPE_PRICE_ID_FULL" "false"

echo "6/7 - ALLOWED_ORIGINS"
add_env "ALLOWED_ORIGINS" "false"

echo "7/7 - PUBLIC_URL"
add_env "PUBLIC_URL" "false"

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
