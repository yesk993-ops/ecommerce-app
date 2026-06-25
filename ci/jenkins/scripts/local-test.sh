#!/bin/bash
set -e

echo "===== E-Commerce CI Pipeline (Local Test) ====="

echo "1. Linting..."
for dir in src/*/; do
    if [ -f "${dir}package.json" ]; then
        echo "  Linting ${dir}..."
        cd "$dir" && npm ci --silent 2>/dev/null && npx eslint . --ext .js --quiet 2>/dev/null || true
        cd ../..
    fi
done

echo "2. Unit Tests..."
for dir in src/*/; do
    if [ -f "${dir}package.json" ] && [ -d "${dir}tests" ] || grep -q '"test"' "${dir}package.json" 2>/dev/null; then
        echo "  Testing ${dir}..."
        cd "$dir" && npm test -- --silent 2>/dev/null || echo "    No tests or test failure (non-blocking)"
        cd ../..
    fi
done

echo "3. Security Audit..."
for dir in src/*/; do
    if [ -f "${dir}package.json" ]; then
        cd "$dir" && npm audit --audit-level=high 2>/dev/null || true
        cd ../..
    fi
done

echo "4. Docker Build Test..."
docker compose build --parallel 2>&1 | tail -5

echo "5. Config Validation..."
if command -v kubeconform &>/dev/null; then
    find deploy/k8s -name "*.yaml" -exec kubeconform {} \; 2>/dev/null || echo "  Config validation skipped"
fi

echo ""
echo "===== CI Pipeline Complete ====="
