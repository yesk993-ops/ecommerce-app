import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Box, Avatar, Button } from '@mui/material';
import { Receipt, Bolt, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { orders } from '../api/client';

const statusColors = {
  pending: 'warning', confirmed: 'info', processing: 'info',
  shipped: 'primary', delivered: 'success', cancelled: 'error', refunded: 'secondary'
};

export default function Orders() {
  const [orderList, setOrderList] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    orders.list().then(({ data }) => setOrderList(data.data || data)).catch(console.error);
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Bolt sx={{ color: '#6c3bcf' }} />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>My Orders</Typography>
      </Box>
      {orderList.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Receipt sx={{ fontSize: 80, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No orders yet</Typography>
          <Button variant="contained" onClick={() => navigate('/products')} sx={{ mt: 2 }}>Start Shopping</Button>
        </Box>
      ) : (
        <Card>
          <List disablePadding>
            {orderList.map((order, idx) => (
              <div key={order.id}>
                <ListItem
                  secondaryAction={<ArrowForward sx={{ color: 'grey.400' }} />}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>#{order.order_number}</Typography>
                        <Chip label={order.status} color={statusColors[order.status] || 'default'} size="small" sx={{ height: 22 }} />
                      </Box>
                    }
                    secondary={`${new Date(order.created_at).toLocaleDateString()} — $${order.total}`}
                  />
                </ListItem>
                {idx < orderList.length - 1 && <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', mx: 2 }} />}
              </div>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
}
