#!/usr/bin/env bash
# ============================================================
# AgOS Cross-Check Script
# Validates SQL ↔ Dok 3 ↔ rpc_name_registry consistency
# Owner: QA Agent
# Usage: bash cross_check.sh
# Exit: 0 if no critical errors, 1 otherwise
# ============================================================

set -uo pipefail
# Note: no -e because grep returns 1 on no-match which would kill the script

CRITICAL=0
SIGNIFICANT=0
MINOR=0
SQL_FILES=(d01_kernel.sql d02_tsp.sql d03_feed.sql d04_vet.sql d05_ops_edu.sql d07_ai_gateway.sql d08_epidemic.sql)

echo "========================================"
echo "AgOS Cross-Check — $(date '+%Y-%m-%d %H:%M')"
echo "========================================"
echo ""

# ----------------------------------------------------------
# CHECK 1: Duplicate function definitions across SQL files
# Severity: CRITICAL (consolidation regression risk)
# ----------------------------------------------------------
echo "--- CHECK 1: Duplicate function definitions ---"

# Extract all function names from CREATE OR REPLACE FUNCTION lines
all_funcs=$(grep -h -i '^create or replace function' "${SQL_FILES[@]}" 2>/dev/null \
  | sed -E 's/^create or replace function\s+(public\.)?//i' \
  | sed -E 's/\s*\(.*$//' \
  | sort)

dupes=$(echo "$all_funcs" | uniq -d)

