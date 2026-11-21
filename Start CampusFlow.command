#!/usr/bin/env bash
# Double-click this file in Finder to run CampusFlow.
# It starts the local server, opens the app in your browser, and keeps running
# until you press Ctrl+C (or close this Terminal window).
set -u

cd "$(dirname "$0")" || exit 1

URL="http://localhost:4317/"

printf 'Starting CampusFlow…\n\n'
./start.sh &
server=$!

cleanup() {
  kill "$server" 2>/dev/null
}
trap cleanup EXIT INT TERM

ready=""
for _ in $(seq 1 90); do
  if ! kill -0 "$server" 2>/dev/null; then
    break
  fi
  if curl -fsS -o /dev/null "$URL" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [ -n "$ready" ]; then
  open "$URL"
  printf '\n\033[1mCampusFlow is running at %s\033[0m\n' "$URL"
  printf 'Keep this window open while you use the app. Press Ctrl+C to stop.\n\n'
else
  printf '\nThe server did not answer on port 4317.\n'
  printf 'Check the messages above for the cause.\n\n'
fi

wait "$server"
