-- Seed Categories
INSERT INTO products.categories (id, name, slug, description, image_url, sort_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Fresh Foods', 'fresh-foods', 'Farm-fresh fruits, vegetables, dairy and bakery', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Electronics', 'electronics', 'Latest gadgets and accessories', 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400', 2),
  ('a0000000-0000-0000-0000-000000000003', 'Kirana & Essentials', 'kirana', 'Daily kitchen staples and grocery essentials', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400', 3)
ON CONFLICT (id) DO NOTHING;

-- Seed Products
INSERT INTO products.products (id, name, slug, description, short_description, category_id, base_price, sale_price, image_urls, is_featured, average_rating, review_count) VALUES
  -- Fresh Foods (7 products)
  ('b0000000-0000-0000-0000-000000000001', 'Organic Bananas', 'organic-bananas', 'Fresh organic bananas sourced directly from farms. Rich in potassium and naturally sweet.', '1 bunch of fresh organic bananas', 'a0000000-0000-0000-0000-000000000001', 1.49, 1.29, ARRAY['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400'], true, 4.5, 128),
  ('b0000000-0000-0000-0000-000000000002', 'Fresh Strawberries', 'fresh-strawberries', 'Juicy red strawberries, freshly picked. Perfect for desserts and smoothies.', '500g punnet of fresh strawberries', 'a0000000-0000-0000-0000-000000000001', 4.99, 3.99, ARRAY['https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400'], true, 4.8, 95),
  ('b0000000-0000-0000-0000-000000000003', 'Farm Fresh Eggs', 'farm-fresh-eggs', 'Free-range eggs from happy hens. Rich in protein and omega-3.', '12 pack of free-range eggs', 'a0000000-0000-0000-0000-000000000001', 3.99, 3.49, ARRAY['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400'], false, 4.6, 203),
  ('b0000000-0000-0000-0000-000000000004', 'Multigrain Bread', 'multigrain-bread', 'Freshly baked multigrain bread with seeds and oats. No preservatives added.', '400g loaf of multigrain bread', 'a0000000-0000-0000-0000-000000000001', 3.49, 2.99, ARRAY['https://images.unsplash.com/photo-1549931319-a545753337b7?w=400'], false, 4.3, 67),
  ('b0000000-0000-0000-0000-000000000005', 'Ripe Avocados', 'ripe-avocados', 'Perfectly ripened avocados, ready to eat. Great for toast, salads, and guacamole.', '2 pack of ripe avocados', 'a0000000-0000-0000-0000-000000000001', 3.99, 2.99, ARRAY['https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400'], true, 4.7, 156),
  ('b0000000-0000-0000-0000-000000000006', 'Fresh Whole Milk', 'fresh-whole-milk', 'Creamy fresh whole milk from grass-fed cows. Pasteurized and homogenized.', '1 liter fresh whole milk', 'a0000000-0000-0000-0000-000000000001', 2.49, null, ARRAY['https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400'], false, 4.4, 89),
  ('b0000000-0000-0000-0000-000000000007', 'Mixed Salad Greens', 'mixed-salad-greens', 'Pre-washed mix of lettuce, spinach, arugula and rocket leaves. Ready to serve.', '200g pack of mixed salad greens', 'a0000000-0000-0000-0000-000000000001', 3.29, 2.79, ARRAY['https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400'], false, 4.2, 44),
  -- Electronics (7 products)
  ('b0000000-0000-0000-0000-000000000008', 'Wireless Bluetooth Earbuds', 'wireless-bluetooth-earbuds', 'Premium wireless earbuds with noise cancellation. 24hr battery life with charging case.', 'True wireless earbuds with ANC', 'a0000000-0000-0000-0000-000000000002', 49.99, 29.99, ARRAY['https://images.unsplash.com/photo-1590658268037-6bf12f032f35?w=400'], true, 4.3, 312),
  ('b0000000-0000-0000-0000-000000000009', '20W USB-C Fast Charger', 'usb-c-fast-charger', 'GaN technology fast charger compatible with iPhone, Samsung, and all USB-C devices.', '20W USB-C PD fast charger', 'a0000000-0000-0000-0000-000000000002', 19.99, 14.99, ARRAY['https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400'], false, 4.5, 178),
  ('b0000000-0000-0000-0000-000000000010', '10000mAh Power Bank', 'power-bank-10000mah', 'Slim portable power bank with dual USB output. Fast charges phones and tablets.', '10000mAh portable charger', 'a0000000-0000-0000-0000-000000000002', 34.99, 24.99, ARRAY['https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400'], false, 4.4, 89),
  ('b0000000-0000-0000-0000-000000000011', 'WiFi Smart LED Bulb', 'wifi-smart-led-bulb', 'Color-changing smart bulb compatible with Alexa and Google Home. 16 million colors.', '9W WiFi smart LED bulb', 'a0000000-0000-0000-0000-000000000002', 14.99, 9.99, ARRAY['https://images.unsplash.com/photo-1565814329452-e1fa11c4fe8b?w=400'], false, 4.1, 234),
  ('b0000000-0000-0000-0000-000000000012', 'Ergonomic Wireless Mouse', 'ergonomic-wireless-mouse', 'Comfortable vertical wireless mouse with silent clicks. 2.4GHz USB receiver.', 'Ergonomic wireless optical mouse', 'a0000000-0000-0000-0000-000000000002', 24.99, 19.99, ARRAY['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'], false, 4.6, 145),
  ('b0000000-0000-0000-0000-000000000013', 'Adjustable Phone Stand', 'adjustable-phone-stand', 'Aluminum adjustable phone stand compatible with all phones and tablets up to 12.9".', 'Foldable aluminum phone stand', 'a0000000-0000-0000-0000-000000000002', 12.99, 8.99, ARRAY['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400'], false, 4.2, 201),
  ('b0000000-0000-0000-0000-000000000014', 'USB Desk Fan', 'usb-desk-fan', 'Quiet USB-powered desk fan with 3 speed settings. Energy efficient and portable.', 'Mini USB desk cooling fan', 'a0000000-0000-0000-0000-000000000002', 16.99, 12.99, ARRAY['https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400'], false, 4.0, 67),
  -- Kirana & Essentials (6 products)
  ('b0000000-0000-0000-0000-000000000015', 'Premium Basmati Rice', 'premium-basmati-rice', 'Long grain premium basmati rice from the foothills of Himalayas. Aged for perfection.', '1kg premium basmati rice', 'a0000000-0000-0000-0000-000000000003', 6.99, 5.99, ARRAY['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400'], true, 4.7, 345),
  ('b0000000-0000-0000-0000-000000000016', 'Toor Dal (Split Pigeon Peas)', 'toor-dal', 'High-quality toor dal, sorted and cleaned. Rich in protein and fiber.', '500g toor dal', 'a0000000-0000-0000-0000-000000000003', 3.99, 3.49, ARRAY['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400'], false, 4.3, 112),
  ('b0000000-0000-0000-0000-000000000017', 'Sunflower Cooking Oil', 'sunflower-cooking-oil', 'Refined sunflower oil for all cooking needs. Cholesterol-free and light.', '1 liter sunflower oil', 'a0000000-0000-0000-0000-000000000003', 4.99, null, ARRAY['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400'], false, 4.1, 78),
  ('b0000000-0000-0000-0000-000000000018', 'Pure Cane Sugar', 'pure-cane-sugar', 'Fine grain pure cane sugar. Perfect for cooking, baking, and beverages.', '1kg pure cane sugar', 'a0000000-0000-0000-0000-000000000003', 2.99, 2.49, ARRAY['https://images.unsplash.com/photo-1581626226001-0e5ae7f2b3c4?w=400'], false, 4.0, 56),
  ('b0000000-0000-0000-0000-000000000019', 'Whole Wheat Flour (Atta)', 'whole-wheat-flour', 'Stone-ground whole wheat flour. Perfect for soft rotis, parathas and breads.', '1kg whole wheat flour', 'a0000000-0000-0000-0000-000000000003', 3.49, null, ARRAY['https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'], false, 4.5, 89),
  ('b0000000-0000-0000-0000-000000000020', 'Premium Tea Bags', 'premium-tea-bags', 'Finely blended premium black tea bags. Rich aroma and full-bodied flavor.', '100 pack premium tea bags', 'a0000000-0000-0000-0000-000000000003', 5.49, 4.49, ARRAY['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'], false, 4.6, 267)
ON CONFLICT (id) DO NOTHING;

-- Seed Inventory Stock
INSERT INTO inventory.stock (id, product_id, quantity, reserved_quantity, low_stock_threshold) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 200, 0, 20),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 150, 0, 15),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 300, 0, 30),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 80, 0, 10),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005', 120, 0, 15),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 250, 0, 25),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007', 100, 0, 10),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008', 500, 0, 50),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000009', 600, 0, 50),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000010', 300, 0, 30),
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000011', 400, 0, 40),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000012', 250, 0, 25),
  ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000013', 350, 0, 30),
  ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000014', 200, 0, 20),
  ('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000015', 500, 0, 50),
  ('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000016', 400, 0, 40),
  ('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000017', 300, 0, 30),
  ('c0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000018', 400, 0, 40),
  ('c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000019', 300, 0, 30),
  ('c0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000020', 600, 0, 50)
ON CONFLICT (id) DO NOTHING;
