#!/usr/bin/env bash
# Split mixed lesson work onto two branches:
#   curriculum/**  -> branch from main
#   portal/**      -> branch from portalv1-dev
#
# All curriculum/KOALACADEMY.md hunks go to main, including Portal draft
# pointers (GitHub blob URLs on portalv1). Classify by path only.
#
# Never git add -A / git add .
# Never --no-verify
# Never force-push
set -euo pipefail

MAIN_BASE_NAME="main"
PORTAL_BASE_NAME="portalv1-dev"

DRY_RUN=0
DO_PUSH=0
MSG_CURRICULUM="Update core curriculum outline."
MSG_PORTAL="Add student-facing portal lesson."

usage() {
  cat <<'EOF'
Usage: scripts/split-curriculum-portal.sh [--dry-run] [--push]
                                          [--message-curriculum MSG]
                                          [--message-portal MSG]

Commits curriculum/ paths onto a branch from main, and portal/ paths onto a
branch from portalv1-dev. Refuses any other path.

curriculum/KOALACADEMY.md always rides with the main commit, including Portal
draft pointers (github.com blob URLs on portalv1).

  --dry-run                 Classify changes; do not stash, commit, or push
  --push                    Push both branches and open PRs with gh
  --message-curriculum MSG  Curriculum commit message
  --message-portal MSG      Portal commit message
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --push) DO_PUSH=1 ;;
    --message-curriculum)
      [ $# -ge 2 ] || die "--message-curriculum needs a value"
      MSG_CURRICULUM=$2
      shift
      ;;
    --message-portal)
      [ $# -ge 2 ] || die "--message-portal needs a value"
      MSG_PORTAL=$2
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      die "unknown argument: $1"
      ;;
  esac
  shift
done

ROOT=$(git rev-parse --show-toplevel) || die "not a git repository"
cd "$ROOT"

git rev-parse --is-inside-work-tree >/dev/null

resolve_base() {
  local name=$1
  if git show-ref --verify --quiet "refs/remotes/origin/$name"; then
    echo "origin/$name"
  elif git show-ref --verify --quiet "refs/heads/$name"; then
    echo "$name"
  else
    die "cannot find $name (looked for origin/$name and $name)"
  fi
}

# --- classify working tree ---------------------------------------------------

curriculum_files=()
portal_files=()
extra_files=()
has_rename=0

while IFS= read -r line || [ -n "$line" ]; do
  [ -n "$line" ] || continue
  xy=${line:0:2}
  path=${line:3}
  case "$xy" in
    R*|C*) has_rename=1 ;;
  esac
  case "$path" in
    *" -> "*) has_rename=1 ;;
  esac
  case "$path" in
    curriculum/*) curriculum_files+=("$path") ;;
    portal/*) portal_files+=("$path") ;;
    *) extra_files+=("$path") ;;
  esac
done < <(git status --porcelain -u --untracked-files=all)

if [ "$has_rename" -eq 1 ]; then
  die "rename/copy detected; split those paths by hand, then re-run"
fi

if [ ${#extra_files[@]} -gt 0 ]; then
  echo "error: paths outside curriculum/ and portal/:" >&2
  printf '  %s\n' "${extra_files[@]}" >&2
  echo "Refuse to split. Move or commit those files first." >&2
  exit 1
fi

if [ ${#curriculum_files[@]} -eq 0 ] && [ ${#portal_files[@]} -eq 0 ]; then
  echo "Nothing to split (no curriculum/ or portal/ changes)."
  exit 0
fi

MAIN_REF=$(resolve_base "$MAIN_BASE_NAME")
PORTAL_REF=$(resolve_base "$PORTAL_BASE_NAME")

echo "Classification"
echo "  curriculum files: ${#curriculum_files[@]}"
if [ ${#curriculum_files[@]} -gt 0 ]; then
  printf '    %s\n' "${curriculum_files[@]}"
fi
echo "  portal files:     ${#portal_files[@]}"
if [ ${#portal_files[@]} -gt 0 ]; then
  printf '    %s\n' "${portal_files[@]}"
fi
echo "  main base:        $MAIN_REF"
echo "  portal base:      $PORTAL_REF"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "Dry run: no stash, commit, or push."
  exit 0
fi

# --- snapshot and split ------------------------------------------------------

START_REF=$(git symbolic-ref --quiet --short HEAD || true)
START_SHA=$(git rev-parse HEAD)
TS=$(date +%Y%m%d-%H%M%S)-$$
CURR_BRANCH="curriculum/split-$TS"
PORTAL_BRANCH="portal/split-$TS"
BACKUP_REF="refs/backup/pre-split-$TS"
SUCCESS=0
DID_STASH=0
STASH=""

cleanup() {
  local ec=$?
  if [ "$SUCCESS" -eq 1 ]; then
    return 0
  fi
  if [ "$DID_STASH" -eq 1 ]; then
    git checkout "${START_REF:-$START_SHA}" >/dev/null 2>&1 || git checkout "$START_SHA" >/dev/null 2>&1 || true
    echo "Split failed. Restore the snapshot with:" >&2
    echo "  git stash apply --index $STASH" >&2
    echo "Backup ref: $BACKUP_REF" >&2
  fi
  exit "$ec"
}
trap cleanup EXIT

git stash push --include-untracked -m "split-curriculum-portal $TS" >/dev/null
DID_STASH=1
STASH=$(git rev-parse 'stash@{0}')
git update-ref "$BACKUP_REF" "$STASH"
echo "Snapshot: $BACKUP_REF ($STASH)"

PARENTS=$(git rev-parse "$STASH^@")
UNTRACKED=""
parent_count=$(printf '%s\n' "$PARENTS" | grep -c . || true)
if [ "$parent_count" -ge 3 ]; then
  UNTRACKED=$(git rev-parse "$STASH^3")
fi

restore_path() {
  local path=$1
  if git cat-file -e "$STASH:$path" 2>/dev/null; then
    git checkout "$STASH" -- "$path"
    return 0
  fi
  if [ -n "$UNTRACKED" ] && git cat-file -e "$UNTRACKED:$path" 2>/dev/null; then
    git checkout "$UNTRACKED" -- "$path"
    return 0
  fi
  if git cat-file -e "$START_SHA:$path" 2>/dev/null; then
    git rm -q -- "$path"
    return 0
  fi
  die "could not restore $path from stash $STASH"
}

commit_if_staged() {
  local message=$1
  if git diff --cached --quiet; then
    return 1
  fi
  git commit -m "$message"
}

push_and_pr() {
  local branch=$1
  local base=$2
  local title=$3
  git push -u origin "$branch"
  if command -v gh >/dev/null 2>&1; then
    gh pr create --base "$base" --head "$branch" --title "$title" --body "$(cat <<EOF
## Summary
- Split from mixed lesson work by \`scripts/split-curriculum-portal.sh\`

## Test plan
- [ ] Paths on this PR match the intended slice (curriculum vs portal)
EOF
)"
  else
    echo "gh not found; pushed $branch. Open a PR onto $base by hand."
  fi
}

return_to_start() {
  if [ -n "$START_REF" ]; then
    git checkout "$START_REF"
  else
    git checkout "$START_SHA"
  fi
}

delete_unused_branch() {
  local branch=$1
  return_to_start
  git branch -d "$branch" >/dev/null 2>&1 || true
}

CURR_SHA=""
PORTAL_SHA=""
did_curriculum=0
did_portal=0

if [ ${#curriculum_files[@]} -gt 0 ]; then
  git checkout -b "$CURR_BRANCH" "$MAIN_REF"
  for path in "${curriculum_files[@]}"; do
    restore_path "$path"
  done
  if commit_if_staged "$MSG_CURRICULUM"; then
    did_curriculum=1
    CURR_SHA=$(git rev-parse HEAD)
  else
    delete_unused_branch "$CURR_BRANCH"
  fi
fi

if [ ${#portal_files[@]} -gt 0 ]; then
  git checkout -b "$PORTAL_BRANCH" "$PORTAL_REF"
  for path in "${portal_files[@]}"; do
    restore_path "$path"
  done
  if commit_if_staged "$MSG_PORTAL"; then
    did_portal=1
    PORTAL_SHA=$(git rev-parse HEAD)
  else
    delete_unused_branch "$PORTAL_BRANCH"
  fi
fi

return_to_start

if [ "$DO_PUSH" -eq 1 ]; then
  if [ "$did_curriculum" -eq 1 ]; then
    git checkout "$CURR_BRANCH"
    push_and_pr "$CURR_BRANCH" "$MAIN_BASE_NAME" "$MSG_CURRICULUM"
  fi
  if [ "$did_portal" -eq 1 ]; then
    git checkout "$PORTAL_BRANCH"
    push_and_pr "$PORTAL_BRANCH" "$PORTAL_BASE_NAME" "$MSG_PORTAL"
  fi
  return_to_start
fi

SUCCESS=1
trap - EXIT

if git rev-parse --quiet --verify refs/stash >/dev/null 2>&1; then
  if [ "$(git rev-parse 'stash@{0}')" = "$STASH" ]; then
    git stash drop 'stash@{0}' >/dev/null
  fi
fi

echo
echo "Done."
if [ "$did_curriculum" -eq 1 ]; then
  echo "  Curriculum: $CURR_SHA on $CURR_BRANCH (base $MAIN_REF)"
else
  echo "  Curriculum: (no commit)"
fi
if [ "$did_portal" -eq 1 ]; then
  echo "  Portal:     $PORTAL_SHA on $PORTAL_BRANCH (base $PORTAL_REF)"
else
  echo "  Portal:     (no commit)"
fi
echo "  Backup:     $BACKUP_REF"
if [ "$DO_PUSH" -eq 0 ]; then
  echo
  echo "Not pushed. When you want remotes:"
  if [ "$did_curriculum" -eq 1 ]; then
    echo "  git push -u origin $CURR_BRANCH && gh pr create --base $MAIN_BASE_NAME --head $CURR_BRANCH"
  fi
  if [ "$did_portal" -eq 1 ]; then
    echo "  git push -u origin $PORTAL_BRANCH && gh pr create --base $PORTAL_BASE_NAME --head $PORTAL_BRANCH"
  fi
  echo "  or re-run with --push"
fi
