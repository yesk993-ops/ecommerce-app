import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Grid, Chip, List, ListItem, ListItemText, Divider, CircularProgress, Alert, Box, Avatar, Button, Step, StepLabel, Stepper } from '@mui/material';
import { Bolt, ArrowBack } from '@mui/icons-material';
import { orders, payments } from '../api/client';

const statusColors = {
  pending: 'warning', confirmed: 'info', processing: 'info',
  shipped: 'primary', delivered: 'success', cancelled: 'error', refunded: 'secondary'
};

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>;
  if (!order) return <Alert severity="error">Order not found</Alert>;

  const activeStep = statusSteps.indexOf(order.status) + 1;
  const isCancelled = order.status === 'cancelled';

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/orders')} sx={{ mb: 2, fontWeight: 600 }}>
        Back to Orders
      </Button>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>Order #{order.order_number}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    Placed on {new Date(order.created_at).toLocaleString()}
                  </Typography>
                </Box>
                <Chip label={order.status} color={statusColors[order.status] || 'default'} sx={{ fontWeight: 600 }} />
              </Box>

              {!isCancelled && (
                <Stepper activeStep={activeStep} sx={{ my: 3 }}>
                  {statusSteps.map((s) => (
                    <Step key={s}>
                      <StepLabel>{s.charAt(0).toUpperCase() + s.slice(1)}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Items</Typography>
              <List disablePadding>
                {order.items?.map((item) => (
                  <ListItem key={item.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={item.product_name}
                      secondary={`Qty: ${item.quantity} x $${item.unit_price}`}
                      primaryTypographyProps={{ fontWeight: 600 }}
                    />
                    <Typography sx={{ fontWeight: 700 }}>${item.total_price}</Typography>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
                <Bolt sx={{ color: '#6c3bcf', fontSize: 20 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Order Summary</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Subtotal</Typography>
                  <Typography sx={{ fontWeight: 600 }}>${order.subtotal}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Delivery</Typography>
                  <Typography sx={{ fontWeight: 600 }}>${order.shipping_cost}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Tax</Typography>
                  <Typography sx={{ fontWeight: 600 }}>${order.tax}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Total</Typography>
                  <Typography variant="h5" color="secondary.main" sx={{ fontWeight: 800 }}>${order.total}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {payment && (
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>Payment</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography color="text.secondary">Status</Typography>
                  <Chip label={payment.status} color={payment.status === 'completed' ? 'success' : 'warning'} size="small" sx={{ fontWeight: 600 }} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Transaction: {payment.transaction_id}
                </Typography>
              </CardContent>
            </Card>
          )}

          {order.history?.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>History</Typography>
                {order.history.map((h, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">
                      {h.from_status} → {h.to_status}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(h.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
