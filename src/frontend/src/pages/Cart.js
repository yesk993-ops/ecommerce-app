import React, { useEffect } from 'react';
import {
  Card, CardContent, Typography, Button, IconButton, Grid, Box, Divider, Avatar, Chip
} from '@mui/material';
import { Delete, Add, Remove, ShoppingBag, Bolt, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { orders, payments } from '../api/client';

export default function Cart() {
  const { items, total, loading, fetchCart, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const handleCheckout = async () => {
    try {
      const { data: order } = await orders.create({});
      const { data: payment } = await payments.process({
        orderId: order.id,
        amount: order.total,
        paymentMethod: 'card',
        cardToken: 'tok_test'
      });
      await clearCart();
      navigate(`/orders/${order.id}`);
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const shipping = total > 100 ? 0 : 9.99;
  const tax = total * 0.08;
  const grandTotal = total + shipping + tax;

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <ShoppingBag sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>Your cart is empty</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Add items from our store to get started</Typography>
        <Button variant="contained" size="large" startIcon={<ArrowBack />} onClick={() => navigate('/products')}>
          Start Shopping
        </Button>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Bolt sx={{ color: '#6c3bcf' }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Your Cart</Typography>
          <Chip label={`${items.length} item${items.length !== 1 ? 's' : ''}`} size="small" sx={{ fontWeight: 600 }} />
        </Box>

        <Card>
          {items.map((item, idx) => (
            <div key={item.id}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Avatar
                  src={item.image_url}
                  variant="rounded"
                  sx={{ width: 64, height: 64 }}
                />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {item.product_name}
                  </Typography>
                  <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600 }}>
                    ${item.unit_price}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}>
                    <Remove fontSize="small" />
                  </IconButton>
                  <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</Typography>
                  <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    sx={{ bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}>
                    <Add fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 80, textAlign: 'right', fontSize: '1rem' }}>
                  ${(item.unit_price * item.quantity).toFixed(2)}
                </Typography>
                <IconButton color="error" size="small" onClick={() => removeItem(item.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </CardContent>
              {idx < items.length - 1 && <Divider />}
            </div>
          ))}
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ position: 'sticky', top: 80 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
              <Bolt sx={{ color: '#6c3bcf', fontSize: 20 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Order Summary</Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography sx={{ fontWeight: 600 }}>${total.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Delivery</Typography>
                <Typography sx={{ fontWeight: 600, color: shipping === 0 ? 'secondary.main' : 'inherit' }}>
                  {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Tax (8%)</Typography>
                <Typography sx={{ fontWeight: 600 }}>${tax.toFixed(2)}</Typography>
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Total</Typography>
                <Typography variant="h5" color="secondary.main" sx={{ fontWeight: 800 }}>
                  ${grandTotal.toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Button
              fullWidth variant="contained" size="large"
              onClick={handleCheckout} disabled={loading}
              sx={{ mt: 3, py: 1.5, fontSize: '1rem', fontWeight: 700 }}
            >
              Proceed to Checkout
            </Button>

            {total < 100 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                Add ${(100 - total).toFixed(2)} more for FREE delivery
              </Typography>
            )}

            <Button fullWidth variant="outlined" onClick={() => navigate('/products')} sx={{ mt: 1 }}>
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
