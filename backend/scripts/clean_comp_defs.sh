
#!/bin/bash

# Clean old computation definition artifacts
# These will be regenerated fresh during test initialization

echo "🧹 Cleaning old computation definition artifacts..."

cd "$(dirname "$0")/.."

# Remove any stale comp def JSON files (these might have wrong callback programs)
# Keep the circuit files as those are expensive to regenerate
rm -f artifacts/*comp_def*.json

echo "✅ Computation definition artifacts cleaned!"
echo ""
echo "ℹ️  These will be regenerated fresh during arcium test"
echo "   with the correct callback program ID"
