-- Migration: Add customization JSONB column to store_theme_settings
ALTER TABLE store_theme_settings
ADD COLUMN IF NOT EXISTS customization JSONB DEFAULT '{}'::jsonb;
