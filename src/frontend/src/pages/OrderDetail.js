import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, Typography, Grid, Chip, List, ListItem, ListItemText, Divider, CircularProgress, Alert, Box } from '@mui/material';
import { orders, payments } from '../api/client';

const statusColors = {
  pending: 'warning', confirmed: 'info', processing: 'info',
  shipped: 'primary', delivered: 'success', cancelled: 'error', refunded: 'secondary'
};

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      orders.get(id),
      payments.getByOrder(id)
    ]).then(([orderRes, paymentRes]) => {
      setOrder(orderRes.data);
      setPayment(paymentRes.data?.[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <CircularProgress />;
  if (!order) return <Alert severity="error">Order not found</Alert>;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">Order #{order.order_number}</Typography>
              <Chip label={order.status} color={statusColors[order.status] || 'default'} />
            </Box>
            <Typography color="text.secondary">Placed on {new Date(order.created_at).toLocaleString()}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6">Items</Typography>
            <List>
              {order.items?.map((item) => (
                <ListItem key={item.id}>
                  <ListItemText primary={item.product_name} secondary={`Qty: ${item.quantity} x $${item.unit_price}`} />
                  <Typography>${item.total_price}</Typography>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6">Order Summary</Typography>
            <Box sx={{ my: 1 }}>
              <Typography>Subtotal: ${order.subtotal}</Typography>
              <Typography>Shipping: ${order.shipping_cost}</Typography>
              <Typography>Tax: ${order.tax}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h5">Total: ${order.total}</Typography>
            </Box>
            {payment && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Payment</Typography>
                <Typography>Status: <Chip label={payment.status} color={payment.status === 'completed' ? 'success' : 'warning'} size="small" /></Typography>
                <Typography>Transaction: {payment.transaction_id}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
        {order.history?.length > 0 && (
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6">Order History</Typography>
              {order.history.map((h, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  {h.from_status} &rarr; {h.to_status} ({new Date(h.created_at).toLocaleString()})
                </Typography>
              ))}
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
}
