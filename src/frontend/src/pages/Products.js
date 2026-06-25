import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardMedia, CardContent, Typography, Button, TextField, InputAdornment,
  Pagination, Box, Chip, Tabs, Tab, CircularProgress
} from '@mui/material';
import { Search, ShoppingCart } from '@mui/icons-material';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { products } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Products() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [categories, setCategories] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { category: routeCategory } = useParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState(routeCategory || searchParams.get('category') || '');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addItem, items } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    products.categories().then(({ data }) => setCategories(data));
  }, []);

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (activeCategory) params.category = activeCategory;
    const { data: result } = await products.list(params);
    setData(result.data);
    setPagination(result.pagination);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts(parseInt(searchParams.get('page') || '1'));
  }, [searchParams, activeCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (activeCategory) params.category = activeCategory;
    setSearchParams(params);
  };

  const handleCategoryChange = (e, newValue) => {
    setActiveCategory(newValue);
    const params = {};
    if (search) params.search = search;
    if (newValue) params.category = newValue;
    setSearchParams(params);
  };

  const handlePageChange = (e, page) => {
    const params = {};
    if (search) params.search = search;
    if (activeCategory) params.category = activeCategory;
    params.page = page;
    setSearchParams(params);
  };

  const handleAddToCart = async (product, e) => {
    e.stopPropagation();
    if (!user) return navigate('/login');
    await addItem({
      productId: product.id,
      productName: product.name,
      unitPrice: product.sale_price || product.base_price,
      imageUrl: product.image_urls?.[0]
    });
  };

  const getItemQuantity = (productId) => {
    const item = items.find(i => i.product_id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <Box>
      <Box component="form" onSubmit={handleSearch} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'grey.400' }} /></InputAdornment>,
            endAdornment: <InputAdornment position="end">
              <Button type="submit" variant="contained" color="secondary" size="small" sx={{ borderRadius: 2 }}>Search</Button>
            </InputAdornment>
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      <Tabs
        value={activeCategory}
        onChange={handleCategoryChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, borderRadius: 2, mx: 0.5 } }}
      >
        <Tab label="All" value="" />
        {categories.map((cat) => (
          <Tab key={cat.id} label={cat.name} value={cat.slug} />
        ))}
      </Tabs>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : data.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">No products found</Typography>
          <Button variant="outlined" onClick={() => { setSearch(''); setActiveCategory(''); }} sx={{ mt: 2 }}>Clear filters</Button>
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {pagination.total} product{pagination.total !== 1 ? 's' : ''} found
          </Typography>
          <Grid container spacing={2}>
            {data.map((product) => (
              <Grid item xs={6} sm={4} md={3} lg={2.4} key={product.id}>
                <Card
                  sx={{ cursor: 'pointer', transition: '0.2s', height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { transform: 'translateY(-4px)' } }}
                  onClick={() => navigate(`/products/${product.slug}`)}
                >
                  <CardMedia
                    component="img"
                    height="150"
                    image={product.image_urls?.[0] || 'https://via.placeholder.com/300?text=No+Image'}
                    alt={product.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1, pb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem', lineHeight: 1.2, mb: 0.5 }}>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      {product.short_description?.substring(0, 40)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                        ${product.sale_price || product.base_price}
                      </Typography>
                      {product.sale_price && (
                        <Typography variant="caption" color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                          ${product.base_price}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                  <Button
                    variant="contained"
                    color={getItemQuantity(product.id) > 0 ? 'secondary' : 'primary'}
                    size="small"
                    fullWidth
                    onClick={(e) => handleAddToCart(product, e)}
                    sx={{ borderRadius: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, py: 0.75, fontWeight: 600 }}
                    startIcon={getItemQuantity(product.id) === 0 ? <ShoppingCart /> : null}
                  >
                    {getItemQuantity(product.id) > 0 ? `+ Add (${getItemQuantity(product.id)} in cart)` : 'Add to Cart'}
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>
          {pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination count={pagination.pages} page={pagination.page} onChange={handlePageChange} color="primary" />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
