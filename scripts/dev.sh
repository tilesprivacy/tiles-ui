#!/bin/bash

# Starts the Tiles UI development servers (Vite and Storybook).
# The Tiles daemon needs to be running separately on port 1729.
#
# Usage:
#   npm run dev

cd "$(dirname "$0")/.."

if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm ci
fi

cleanup() {
    echo "🧹 Cleaning up..."
    exit
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting development servers..."
echo "📝 Note: start the Tiles daemon separately with \`tiles daemon\`"
storybook dev -p 6006 --ci & vite dev --host 0.0.0.0 &

wait
