CREATE SCHEMA IF NOT EXISTS products;

CREATE TABLE IF NOT EXISTS products.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES products.categories(id),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  category_id UUID REFERENCES products.categories(id),
  base_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  image_urls TEXT[],
  attributes JSONB,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  average_rating DECIMAL(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products.products(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS products.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  body TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON products.reviews(product_id);
