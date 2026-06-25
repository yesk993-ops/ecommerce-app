import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Typography, Alert, Box } from '@mui/material';
import { Bolt } from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    try {
      await register({ email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', mt: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Bolt sx={{ fontSize: 48, color: '#6c3bcf' }} />
        <Typography variant="h4" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #6c3bcf, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Create Account
        </Typography>
        <Typography color="text.secondary">Join QuickCart for 10 min delivery</Typography>
      </Box>
      <Card>
        <CardContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Email" name="email" type="email" value={form.email} onChange={handleChange} sx={{ mb: 2 }} required />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField fullWidth label="First Name" name="firstName" value={form.firstName} onChange={handleChange} sx={{ mb: 2 }} />
              <TextField fullWidth label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} sx={{ mb: 2 }} />
            </Box>
            <TextField fullWidth label="Password" name="password" type="password" value={form.password} onChange={handleChange} sx={{ mb: 2 }} required inputProps={{ minLength: 8 }} />
            <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} sx={{ mb: 2 }} required />
            <Button fullWidth variant="contained" type="submit" size="large" sx={{ py: 1.2, fontWeight: 700 }}>Create Account</Button>
          </form>
          <Typography sx={{ mt: 2, textAlign: 'center' }}>
            Already have an account? <Link to="/login" style={{ color: '#6c3bcf', fontWeight: 600 }}>Sign In</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
