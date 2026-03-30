#!/bin/bash
# Script to build and minimize assets for production
set -e
echo "Installing dependencies..."
npm install
echo "Building and minimizing assets..."
npm run build
echo "Production build complete. Output is in the 'dist' directory."
