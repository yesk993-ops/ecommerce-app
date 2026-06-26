import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardMedia, CardContent, Button, TextField, InputAdornment,
  CircularProgress, Chip
} from '@mui/material';
import { Search, Bolt, LocalShipping, Security, AttachMoney, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { products } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Dashboard() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      products.categories(),
      products.list({ limit: 8, sort: 'average_rating', order: 'desc' })
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data);
      setFeatured(prodRes.data.data);
      setLoading(false);
    }).catch((err) => {
      console.error('Dashboard load error:', err);
      setError('Failed to load products. Please try again.');
      setLoading(false);
    });
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/products?search=${encodeURIComponent(search)}`);
  };

  const handleAddToCart = async (product, e) => {
    e.stopPropagation();
    if (!user) return navigate('/login');
    try {
      await addItem({
        productId: product.id,
        productName: product.name,
        unitPrice: product.sale_price || product.base_price,
        imageUrl: product.image_urls?.[0]
      });
    } catch (err) {
      console.error('Add to cart error:', err);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{
        background: 'linear-gradient(135deg, #6c3bcf 0%, #059669 100%)',
        borderRadius: 4, p: { xs: 3, md: 5 }, mb: 4, color: 'white'
      }}>
        <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.75rem' } }}>
          Groceries delivered in <Box component="span" sx={{ bgcolor: 'rgba(255,255,255,0.2)', px: 1, borderRadius: 1 }}>10 minutes</Box>
        </Typography>
        <Typography variant="h6" sx={{ mt: 1, opacity: 0.9, fontWeight: 400 }}>
          Fresh foods, electronics, and daily essentials — at your doorstep
        </Typography>
        <Box component="form" onSubmit={handleSearch} sx={{ mt: 3, maxWidth: 500 }}>
          <TextField
            fullWidth
            placeholder="Search for products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              bgcolor: 'white', borderRadius: 2,
              '& .MuiOutlinedInput-root': { borderRadius: 2 }
            }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'grey.500' }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <Button type="submit" variant="contained" color="secondary" sx={{ borderRadius: 2, px: 3 }}>
                    Search
                  </Button>
                </InputAdornment>
              )
            }}
          />
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>{error}</Typography>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        {[
          { icon: <Bolt />, label: '10 Min Delivery', desc: 'Lightning fast' },
          { icon: <LocalShipping />, label: 'Free Shipping', desc: 'Orders over $50' },
          { icon: <Security />, label: 'Secure Payment', desc: '100% protected' },
          { icon: <AttachMoney />, label: 'Best Prices', desc: 'Daily deals' }
        ].map((f) => (
          <Box key={f.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', p: 2, borderRadius: 2, flex: 1, minWidth: 160, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Box sx={{ color: '#6c3bcf', display: 'flex' }}>{f.icon}</Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{f.label}</Typography>
              <Typography variant="caption" color="text.secondary">{f.desc}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>Shop by Category</Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {categories.map((cat) => (
          <Grid item xs={4} sm={3} md={2} key={cat.id}>
            <Card
              sx={{ cursor: 'pointer', textAlign: 'center', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
              onClick={() => navigate(`/products?category=${cat.slug}`)}
            >
              <CardMedia
                component="img"
                height="100"
                image={cat.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200'}
                alt={cat.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ py: 1, px: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>{cat.name}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Popular Products</Typography>
        <Button endIcon={<ArrowForward />} onClick={() => navigate('/products')} sx={{ fontWeight: 600 }}>
          View All
        </Button>
      </Box>
      <Grid container spacing={2}>
        {featured.map((product) => (
          <Grid item xs={6} sm={4} md={3} key={product.id}>
            <Card
              sx={{ cursor: 'pointer', transition: '0.2s', '&:hover': { transform: 'translateY(-4px)' } }}
              onClick={() => navigate(`/products/${product.slug}`)}
            >
              <CardMedia
                component="img"
                height="160"
                image={product.image_urls?.[0] || 'https://via.placeholder.com/300?text=No+Image'}
                alt={product.name}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.2, mb: 0.5 }}>
                  {product.name}
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
                <Chip label={product.average_rating ? `★ ${product.average_rating}` : 'New'} size="small"
                  sx={{ height: 20, fontSize: '0.65rem', mt: 0.5, bgcolor: 'green.50', color: 'secondary.dark' }} />
              </CardContent>
              <Button
                variant="contained" color="secondary" size="small" fullWidth
                onClick={(e) => handleAddToCart(product, e)}
                sx={{ borderRadius: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, py: 0.75 }}
              >
                + Add
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
