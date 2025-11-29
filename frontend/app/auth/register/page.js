'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { useAuth } from '@/components/providers/AuthProvider';
import { FaWallet, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';

export default function Register() {
  const router = useRouter();
  const { account, connectWallet } = useWeb3();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: ''
  });
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    await connectWallet();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!account) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    
    const success = await register({
      walletAddress: account,
      ...formData
    });

    if (success) {
      router.push('/dashboard');
    } else {
      alert('Registration failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-w-md w-full"
      >
        <h1 className="text-3xl font-bold gradient-text mb-2">Create Account</h1>
        <p className="text-dark-600 mb-8">Join De-Medical and get started</p>

        {!account ? (
          <div className="text-center">
            <p className="text-dark-600 mb-6">Connect your wallet to get started</p>
            <button onClick={handleConnect} className="btn-primary w-full flex items-center justify-center space-x-2">
              <FaWallet />
              <span>Connect Wallet</span>
            </button>
          </div>
        ) : (
          <>
            <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-dark-600 mb-1">Connected Wallet</p>
              <p className="font-mono text-dark-900">{account.slice(0, 6)}...{account.slice(-4)}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  <FaUser className="inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="input-field"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  <FaEnvelope className="inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  <FaPhone className="inline mr-2" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-dark-600 mt-6">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/auth/login')}
                className="text-primary-500 hover:underline"
              >
                Login
              </button>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
