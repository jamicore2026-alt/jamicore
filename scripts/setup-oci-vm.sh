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
  bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)" -- --accept-all-defaults
fi

# Verify installations
log_info "Verifying installations..."
docker --version
docker compose version
git --version
oci --version || true

log_info "Base setup complete!"
