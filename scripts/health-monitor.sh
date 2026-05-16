#!/usr/bin/env bash
# ============================================
# Health Monitor â€” Lightweight alerting for Spaceship stack
# Run via cron: */5 * * * * /path/to/health-monitor.sh
# ============================================
set -euo pipefail

# Configuration (override via env vars)
API_URL="${API_URL:-http://localhost:3000}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3001}"
STOREFRONT_URL="${STOREFRONT_URL:-http://localhost:3002}"
STOREFRONT_FOOD_URL="${STOREFRONT_FOOD_URL:-http://localhost:3003}"
HEALTH_CHECK_KEY="${HEALTH_CHECK_KEY:-}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"  # Slack/Discord webhook URL
LOG_FILE="${LOG_FILE:-/var/log/spaceship-health.log}"
MAX_LOG_LINES="${MAX_LOG_LINES:-1000}"

# Status tracking
STATE_DIR="${STATE_DIR:-/tmp/spaceship-health}"
mkdir -p "$STATE_DIR"

log() {
  local level="$1"
  local msg="$2"
  local timestamp
  timestamp=$(date -Iseconds)
  echo "[$timestamp] [$level] $msg" | tee -a "$LOG_FILE"
  # Rotate log if too large
  if [[ -f "$LOG_FILE" ]] && [[ $(wc -l < "$LOG_FILE") -gt $MAX_LOG_LINES ]]; then
    tail -n "$MAX_LOG_LINES" "$LOG_FILE" > "$LOG_FILE.tmp"
    mv "$LOG_FILE.tmp" "$LOG_FILE"
  fi
}

send_alert() {
  local service="$1"
  local status="$2"
  local detail="$3"

  log "ALERT" "$service is $status: $detail"

  if [[ -n "$ALERT_WEBHOOK" ]]; then
    local payload
    payload=$(cat <<EOF
{
  "text": "ðŸš¨ Spaceship Alert: $service is $status",
  "attachments": [{
    "color": "danger",
    "fields": [
      {"title": "Service", "value": "$service", "short": true},
      {"title": "Status", "value": "$status", "short": true},
      {"title": "Detail", "value": "$detail", "short": false},
      {"title": "Time", "value": "$(date -Iseconds)", "short": false}
    ]
  }]
}
EOF
)
    curl -sf -X POST -H "Content-Type: application/json" -d "$payload" "$ALERT_WEBHOOK" >/dev/null 2>&1 || log "WARN" "Failed to send alert webhook"
  fi
}

check_service() {
  local name="$1"
  local url="$2"
  local state_file="$STATE_DIR/${name}.state"

  local http_code
  http_code=$(curl -sf -o /dev/null -w "%{http_code}" "$url/health" 2>/dev/null || echo "000")

  if [[ "$http_code" == "200" ]]; then
    # Service is healthy
    if [[ -f "$state_file" ]] && [[ $(cat "$state_file") == "down" ]]; then
      log "RECOVERED" "$name is back up (HTTP $http_code)"
    fi
    echo "up" > "$state_file"
    return 0
  else
    # Service is down or unhealthy
    local prev_state="unknown"
    [[ -f "$state_file" ]] && prev_state=$(cat "$state_file")

    if [[ "$prev_state" != "down" ]]; then
      send_alert "$name" "DOWN" "HTTP $http_code from $url/health"
    fi
    echo "down" > "$state_file"
    return 1
  fi
}

check_backend_detailed() {
  local url="$API_URL"
  local headers=()
  [[ -n "$HEALTH_CHECK_KEY" ]] && headers=("-H" "x-health-key: $HEALTH_CHECK_KEY")

  local response
  if ! response=$(curl -sf "${headers[@]}" "$url/health/detailed" 2>/dev/null); then
    return 1
  fi

  # Parse JSON response for degraded status
  local status
  status=$(echo "$response" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [[ "$status" == "degraded" ]]; then
    local details
    details=$(echo "$response" | grep -o '"checks":{[^}]*}' || echo "unknown")
    send_alert "Backend" "DEGRADED" "Detailed health: $details"
    return 1
  fi

  # Check memory usage
  local rss
  rss=$(echo "$response" | grep -o '"rss":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [[ -n "$rss" ]]; then
    local rss_mb
    rss_mb=$(echo "$rss" | sed 's/MB//')
    if [[ "$rss_mb" -gt 1024 ]]; then
      send_alert "Backend" "HIGH_MEMORY" "RSS memory usage: $rss"
    fi
  fi

  return 0
}

# â”€â”€ Main checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
log "INFO" "Running health checks..."

ERRORS=0

check_service "Backend" "$API_URL" || ((ERRORS++))
check_service "Dashboard" "$DASHBOARD_URL" || ((ERRORS++))
check_service "Storefront" "$STOREFRONT_URL" || ((ERRORS++))
check_service "StorefrontFood" "$STOREFRONT_FOOD_URL" || ((ERRORS++))

# Only run detailed backend check if basic health passed
if [[ $ERRORS -eq 0 ]]; then
  check_backend_detailed || ((ERRORS++))
fi

if [[ $ERRORS -gt 0 ]]; then
  log "WARN" "$ERRORS service(s) unhealthy"
  exit 1
else
  log "INFO" "All services healthy"
  exit 0
fi
