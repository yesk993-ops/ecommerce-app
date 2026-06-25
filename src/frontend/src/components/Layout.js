import React from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Badge, Container, Box, Chip } from '@mui/material';
import { ShoppingCart, Person, Logout, Bolt, Storefront, Receipt } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ bgcolor: 'white', color: 'grey.900', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/')} sx={{ mr: 0.5 }}>
            <Bolt sx={{ color: '#6c3bcf', fontSize: 32 }} />
          </IconButton>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg, #6c3bcf, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            onClick={() => navigate('/')}
          >
            QuickCart
          </Typography>
          <Chip label="10 min delivery" size="small" color="secondary" sx={{ ml: 1, fontWeight: 600, height: 24 }} />
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" onClick={() => navigate('/products')} sx={{ fontWeight: 500 }}>
            <Storefront sx={{ mr: 0.5, fontSize: 20 }} /> Shop
          </Button>
          {user ? (
            <>
              <IconButton color="inherit" onClick={() => navigate('/cart')}>
                <Badge badgeContent={itemCount} color="secondary">
                  <ShoppingCart />
                </Badge>
              </IconButton>
              <IconButton color="inherit" onClick={() => navigate('/orders')}>
                <Receipt />
              </IconButton>
              <IconButton color="inherit" onClick={() => navigate('/orders')}>
                <Person />
              </IconButton>
              <IconButton color="inherit" onClick={handleLogout}>
                <Logout />
              </IconButton>
            </>
          ) : (
            <>
              <Button color="inherit" onClick={() => navigate('/login')} sx={{ fontWeight: 500 }}>Login</Button>
              <Button variant="contained" onClick={() => navigate('/register')} sx={{ ml: 1 }}>Sign Up</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 2, mb: 4, flex: 1 }}>
        {children}
      </Container>
      <Box component="footer" sx={{ bgcolor: 'grey.900', color: 'grey.400', py: 3, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Bolt sx={{ fontSize: 16, color: '#6c3bcf' }} />
          QuickCart — 10 min delivery guaranteed &copy; {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  );
}
