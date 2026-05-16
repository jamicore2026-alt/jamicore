#requires -Version 5.1
<#
.SYNOPSIS
    Environment initialization script for jamicore SaaS e-commerce platform.
.DESCRIPTION
    Verifies all prerequisites, starts infrastructure, checks database state,
    and ensures a clean workspace before development begins.
    Run this at the start of EVERY session.
.NOTES
    FileName: init.ps1
    Author: Claude Code Harness
    Date: 2026-05-13
#>

[CmdletBinding()]
param(
    [switch]$SkipDocker,
    [switch]$SkipDBCheck,
    [switch]$SkipTypeCheck,
    [switch]$ShowVerbose
)

$ErrorActionPreference = 'Stop'
$script:Errors = @()
$script:Warnings = @()

function Write-Section($Title) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Check($Message, $Status) {
    switch ($Status) {
        'PASS'  { Write-Host "  [PASS] $Message" -ForegroundColor Green }
        'FAIL'  { Write-Host "  [FAIL] $Message" -ForegroundColor Red; $script:Errors += $Message }
        'WARN'  { Write-Host "  [WARN] $Message" -ForegroundColor Yellow; $script:Warnings += $Message }
        'INFO'  { Write-Host "  [INFO] $Message" -ForegroundColor White }
    }
}

# ============================================
# 1. Node.js Version
# ============================================
Write-Section "1. Node.js"
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion -match 'v(\d+)\.(\d+)\.(\d+)') {
        $major = [int]$Matches[1]
        if ($major -ge 22) {
            Write-Check "Node.js $nodeVersion (required: 22+)" 'PASS'
        } else {
            Write-Check "Node.js $nodeVersion (required: 22+)" 'FAIL'
        }
    } else {
        Write-Check "Node.js not found" 'FAIL'
    }
} catch {
    Write-Check "Node.js not installed or not in PATH" 'FAIL'
}

# ============================================
# 2. pnpm Version
# ============================================
Write-Section "2. pnpm"
try {
    $pnpmVersion = pnpm --version 2>$null
    if ($pnpmVersion -match '(\d+)\.(\d+)\.(\d+)') {
        $major = [int]$Matches[1]
        if ($major -ge 9) {
            Write-Check "pnpm $pnpmVersion (required: 9+)" 'PASS'
        } else {
            Write-Check "pnpm $pnpmVersion (required: 9+)" 'FAIL'
        }
    } else {
        Write-Check "pnpm not found" 'FAIL'
    }
} catch {
    Write-Check "pnpm not installed" 'FAIL'
}

# ============================================
# 3. Git Status
# ============================================
Write-Section "3. Git Status"
try {
    $branch = git branch --show-current 2>$null
    if ($branch -eq 'main') {
        Write-Check "On branch: $branch" 'PASS'
    } else {
        Write-Check "On branch: $branch (not main)" 'WARN'
    }

    $status = git status --porcelain 2>$null
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Check "Working tree clean" 'PASS'
    } else {
        $changed = ($status -split "`n").Count
        Write-Check "Working tree has $changed changed files" 'WARN'
        if ($ShowVerbose) {
            Write-Host "`n  Changed files:" -ForegroundColor Gray
            $status | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
        }
    }
} catch {
    Write-Check "Git not available" 'WARN'
}

# ============================================
# 4. Docker & Infrastructure
# ============================================
Write-Section "4. Docker Infrastructure"
if (-not $SkipDocker) {
    try {
        $dockerInfo = docker info 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Check "Docker daemon running" 'PASS'
        } else {
            Write-Check "Docker daemon not running" 'FAIL'
        }

        # Check PostgreSQL container
        $pgContainer = docker ps --filter "name=postgres" --format "{{.Names}}" 2>$null
        if ($pgContainer) {
            Write-Check "PostgreSQL container running" 'PASS'
        } else {
            Write-Check "PostgreSQL container not running" 'WARN'
            Write-Host "  Run: docker compose up -d" -ForegroundColor Gray
        }

        # Check Redis container
        $redisContainer = docker ps --filter "name=redis" --format "{{.Names}}" 2>$null
        if ($redisContainer) {
            Write-Check "Redis container running" 'PASS'
        } else {
            Write-Check "Redis container not running" 'WARN'
            Write-Host "  Run: docker compose up -d" -ForegroundColor Gray
        }
    } catch {
        Write-Check "Docker not installed or not in PATH" 'FAIL'
    }
} else {
    Write-Check "Skipped (use -SkipDocker to skip)" 'INFO'
}

# ============================================
# 5. Environment File
# ============================================
Write-Section "5. Environment Configuration"
$envFiles = @('.env', '.env.example')
foreach ($envFile in $envFiles) {
    if (Test-Path $envFile) {
        Write-Check "$envFile exists" 'PASS'
    } else {
        Write-Check "$envFile missing" 'WARN'
    }
}

# Check JWT_SECRET is set (not empty/default)
if (Test-Path '.env') {
    $envContent = Get-Content '.env' -Raw
    if ($envContent -match 'JWT_SECRET=.+') {
        Write-Check "JWT_SECRET configured" 'PASS'
    } else {
        Write-Check "JWT_SECRET not configured in .env" 'WARN'
    }
}

