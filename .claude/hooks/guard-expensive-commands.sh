#!/bin/bash

INPUT=$(cat)
COMMAND=$(jq -r '.tool_input.command // ""' <<<"$INPUT")
NORMALIZED=$(printf '%s' "$COMMAND" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g; s/^ //; s/ $//')

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

case "$NORMALIZED" in
  "npm test"|"npm run test"|"pnpm test"|"pnpm run test"|"yarn test")
    deny "Full test suite blocked. Run focused test files with: npx vitest run <test-files>"
    ;;

  "npx vitest"|"npx vitest run"|"vitest"|"vitest run")
    deny "Broad Vitest run blocked. Provide explicit test file paths."
    ;;

  "npm run lint"|"pnpm lint"|"pnpm run lint"|"yarn lint"|"npx eslint ."|"eslint .")
    deny "Full-project lint blocked. Run ESLint only on modified source files."
    ;;

  "npm run build"|"pnpm build"|"pnpm run build"|"yarn build"|"next build"|"npx next build")
    deny "Production build blocked inside Claude. Run it manually when explicitly needed."
    ;;

  "find ."|"find . "*)
    deny "Broad filesystem scan blocked. Use GitNexus or a targeted file query."
    ;;
esac

exit 0
