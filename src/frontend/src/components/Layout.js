import React from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Badge, Container, Box } from '@mui/material';
import { ShoppingCart, Person, Logout, Store } from '@mui/icons-material';
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
    <>
      <AppBar position="sticky">
        <Toolbar>
          <IconButton color="inherit" component={Link} to="/" sx={{ mr: 1 }}>
            <Store />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
            E-Commerce
          </Typography>
          <Button color="inherit" component={Link} to="/products">Products</Button>
          {user ? (
            <>
              <IconButton color="inherit" component={Link} to="/cart">
                <Badge badgeContent={itemCount} color="error">
                  <ShoppingCart />
                </Badge>
              </IconButton>
              <IconButton color="inherit" component={Link} to="/orders">
                <Person />
              </IconButton>
              <IconButton color="inherit" onClick={handleLogout}>
                <Logout />
              </IconButton>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">Login</Button>
              <Button color="inherit" component={Link} to="/register">Register</Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 3, mb: 3 }}>
        {children}
      </Container>
      <Box component="footer" sx={{ bgcolor: 'grey.900', color: 'white', p: 3, mt: 'auto', textAlign: 'center' }}>
        <Typography variant="body2">E-Commerce Microservices Platform &copy; {new Date().getFullYear()}</Typography>
      </Box>
    </>
  );
}
