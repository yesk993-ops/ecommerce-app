import React from 'react';
import { Grid, Card, CardContent, Typography, CardActions, Button } from '@mui/material';
import { Store, ShoppingCart, ListAlt, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: <Store sx={{ fontSize: 48 }} />, title: 'Browse Products', desc: 'Explore our catalog', path: '/products', color: '#1976d2' },
  { icon: <ShoppingCart sx={{ fontSize: 48 }} />, title: 'Shopping Cart', desc: 'Manage your items', path: '/cart', color: '#388e3c', auth: true },
  { icon: <ListAlt sx={{ fontSize: 48 }} />, title: 'Orders', desc: 'Track your orders', path: '/orders', color: '#f57c00', auth: true },
  { icon: <Person sx={{ fontSize: 48 }} />, title: 'Account', desc: 'Profile & settings', path: '/login', color: '#7b1fa2' }
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Grid container spacing={3} sx={{ mt: 2 }}>
      {features.map((f) => {
        if (f.auth && !user) return null;
        return (
          <Grid item xs={12} sm={6} md={4} key={f.title}>
            <Card sx={{ textAlign: 'center', '&:hover': { transform: 'translateY(-4px)', transition: '0.3s' } }}>
              <CardContent>
                <Typography color={f.color}>{f.icon}</Typography>
                <Typography variant="h5" sx={{ mt: 1 }}>{f.title}</Typography>
                <Typography color="text.secondary">{f.desc}</Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center' }}>
                <Button variant="contained" onClick={() => navigate(f.path)}>Go</Button>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
