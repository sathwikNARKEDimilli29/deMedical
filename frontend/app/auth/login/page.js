'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { useAuth } from '@/components/providers/AuthProvider';
import { FaWallet } from 'react-icons/fa';

export default function Login() {
  const router = useRouter();
  const { account, connectWallet } = useWeb3();
  const { login, user } = useAuth();

  useEffect(() => {
    if (account) {
      handleLogin();
    }
  }, [account]);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user]);

  const handleLogin = async () => {
    const success = await login(account);
    if (!success) {
      router.push('/auth/register');
    }
  };

  const handleConnect = async () => {
    await connectWallet();
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card max-w-md w-full text-center"
      >
        <h1 className="text-3xl font-bold gradient-text mb-2">Welcome Back</h1>
        <p className="text-dark-600 mb-8">Connect your wallet to continue</p>

        <div className="space-y-4">
          <button
            onClick={handleConnect}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <FaWallet />
            <span>Connect Wallet</span>
          </button>

          <p className="text-sm text-dark-600">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/auth/register')}
              className="text-primary-500 hover:underline"
            >
              Register
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
