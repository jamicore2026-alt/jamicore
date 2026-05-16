#!/bin/bash
# ============================================
# OCI VM Setup Script for SaaS E-commerce
# Run this on your OCI Compute Instance
# ============================================

set -e

echo "[Setup] Starting OCI VM setup..."

# Update system
echo "[Setup] Updating packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "[Setup] Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker || true

# Install Docker Compose plugin
echo "[Setup] Installing Docker Compose..."
sudo apt install -y docker-compose-plugin

# Install Git
echo "[Setup] Installing Git..."
sudo apt install -y git

# Install OCI CLI
echo "[Setup] Installing OCI CLI..."
bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"

# Verify installations
echo "[Setup] Verifying installations..."
docker --version
docker compose version
git --version
oci --version

echo "[Setup] Base setup complete!"
echo "[Setup] Next steps:"
echo "  1. Clone repo: git clone https://github.com/jamicore2026-alt/jamicore.git"
echo "  2. Create .env.production file"
echo "  3. Run: cd jamicore && docker compose -f docker-compose.prod.yml up -d"
