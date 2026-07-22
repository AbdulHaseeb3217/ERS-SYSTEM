import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { authService } from '../services/authService';
import { Mail, Lock } from 'lucide-react';

export const Login = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const user = await authService.login(email, password);
      onLoginSuccess(user);
      navigate('/pharmacy');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 md:p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m8-2a2 2 0 01-2-2h-4a2 2 0 01-2 2v2m2-4h.01M17 16l-3-3m0 0l-3 3m3-3V9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy Sign In</h1>
          <p className="text-gray-500 mt-2 text-center text-sm">
            Access your Emergency Response System dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg text-center border border-red-100">
              {error}
            </div>
          )}
          
          <Input 
            label="Email Address" 
            type="email" 
            placeholder="pharmacy@example.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
            required
          />
          
          <div className="relative">
            <Input 
              label="Password" 
              type="password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={18} />}
              required
            />
            <Link
              to="/pharmacy/forgot-password"
              className="absolute top-0 right-0 text-xs font-medium text-blue-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            New pharmacy?{' '}
            <Link to="/pharmacy/register" className="text-blue-600 font-semibold hover:underline">
              Register Now
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-400 px-8">
            By signing in, you agree to comply with ERS pharmacy guidelines and regulations
          </p>
        </div>
      </div>
    </div>
  );
};