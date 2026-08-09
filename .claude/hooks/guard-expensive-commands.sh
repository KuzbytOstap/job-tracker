#!/bin/bash

INPUT=$(cat)
COMMAND=$(jq -r '.tool_input.command // ""' <<<"$INPUT")
NORMALIZED=$(printf '%s' "$COMMAND" | tr '\n' ' ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')

REASON_SUFFIX="Verification and Git finalization are handled manually by the user."

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
  "git commit"|"git commit "*)
    deny "Git commits are handled manually by the user. $REASON_SUFFIX"
    ;;

  "git push"|"git push "*)
    deny "Git pushes are handled manually by the user. $REASON_SUFFIX"
    ;;

  "npm test"|"npm test "*|"npm run test"|"npm run test "*|"pnpm test"|"pnpm test "*|"pnpm run test"|"pnpm run test "*|"yarn test"|"yarn test "*)
    deny "Full test suite blocked. $REASON_SUFFIX"
    ;;

  "npx vitest"|"npx vitest "*|"vitest"|"vitest "*)
    deny "Vitest execution blocked. $REASON_SUFFIX"
    ;;

  "npm run lint"|"npm run lint "*|"pnpm lint"|"pnpm lint "*|"pnpm run lint"|"pnpm run lint "*|"yarn lint"|"yarn lint "*|"npx eslint"*|"eslint"*)
    deny "ESLint execution blocked. $REASON_SUFFIX"
    ;;

  "npm run typecheck"|"npm run typecheck "*|"pnpm typecheck"|"pnpm typecheck "*|"pnpm run typecheck"|"pnpm run typecheck "*|"yarn typecheck"|"yarn typecheck "*|"npx tsc"|"npx tsc "*|"tsc"|"tsc "*)
    deny "TypeScript typecheck blocked. $REASON_SUFFIX"
    ;;

  "npm run build"|"npm run build "*|"pnpm build"|"pnpm build "*|"pnpm run build"|"pnpm run build "*|"yarn build"|"yarn build "*|"next build"|"next build "*|"npx next build"|"npx next build "*)
    deny "Production build blocked. $REASON_SUFFIX"
    ;;

  "npx playwright"*|"playwright"*)
    deny "Playwright execution blocked. $REASON_SUFFIX"
    ;;

  "find ."|"find . "*)
    deny "Broad filesystem scan blocked. Use GitNexus or a targeted file query."
    ;;
esac

exit 0
