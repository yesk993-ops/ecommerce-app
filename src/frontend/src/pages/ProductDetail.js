import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Grid, Card, CardMedia, Typography, Button, Chip, Box, CircularProgress, Alert, IconButton, Divider } from '@mui/material';
import { ShoppingCart, ArrowBack, Bolt, Add, Remove } from '@mui/icons-material';
import { products } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    products.get(slug).then(({ data }) => {
      setProduct(data);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!product) return <Alert severity="error">Product not found</Alert>;

  const handleAddToCart = async () => {
    if (!user) return navigate('/login');
    for (let i = 0; i < quantity; i++) {
      await addItem({
        productId: product.id,
        productName: product.name,
        unitPrice: product.sale_price || product.base_price,
        imageUrl: product.image_urls?.[0]
      });
    }
    navigate('/cart');
  };

  const unitPrice = product.sale_price || product.base_price;

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')} sx={{ mb: 2, fontWeight: 600 }}>
        Back to Products
      </Button>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <CardMedia
            component="img"
            height="450"
            image={product.image_urls?.[0] || 'https://via.placeholder.com/600?text=No+Image'}
            alt={product.name}
            sx={{ borderRadius: 3, objectFit: 'cover' }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <Chip label={product.category_name} variant="outlined" size="small" sx={{ fontWeight: 600 }} />
              {product.is_featured && <Chip label="Featured" color="primary" size="small" />}
              {product.average_rating > 0 && (
                <Chip label={`★ ${product.average_rating} (${product.review_count})`} size="small"
                  sx={{ bgcolor: 'green.50', color: 'secondary.dark', fontWeight: 600 }} />
              )}
            </Box>

            <Typography variant="h4" sx={{ fontWeight: 800 }}>{product.name}</Typography>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 2 }}>
              <Typography variant="h3" color="secondary.main" sx={{ fontWeight: 800 }}>
                ${unitPrice}
              </Typography>
              {product.sale_price && (
                <Typography variant="h6" color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                  ${product.base_price}
                </Typography>
              )}
            </Box>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              {product.description}
            </Typography>

            {product.short_description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                {product.short_description}
              </Typography>
            )}

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography sx={{ fontWeight: 600 }}>Quantity:</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton size="small" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}>
                  <Remove />
                </IconButton>
                <Typography sx={{ minWidth: 36, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem' }}>{quantity}</Typography>
                <IconButton size="small" onClick={() => setQuantity(quantity + 1)}
                  sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}>
                  <Add />
                </IconButton>
              </Box>
            </Box>

            <Button
              variant="contained" size="large"
              startIcon={<ShoppingCart />}
              onClick={handleAddToCart}
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem', fontWeight: 700 }}
            >
              Add to Cart — ${(unitPrice * quantity).toFixed(2)}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, color: 'grey.600' }}>
              <Bolt sx={{ color: '#6c3bcf' }} />
              <Typography variant="body2">Expected delivery in 10 minutes</Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
