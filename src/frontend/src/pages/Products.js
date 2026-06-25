import React, { useState, useEffect } from 'react';
import { Grid, Card, CardMedia, CardContent, CardActions, Typography, Button, TextField, MenuItem, Pagination, Box } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { products } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Products() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const fetchProducts = async (page = 1) => {
    const params = { page, limit: 12 };
    if (search) params.search = search;
    const { data: result } = await products.list(params);
    setData(result.data);
    setPagination(result.pagination);
  };

  useEffect(() => {
    fetchProducts(parseInt(searchParams.get('page') || '1'));
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(search ? { search } : {});
  };

  const handlePageChange = (e, page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page);
    if (search) params.set('search', search);
    setSearchParams(params);
  };

  const handleAddToCart = async (product) => {
    if (!user) return navigate('/login');
    await addItem({
      productId: product.id,
      productName: product.name,
      unitPrice: product.sale_price || product.base_price,
      imageUrl: product.image_urls?.[0]
    });
  };

  return (
    <Box>
      <form onSubmit={handleSearch} sx={{ mb: 3 }}>
        <TextField fullWidth label="Search products" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2 }} />
      </form>
      <Grid container spacing={3}>
        {data.map((product) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
              onClick={() => navigate(`/products/${product.slug}`)}>
              <CardMedia
                component="img"
                height="200"
                image={product.image_urls?.[0] || 'https://via.placeholder.com/300?text=No+Image'}
                alt={product.name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6">{product.name}</Typography>
                <Typography variant="h5" color="primary">
                  ${product.sale_price || product.base_price}
                </Typography>
                {product.sale_price && (
                  <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                    ${product.base_price}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button size="small" variant="contained" fullWidth onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}>
                  Add to Cart
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      {pagination.pages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={pagination.pages} page={pagination.page} onChange={handlePageChange} color="primary" />
        </Box>
      )}
    </Box>
  );
}
