#!/usr/bin/env bash
# ============================================
# OCI VM Setup Script for SaaS E-commerce
# Idempotent — safe to run multiple times
# ============================================

set -e

log_info() { echo "[Setup] $1"; }
log_skip() { echo "[SKIP] $1"; }

# Update system
if [[ -z "$(find /var/cache/apt -maxdepth 0 -mmin -60 2>/dev/null)" ]]; then
  log_info "Updating packages..."
  sudo apt update && sudo apt upgrade -y
else
  log_skip "Package cache is fresh (< 60 min)"
fi

# Install Docker
if command -v docker &> /dev/null; then
  log_skip "Docker already installed ($(docker --version))"
else
  log_info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  newgrp docker || true
fi

# Install Docker Compose plugin
if docker compose version &> /dev/null; then
  log_skip "Docker Compose already installed ($(docker compose version --short))"
else
  log_info "Installing Docker Compose..."
  sudo apt install -y docker-compose-plugin
fi

# Install Git
if command -v git &> /dev/null; then
  log_skip "Git already installed ($(git --version))"
else
  log_info "Installing Git..."
  sudo apt install -y git
fi

# Install OCI CLI
if command -v oci &> /dev/null; then
  log_skip "OCI CLI already installed ($(oci --version))"
else
  log_info "Installing OCI CLI..."
  # Remove stale half-installed directory if present
  [[ -d "$HOME/lib/oracle-cli" ]] && rm -rf "$HOME/lib/oracle-cli"
  bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults
fi

# Configure firewall (ufw)
if command -v ufw &> /dev/null; then
  if sudo ufw status | grep -q "Status: active"; then
    log_skip "UFW already active"
  else
    log_info "Configuring UFW firewall..."
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22/tcp comment 'SSH'
    sudo ufw allow 80/tcp comment 'HTTP'
    sudo ufw allow 443/tcp comment 'HTTPS'
    sudo ufw --force enable
  fi
else
  log_info "Installing UFW..."
  sudo apt install -y ufw
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp comment 'SSH'
  sudo ufw allow 80/tcp comment 'HTTP'
  sudo ufw allow 443/tcp comment 'HTTPS'
  sudo ufw --force enable
fi

# Verify installations
log_info "Verifying installations..."
docker --version
docker compose version
git --version
oci --version || true

log_info "Base setup complete!"
log_info "Next step: Open ports 80 and 443 in your OCI Security List (VNIC)."
