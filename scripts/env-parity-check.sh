#!/usr/bin/env bash
set -euo pipefail

# Environment parity check for CPP Europe deployments.
# Compares Staging vs Production for key services:
# - Frontend stack (repo url, branch, HEAD, dirty state)
# - userMediaProfile backend (repo url, branch, HEAD, dirty state)

STAGING_FRONT_SSH="root@93.127.167.134"
PROD_FRONT_SSH="administrator@77.93.152.116"
PROD_FRONT_PORT="10037"

CONTABO_SSH="root@62.171.186.233"
CONTABO_KEY="~/.ssh/id_ed25519"

STAGING_FRONT_DIR="/var/www/cppeurope-staging"
PROD_FRONT_DIR="/var/www/cppeurope-prod"

STAGING_MEDIA_DIR="/opt/contabo-cppeurope/staging-compose-media-locale-ump"
PROD_MEDIA_DIR="/opt/contabo-cppeurope/userMediaProfile-backend"

red() { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
section() { printf '\n==== %s ====\n' "$*"; }

OVERALL_STATUS=0

fetch_git_meta() {
  local ssh_base="$1"
  local path="$2"

  $ssh_base "cd '$path' && \
    echo REPO=\$(git config --get remote.origin.url || true) && \
    echo BRANCH=\$(git branch --show-current || true) && \
    echo HEAD=\$(git rev-parse --short HEAD || true) && \
    echo DIRTY=\$(if [ -n \"\$(git status --porcelain 2>/dev/null)\" ]; then echo yes; else echo no; fi)"
}

fetch_git_meta_staging_front() {
  fetch_git_meta "ssh -o BatchMode=yes ${STAGING_FRONT_SSH}" "$STAGING_FRONT_DIR"
}

fetch_git_meta_prod_front() {
  fetch_git_meta "ssh -o BatchMode=yes -p ${PROD_FRONT_PORT} ${PROD_FRONT_SSH}" "$PROD_FRONT_DIR"
}

fetch_git_meta_staging_media() {
  fetch_git_meta "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i ${CONTABO_KEY} ${CONTABO_SSH}" "$STAGING_MEDIA_DIR"
}

fetch_git_meta_prod_media() {
  fetch_git_meta "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -i ${CONTABO_KEY} ${CONTABO_SSH}" "$PROD_MEDIA_DIR"
}

parse_value() {
  local key="$1"
  local blob="$2"
  printf '%s\n' "$blob" | sed -n "s/^${key}=//p" | head -n 1
}

report_pair() {
  local label="$1"
  local a_name="$2"
  local a_blob="$3"
  local b_name="$4"
  local b_blob="$5"

  local a_repo a_branch a_head a_dirty
  local b_repo b_branch b_head b_dirty

  a_repo="$(parse_value REPO "$a_blob")"
  a_branch="$(parse_value BRANCH "$a_blob")"
  a_head="$(parse_value HEAD "$a_blob")"
  a_dirty="$(parse_value DIRTY "$a_blob")"

  b_repo="$(parse_value REPO "$b_blob")"
  b_branch="$(parse_value BRANCH "$b_blob")"
  b_head="$(parse_value HEAD "$b_blob")"
  b_dirty="$(parse_value DIRTY "$b_blob")"

  section "$label"
  echo "$a_name: repo=$a_repo | branch=$a_branch | head=$a_head | dirty=$a_dirty"
  echo "$b_name: repo=$b_repo | branch=$b_branch | head=$b_head | dirty=$b_dirty"

  local ok=true
  if [[ "$a_repo" != "$b_repo" ]]; then
    red "Repo mismatch"
    ok=false
  fi
  if [[ "$a_branch" != "$b_branch" ]]; then
    red "Branch mismatch"
    ok=false
  fi
  if [[ "$a_head" != "$b_head" ]]; then
    yellow "HEAD mismatch"
    ok=false
  fi
  if [[ "$a_dirty" != "no" || "$b_dirty" != "no" ]]; then
    yellow "Dirty working tree detected"
    ok=false
  fi

  if [[ "$ok" == true ]]; then
    green "PARITY: OK"
  else
    red "PARITY: DRIFT"
    OVERALL_STATUS=1
  fi
}

section "Collecting"

staging_front_meta="$(fetch_git_meta_staging_front)"
prod_front_meta="$(fetch_git_meta_prod_front)"

staging_media_meta="$(fetch_git_meta_staging_media)"
prod_media_meta="$(fetch_git_meta_prod_media)"

report_pair "Frontend (Staging vs Production)" "staging-front" "$staging_front_meta" "prod-front" "$prod_front_meta"
report_pair "Media Profile Backend (Staging vs Production)" "staging-media" "$staging_media_meta" "prod-media" "$prod_media_meta"

echo
section "Done"

if [[ "$OVERALL_STATUS" -ne 0 ]]; then
  red "Global parity status: DRIFT"
  exit 1
fi

green "Global parity status: OK"