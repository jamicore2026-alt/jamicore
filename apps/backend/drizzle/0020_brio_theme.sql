-- Migration: Add store_theme_settings table for Brio theme support
CREATE TABLE IF NOT EXISTS store_theme_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL DEFAULT 'classic',

  -- Hero section
  hero_headline TEXT,
  hero_subtitle TEXT,
  hero_button_text TEXT,
  hero_image_url TEXT,

  -- Story section
  story_text TEXT,

  -- Featured items (array of product ids)
  featured_product_ids UUID[],

  -- Contact info
  contact_phone TEXT,
  contact_address TEXT,
  contact_hours TEXT,
  google_maps_url TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(store_id)
);

-- Index for fast lookups
CREATE INDEX idx_store_theme_settings_store_id ON store_theme_settings(store_id);
