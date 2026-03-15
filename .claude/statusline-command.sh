#!/usr/bin/env bash
input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
model=$(echo "$input" | jq -r '.model.display_name // ""')
remaining=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Shorten home directory to ~
home="$HOME"
short_cwd="${cwd/#$home/\~}"

# Build context portion only when data is available
ctx_part=""
if [ -n "$remaining" ]; then
  ctx_part=" | ctx: ${remaining}%"
fi

printf '\033[0;36m%s\033[0m \033[0;33m%s\033[0m\033[0;90m%s\033[0m' \
  "$short_cwd" "$model" "$ctx_part"