# ============================================
# 6. Dependencies
# ============================================
Write-Section "6. Dependencies"
if (Test-Path 'node_modules') {
    Write-Check "node_modules exists" 'PASS'
} else {
    Write-Check "node_modules missing - run: pnpm install" 'WARN'
}

# Check backend deps
if (Test-Path 'apps/backend/node_modules') {
    Write-Check "Backend dependencies installed" 'PASS'
} else {
    Write-Check "Backend dependencies missing" 'WARN'
}

# ============================================
# 7. Database Migrations
# ============================================
Write-Section "7. Database"
if (-not $SkipDBCheck) {
    # Check if drizzle migrations directory exists
    $migrationCount = (Get-ChildItem 'apps/backend/drizzle' -Filter '*.sql' -ErrorAction SilentlyContinue).Count
    if ($migrationCount -gt 0) {
        Write-Check "Found $migrationCount migration files" 'PASS'
    } else {
        Write-Check "No migrations found" 'WARN'
    }

    # Check drizzle meta
    if (Test-Path 'apps/backend/drizzle/meta') {
        Write-Check "Drizzle meta exists" 'PASS'
    } else {
        Write-Check "Drizzle meta missing" 'WARN'
    }
} else {
    Write-Check "Skipped (use -SkipDBCheck to skip)" 'INFO'
}

# ============================================
# 8. TypeScript Check
# ============================================
Write-Section "8. TypeScript"
if (-not $SkipTypeCheck) {
    try {
        Push-Location apps/backend
        $typecheckOutput = pnpm typecheck 2>&1
        $typecheckExit = $LASTEXITCODE
        Pop-Location

        if ($typecheckExit -eq 0) {
            $msg = 'TypeScript check passed (0 errors)'
            Write-Check $msg 'PASS'
        } else {
            $errorCount = ($typecheckOutput | Select-String 'error TS').Count
            $msg2 = "TypeScript has $errorCount errors"
            Write-Check $msg2 'FAIL'
            if ($ShowVerbose) {
                Write-Host "`n  Output:" -ForegroundColor Gray
                $typecheckOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
            }
        }
    } catch {
        Write-Check "TypeScript check failed to run" 'WARN'
    }
} else {
    Write-Check "Skipped (use -SkipTypeCheck to skip)" 'INFO'
}

# ============================================
# 9. Code Quality Checks
# ============================================
Write-Section "9. Code Quality"

# Check for console.log in backend
$consoleLogs = Get-ChildItem -Path "apps/backend/src" -Recurse -File | Select-String -Pattern "console\.log" -ErrorAction SilentlyContinue
if ($consoleLogs) {
    $count = $consoleLogs.Count
    Write-Check "Found $count console.log statements" 'WARN'
    if ($ShowVerbose) {
        $consoleLogs | Select-Object -First 5 | ForEach-Object {
            Write-Host "    $($_.Path):$($_.LineNumber)" -ForegroundColor Gray
        }
    }
} else {
    Write-Check "No console.log found" 'PASS'
}

# Check for any types
$anyTypes = Get-ChildItem -Path "apps/backend/src" -Recurse -File | Select-String -Pattern ":\s*any\b" -ErrorAction SilentlyContinue
if ($anyTypes) {
    $count = $anyTypes.Count
    Write-Check "Found $count ': any' type usages" 'WARN'
} else {
    Write-Check "No ': any' types found" 'PASS'
}

# ============================================
# 10. Harness Files
# ============================================
Write-Section "10. Harness Files"
$harnessFiles = @('CLAUDE.md', 'AGENTS.md', 'feature_list.json', 'PROGRESS.md', 'init.ps1')
foreach ($file in $harnessFiles) {
    if (Test-Path $file) {
        Write-Check "$file exists" 'PASS'
    } else {
        Write-Check "$file missing" 'WARN'
    }
}

# ============================================
# Summary
# ============================================
Write-Section "Summary"
$totalChecks = $script:Errors.Count + $script:Warnings.Count + ($script:Checks - $script:Errors.Count - $script:Warnings.Count)

$errColor = if ($script:Errors.Count -gt 0) { 'Red' } else { 'Green' }
$warnColor = if ($script:Warnings.Count -gt 0) { 'Yellow' } else { 'Green' }
Write-Host "`n  Errors:   $($script:Errors.Count)" -ForegroundColor $errColor
Write-Host "  Warnings: $($script:Warnings.Count)" -ForegroundColor $warnColor

if ($script:Errors.Count -gt 0) {
    Write-Host "`n  FAILED checks:" -ForegroundColor Red
    $script:Errors | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    Write-Host "`n  Please fix the FAILED checks before proceeding." -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n  Environment is ready!" -ForegroundColor Green
    Write-Host "`n  Next steps:" -ForegroundColor White
    Write-Host '    1. Read feature_list.json to select work' -ForegroundColor Gray
    Write-Host '    2. Read PROGRESS.md for context' -ForegroundColor Gray
    Write-Host '    3. Start the dev server: pnpm dev' -ForegroundColor Gray
    exit 0
}
