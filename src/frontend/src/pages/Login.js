import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Typography, Alert, Box } from '@mui/material';
import { Bolt } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', mt: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Bolt sx={{ fontSize: 48, color: '#6c3bcf' }} />
        <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #6c3bcf, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome Back
        </Typography>
        <Typography color="text.secondary">Sign in to start shopping</Typography>
      </Box>
      <Card>
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} required />
            <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ mb: 2 }} required />
            <Button fullWidth variant="contained" type="submit" size="large" sx={{ py: 1.2, fontWeight: 700 }}>Sign In</Button>
          </form>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Don't have an account? <Link to="/register" style={{ color: '#6c3bcf', fontWeight: 600 }}>Register</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