if [ -n "$dupes" ]; then
  while IFS= read -r fname; do
    # Find which files contain this function
    locations=$(grep -l -i "create or replace function.*${fname}" "${SQL_FILES[@]}" 2>/dev/null | tr '\n' ', ')
    # Count occurrences per file
    for f in "${SQL_FILES[@]}"; do
      count=$(grep -c -i "create or replace function.*${fname}" "$f" 2>/dev/null || true)
      if [ "$count" -gt 1 ]; then
        echo "  CRITICAL: ${fname} defined ${count} times in ${f}"
        ((CRITICAL++))
      fi
    done
    # Check cross-file duplicates
    file_count=$(grep -l -i "create or replace function.*${fname}" "${SQL_FILES[@]}" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$file_count" -gt 1 ]; then
      echo "  CRITICAL: ${fname} defined in multiple files: ${locations}"
      ((CRITICAL++))
    fi
  done <<< "$dupes"
else
  echo "  OK: No duplicate function definitions found"
fi

echo ""

# ----------------------------------------------------------
# CHECK 2: SQL files exist and are non-empty
# Severity: CRITICAL
# ----------------------------------------------------------
echo "--- CHECK 2: SQL files exist and non-empty ---"

for f in "${SQL_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  CRITICAL: $f does not exist"
    ((CRITICAL++))
  elif [ ! -s "$f" ]; then
    echo "  CRITICAL: $f is empty"
    ((CRITICAL++))
  else
    lines=$(wc -l < "$f" | tr -d ' ')
    echo "  OK: $f (${lines} lines)"
  fi
done

echo ""

# ----------------------------------------------------------
# CHECK 3: All rpc_* functions use SECURITY DEFINER
# Severity: SIGNIFICANT
# ----------------------------------------------------------
echo "--- CHECK 3: SECURITY DEFINER on all rpc_* functions ---"

for f in "${SQL_FILES[@]}"; do
  # Find rpc_ function definitions and check for security definer
  while IFS= read -r line_num; do
    # Read the next 25 lines after the function definition to find security definer
    # (functions with 7+ parameters can span 15+ lines before the clause)
    func_name=$(sed -n "${line_num}p" "$f" | sed -E 's/^create or replace function\s+(public\.)?//i' | sed -E 's/\s*\(.*$//')
    has_sec_def=$(sed -n "$((line_num)),$((line_num+25))p" "$f" | grep -ci 'security definer' || true)
    if [ "$has_sec_def" -eq 0 ]; then
      echo "  SIGNIFICANT: ${func_name} in ${f}:${line_num} — missing SECURITY DEFINER"
      ((SIGNIFICANT++))
    fi
  done < <(grep -n -i '^create or replace function.*rpc_' "$f" 2>/dev/null | cut -d: -f1)
done

if [ "$SIGNIFICANT" -eq 0 ]; then
  echo "  OK: All rpc_* functions have SECURITY DEFINER"
fi

echo ""

# ----------------------------------------------------------
# CHECK 4: Advisory lock usage (should be SKIP LOCKED)
# Severity: SIGNIFICANT (L-NEW-2)
# ----------------------------------------------------------
echo "--- CHECK 4: No advisory locks (L-NEW-2) ---"

# Filter out SQL comments (lines starting with --) to avoid false positives
adv_locks=$(grep -rn -i 'pg_advisory_lock\|pg_try_advisory_lock' "${SQL_FILES[@]}" 2>/dev/null \
  | grep -v '^\([^:]*:[^:]*:\)\s*--' || true)
if [ -n "$adv_locks" ]; then
  echo "  SIGNIFICANT: Advisory lock usage found (should use SKIP LOCKED):"
  echo "$adv_locks" | while IFS= read -r line; do
    echo "    $line"
    ((SIGNIFICANT++))
  done
else
  echo "  OK: No advisory lock usage in executable code"
fi

echo ""

# ----------------------------------------------------------
# CHECK 5: All rpc_* functions have organization_id parameter
# Severity: SIGNIFICANT (P-AI-2)
# ----------------------------------------------------------
echo "--- CHECK 5: organization_id in rpc_* signatures (P-AI-2) ---"

exceptions="get_active_prompt|rpc_name_registry"
sig_count_before=$SIGNIFICANT

for f in "${SQL_FILES[@]}"; do
  while IFS= read -r match; do
    line_num=$(echo "$match" | cut -d: -f1)
    func_name=$(echo "$match" | sed -E 's/^[0-9]+:create or replace function\s+(public\.)?//i' | sed -E 's/\s*\(.*$//')

    # Skip known exceptions
    if echo "$func_name" | grep -qiE "$exceptions"; then
      continue
    fi

    # Skip internal helper functions (prefixed with _)
    if echo "$func_name" | grep -q '^_'; then
      continue
    fi

    # Check next 5 lines for organization_id parameter
    has_org_id=$(sed -n "$((line_num)),$((line_num+5))p" "$f" | grep -ci 'organization_id' || true)
    if [ "$has_org_id" -eq 0 ]; then
      echo "  SIGNIFICANT: ${func_name} in ${f}:${line_num} — missing organization_id parameter"
      ((SIGNIFICANT++))
    fi
  done < <(grep -n -i '^create or replace function.*rpc_' "$f" 2>/dev/null)
done

if [ "$SIGNIFICANT" -eq "$sig_count_before" ]; then
  echo "  OK: All rpc_* functions have organization_id"
fi

echo ""


echo ""
echo "--- CHECK 6: UI values match SQL CHECK constraints ---"
UI_ERRORS=0

# shelter_type
for val in $(grep -oP "value: '\K[^']*" src/pages/cabinet/FarmProfile.tsx 2>/dev/null | head -4); do
  if ! grep -q "'$val'" d01_kernel.sql 2>/dev/null; then
    echo "  CRITICAL: UI shelter_type '$val' not in SQL"
    UI_ERRORS=$((UI_ERRORS + 1))
  fi
done

# animal_category codes
for val in $(grep -oP "code: '\K[A-Z_]*" src/pages/cabinet/FarmProfile.tsx 2>/dev/null); do
  if ! grep -q "'$val'" d01_kernel.sql 2>/dev/null; then
    echo "  CRITICAL: UI animal_category '$val' not in SQL"
    UI_ERRORS=$((UI_ERRORS + 1))
  fi
done

if [ $UI_ERRORS -eq 0 ]; then
  echo "  OK: All UI values match SQL constraints"
else
  echo "  FOUND: $UI_ERRORS UI value mismatches"
  CRITICAL=$((CRITICAL + UI_ERRORS))
fi

# ----------------------------------------------------------
# SUMMARY
# ----------------------------------------------------------
echo "========================================"
echo "SUMMARY"
echo "========================================"
echo "  Critical:    $CRITICAL"
echo "  Significant: $SIGNIFICANT"
echo "  Minor:       $MINOR"
echo "========================================"

if [ "$CRITICAL" -gt 0 ]; then
  echo "RESULT: FAIL — $CRITICAL critical error(s)"
  exit 1
else
  echo "RESULT: $CRITICAL critical errors"
  exit 0
fi
