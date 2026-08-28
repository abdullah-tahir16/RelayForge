#!/bin/sh

set -eu

backend_pid=""
frontend_pid=""

cleanup() {
  trap - INT TERM EXIT

  if [ -n "$backend_pid" ]; then
    kill "$backend_pid" 2>/dev/null || true
  fi

  if [ -n "$frontend_pid" ]; then
    kill "$frontend_pid" 2>/dev/null || true
  fi

  if [ -n "$backend_pid" ]; then
    wait "$backend_pid" 2>/dev/null || true
  fi

  if [ -n "$frontend_pid" ]; then
    wait "$frontend_pid" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

echo "Starting backend on http://localhost:3000"
pnpm --dir apps/backend run dev &
backend_pid=$!

echo "Starting frontend on http://localhost:5173"
pnpm --dir apps/frontend run dev &
frontend_pid=$!

while :; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    wait "$backend_pid"
    exit $?
  fi

  if ! kill -0 "$frontend_pid" 2>/dev/null; then
    wait "$frontend_pid"
    exit $?
  fi

  sleep 1
done
