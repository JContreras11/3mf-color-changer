# Dev Sessions via LocalXpose

This project supports ephemeral development sessions for remote review without affecting production.

## Goal

Each session should:
- start from `origin/main`
- create a new git branch
- run `next dev` on a free local port
- create a temporary HTTPS URL via LocalXpose
- return the URL to the operator/bot
- stop both the dev server and tunnel when the operator is satisfied
- push the branch to GitHub for manual merge

## Start a dev session

```bash
scripts/dev-session-start.sh <session-id> [branch-name] [subdomain]
```

Example:

```bash
scripts/dev-session-start.sh tg-20260411 bot/fix-auth-live mycaps-dev-123
```

The script prints JSON with:
- `branch`
- `port`
- `publicUrl`
- `worktree`
- process ids
- log paths

## Stop a dev session

```bash
scripts/dev-session-stop.sh <session-id> [--push]
```

Use `--push` to push the branch after the session finishes.

## Important

- Production app and nginx are not involved.
- No `/preview` base path is required.
- This workflow is dev-only.
- If `NEXT_PUBLIC_BASE_PATH` is unset, app behaves normally in local/prod environments.
