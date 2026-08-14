#!/bin/sh
set -eu

# Target path for the runtime configuration
CONFIG_FILE="/usr/share/nginx/html/config.json"

# Ensure target directory exists
mkdir -p "$(dirname "$CONFIG_FILE")"

echo "Generating runtime configuration at $CONFIG_FILE..."

# Write JSON starting curly brace
echo "{" > "$CONFIG_FILE"

# Flags and temp variables
first=1

# Find all environment variables starting with "EQUIPOSE_" and loop through them
# Use env and grep in a POSIX-compliant way.
# We replace newlines with spaces or read line by line.
env | grep "^EQUIPOSE_" | while read -r line || [ -n "$line" ]; do
  name=$(echo "$line" | cut -d'=' -f1)
  value=$(echo "$line" | cut -d'=' -f2-)
  
  # Strip the EQUIPOSE_ prefix to get clean config key
  clean_name=$(echo "$name" | sed 's/^EQUIPOSE_//')
  
  # Escape any quotes and backslashes in the value
  safe_value=$(echo "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
  
  # Append comma if not the first entry
  if [ "$first" -eq 1 ]; then
    first=0
  else
    printf ",\n" >> "$CONFIG_FILE"
  fi
  
  # Write the key-value pair
  printf "  \"%s\": \"%s\"" "$clean_name" "$safe_value" >> "$CONFIG_FILE"
done

# If no EQUIPOSE_ environment variables are set, write some defaults
# We check if the file only contains "{\n"
if [ "$(wc -l < "$CONFIG_FILE")" -eq 1 ]; then
  cat <<EOF >> "$CONFIG_FILE"
  "API_URL": "${EQUIPOSE_API_URL:-http://localhost:8080/api}",
  "AUTH_URL": "${EQUIPOSE_AUTH_URL:-http://localhost:8080/auth}",
  "ENVIRONMENT": "${EQUIPOSE_ENVIRONMENT:-production}"
EOF
else
  # Add a trailing newline to finalize JSON formatting
  printf "\n" >> "$CONFIG_FILE"
fi

# Write JSON ending curly brace
echo "}" >> "$CONFIG_FILE"

echo "Configuration generation complete! Result:"
cat "$CONFIG_FILE"
