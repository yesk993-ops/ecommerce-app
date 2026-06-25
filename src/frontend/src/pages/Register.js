import React, { useState } from 'react';
import { Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';
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
    <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>Register</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" name="email" type="email" value={form.email} onChange={handleChange} sx={{ mb: 2 }} required />
          <TextField fullWidth label="First Name" name="firstName" value={form.firstName} onChange={handleChange} sx={{ mb: 2 }} />
          <TextField fullWidth label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} sx={{ mb: 2 }} />
          <TextField fullWidth label="Password" name="password" type="password" value={form.password} onChange={handleChange} sx={{ mb: 2 }} required inputProps={{ minLength: 8 }} />
          <TextField fullWidth label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} sx={{ mb: 2 }} required />
          <Button fullWidth variant="contained" type="submit">Register</Button>
        </form>
        <Typography sx={{ mt: 2, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Login</Link>
        </Typography>
      </CardContent>
    </Card>
  );
}
