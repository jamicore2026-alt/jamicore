// Dynamic homepage sections registry
// Sections are rendered based on the store's homeSections config

import HeroSection from './HeroSection.svelte';
import FoodHero from './FoodHero.svelte';
import EditorialHero from './EditorialHero.svelte';
import FeaturedProductsSection from './FeaturedProductsSection.svelte';
import NewArrivalsSection from './NewArrivalsSection.svelte';
import PopularSection from './PopularSection.svelte';
import CategoryGrid from './CategoryGrid.svelte';
import OfferBannerSection from './OfferBannerSection.svelte';
import BrandTrustSection from './BrandTrustSection.svelte';
import TestimonialsSection from './TestimonialsSection.svelte';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySection = any;

// Dynamic homepage sections registry.
// Sections accept varied props depending on context.
// Callers in +page.svelte pass the correct props per section name.
export const sections: Record<string, AnySection> = {
  // Hero variants
  HeroSection,
  FoodHeroSection: FoodHero,
  EditorialHeroSection: EditorialHero,

  // Product listings
  FeaturedProductsSection,
  FeaturedDishesSection: FeaturedProductsSection,
  FeaturedSpecsSection: FeaturedProductsSection,
  TrendingSection: FeaturedProductsSection,

  // New arrivals & popular
  NewArrivalsSection,
  PopularSection,

  // Category grids
  CategoryGrid,
  CategoryMenuSection: CategoryGrid,
  CategoryStyleGrid: CategoryGrid,
  ShopByCategorySection: CategoryGrid,

  // Utility sections
  BrandTrustSection,
  OfferBannerSection,
  TestimonialsSection,
};