# Minimal Dev Sessions via LocalXpose

This repository uses a minimal single-repo dev workflow.

## Rules
- Work only in `/home/ubuntu/3mf-color-changer`
- Start from `main`
- Create a branch for each task
- Run `next dev` in this same repo
- Create a public HTTPS tunnel with LocalXpose
- When done, push branch and stop dev/tunnel
- Return to `main`

## Start

```bash
scripts/dev-start.sh <task-name> [branch-name] [subdomain]
```

The script prints JSON including:
- branch
- port
- publicUrl
- devPid
- tunnelPid

## Stop and push

```bash
scripts/dev-stop.sh push
```

## Stop and discard local runtime only

```bash
scripts/dev-stop.sh discard
```
