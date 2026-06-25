import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Grid, Card, CardMedia, Typography, Button, Chip, Box, CircularProgress, Alert } from '@mui/material';
import { ShoppingCart, ArrowBack } from '@mui/icons-material';
import { products } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <CircularProgress />;
  if (!product) return <Alert severity="error">Product not found</Alert>;

  const handleAddToCart = async () => {
    if (!user) return navigate('/login');
    await addItem({
      productId: product.id,
      productName: product.name,
      unitPrice: product.sale_price || product.base_price,
      imageUrl: product.image_urls?.[0]
    });
    navigate('/cart');
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <CardMedia
          component="img"
          height="400"
          image={product.image_urls?.[0] || 'https://via.placeholder.com/600?text=No+Image'}
          alt={product.name}
          sx={{ borderRadius: 1 }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/products')} sx={{ mb: 2 }}>Back</Button>
        <Typography variant="h4">{product.name}</Typography>
        <Box sx={{ my: 2 }}>
          <Chip label={product.category_name} variant="outlined" sx={{ mr: 1 }} />
          {product.is_featured && <Chip label="Featured" color="primary" />}
        </Box>
        <Typography variant="h3" color="primary" sx={{ my: 2 }}>
          ${product.sale_price || product.base_price}
        </Typography>
        {product.sale_price && (
          <Typography variant="h6" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
            ${product.base_price}
          </Typography>
        )}
        <Typography variant="body1" sx={{ my: 2 }}>{product.description}</Typography>
        <Typography variant="body2" color="text.secondary">Rating: {product.average_rating} ({product.review_count} reviews)</Typography>
        <Button variant="contained" size="large" startIcon={<ShoppingCart />} onClick={handleAddToCart} sx={{ mt: 2 }}>
          Add to Cart
        </Button>
      </Grid>
    </Grid>
  );
}
