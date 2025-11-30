'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { useAuth } from '@/components/providers/AuthProvider';
import { FaShieldAlt, FaCoins, FaCreditCard, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Dashboard() {
  const router = useRouter();
  const { account } = useWeb3();
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    pools: 0,
    claims: 0,
    loans: 0,
    creditScore: 450
  });
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (!authLoading && !account) {
      router.push('/auth/login');
    }
  }, [account, authLoading, router]);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Fetch user's pools
        const poolsRes = await axios.get(`${API_URL}/pools`);
        const userPools = poolsRes.data.filter(p => 
          p.members?.some(m => m.address.toLowerCase() === account.toLowerCase())
        );

        // Fetch user's claims
        const claimsRes = await axios.get(`${API_URL}/claims?claimant=${account}`);
        
        // Fetch user's loans
        const loansRes = await axios.get(`${API_URL}/loans?borrower=${account}`);
        
        // Fetch credit score
        const creditRes = await axios.get(`${API_URL}/credit/${account}`);
        
        setStats({
          pools: userPools.length,
          claims: claimsRes.data.length,
          loans: loansRes.data.length,
          creditScore: creditRes.data.currentScore || 450
        });

        // Get AI recommendations
        const recRes = await axios.post(`${API_URL}/ai/recommend`, {
          creditScore: creditRes.data.currentScore || 450,
          hasLoans: loansRes.data.length > 0,
          poolMemberships: userPools.length
        });
        
        setRecommendations(recRes.data.recommendations || []);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };

    if (account) {
      loadDashboardData();
    }
  }, [account]);



  if (authLoading || !account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-dark-600">Loading...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Active Pools', value: stats.pools, icon: <FaShieldAlt />, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Claims', value: stats.claims, icon: <FaCreditCard />, color: 'from-purple-500 to-pink-500' },
    { label: 'Active Loans', value: stats.loans, icon: <FaCoins />, color: 'from-green-500 to-emerald-500' },
    { label: 'Credit Score', value: stats.creditScore, icon: <FaChartLine />, color: 'from-orange-500 to-red-500' }
  ];

  return (
    <div className="max-w-7xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold gradient-text mb-2">
          Welcome back, {user?.fullName || 'User'}!
        </h1>
        <p className="text-dark-600 mb-8">Here&apos;s your dashboard overview</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white mb-4`}>
                {stat.icon}
              </div>
              <p className="text-dark-600 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-dark-900">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-dark-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/pools')}
              className="btn-primary"
            >
              Join Insurance Pool
            </button>
            <button
              onClick={() => router.push('/loans')}
              className="btn-secondary"
            >
              Apply for Loan
            </button>
            <button
              onClick={() => router.push('/claims')}
              className="btn-secondary"
            >
              Submit Claim
            </button>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="card-gradient">
            <h2 className="text-2xl font-bold text-dark-900 mb-6">Recommendations for You</h2>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="bg-white/50 rounded-xl p-4 flex items-start space-x-4"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    rec.priority === 'high' ? 'bg-red-500' :
                    rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}>
                    <FaExclamationTriangle className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-dark-900 mb-1">{rec.title}</h3>
                    <p className="text-dark-600 text-sm">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
