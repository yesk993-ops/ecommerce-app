import React, { useEffect } from 'react';
import { Card, CardContent, Typography, Button, IconButton, Grid, List, ListItem, ListItemText, Box, Divider } from '@mui/material';
import { Delete, Add, Remove, ShoppingBag } from '@mui/icons-material';
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

  if (items.length === 0) {
    return (
      <Card sx={{ textAlign: 'center', p: 4 }}>
        <ShoppingBag sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
        <Typography variant="h5">Your cart is empty</Typography>
        <Button variant="contained" onClick={() => navigate('/products')} sx={{ mt: 2 }}>Continue Shopping</Button>
      </Card>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h5">Shopping Cart ({items.length} items)</Typography>
            <List>
              {items.map((item) => (
                <div key={item.id}>
                  <ListItem>
                    <ListItemText
                      primary={item.product_name}
                      secondary={`$${item.unit_price} each`}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                        <Remove />
                      </IconButton>
                      <Typography>{item.quantity}</Typography>
                      <IconButton size="small" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Add />
                      </IconButton>
                      <Typography variant="h6" sx={{ ml: 2, minWidth: 80, textAlign: 'right' }}>
                        ${(item.unit_price * item.quantity).toFixed(2)}
                      </Typography>
                      <IconButton color="error" onClick={() => removeItem(item.id)}>
                        <Delete />
                      </IconButton>
                    </Box>
                  </ListItem>
                  <Divider />
                </div>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h5">Order Summary</Typography>
            <Box sx={{ my: 2 }}>
              <Typography>Subtotal: ${total.toFixed(2)}</Typography>
              <Typography>Shipping: ${total > 100 ? 'FREE' : '$9.99'}</Typography>
              <Typography>Tax (8%): ${(total * 0.08).toFixed(2)}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h5">Total: ${(total + (total > 100 ? 0 : 9.99) + total * 0.08).toFixed(2)}</Typography>
            </Box>
            <Button fullWidth variant="contained" size="large" onClick={handleCheckout} disabled={loading}>
              Proceed to Checkout
            </Button>
            <Button fullWidth variant="outlined" onClick={() => navigate('/products')} sx={{ mt: 1 }}>
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
