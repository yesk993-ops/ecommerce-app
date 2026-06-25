import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemText, Chip, Button } from '@mui/material';
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
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>My Orders</Typography>
        {orderList.length === 0 ? (
          <Typography color="text.secondary">No orders yet</Typography>
        ) : (
          <List>
            {orderList.map((order) => (
              <ListItem key={order.id} button onClick={() => navigate(`/orders/${order.id}`)} sx={{ borderBottom: '1px solid #eee' }}>
                <ListItemText
                  primary={`Order #${order.order_number}`}
                  secondary={`${new Date(order.created_at).toLocaleDateString()} - $${order.total}`}
                />
                <Chip label={order.status} color={statusColors[order.status] || 'default'} size="small" />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
