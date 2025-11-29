'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { FaPlus, FaUsers, FaCoins, FaShieldAlt } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Pools() {
  const { account } = useWeb3();
  const [pools, setPools] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    try {
      const response = await axios.get(`${API_URL}/pools`);
      setPools(response.data);
    } catch (error) {
      console.error('Failed to load pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const poolTypeColors = {
    HEALTH: 'from-blue-500 to-cyan-500',
    LIFE: 'from-purple-500 to-pink-500',
    ACCIDENT: 'from-orange-500 to-red-500',
    CRITICAL_ILLNESS: 'from-green-500 to-emerald-500'
  };

  const poolTypeIcons = {
    HEALTH: <FaShieldAlt />,
    LIFE: <FaUsers />,
    ACCIDENT: <FaPlus />,
    CRITICAL_ILLNESS: <FaCoins />
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">Insurance Pools</h1>
          <p className="text-dark-600">Join a pool and get covered with proportional contributions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <FaPlus />
          <span>Create Pool</span>
        </button>
      </div>

      {/* Pool Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {['HEALTH', 'LIFE', 'ACCIDENT', 'CRITICAL_ILLNESS'].map((type) => (
          <div
            key={type}
            className="card text-center cursor-pointer hover:scale-105 transition-transform"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${poolTypeColors[type]} rounded-xl flex items-center justify-center text-white mx-auto mb-3`}>
              {poolTypeIcons[type]}
            </div>
            <h3 className="font-semibold text-dark-900">{type.replace('_', ' ')}</h3>
            <p className="text-dark-600 text-sm">
              {pools.filter(p => p.poolType === type).length} pools
            </p>
          </div>
        ))}
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pools.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <p className="text-dark-600 text-lg mb-4">No pools available yet</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              Create First Pool
            </button>
          </div>
        ) : (
          pools.map((pool, index) => (
            <motion.div
              key={pool.poolId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card hover:scale-105 transition-transform cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${poolTypeColors[pool.poolType]} rounded-xl flex items-center justify-center text-white`}>
                  {poolTypeIcons[pool.poolType]}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  pool.isActive ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'
                }`}>
                  {pool.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="text-xl font-bold text-dark-900 mb-2">{pool.name}</h3>
              <p className="text-dark-600 text-sm mb-4 line-clamp-2">{pool.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-600">Members</span>
                  <span className="font-semibold text-dark-900">
                    {pool.memberCount || 0} / {pool.maxMembers}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-600">Pool Balance</span>
                  <span className="font-semibold text-dark-900">
                    {pool.currentAmount || '0'} ETH
                  </span>
                </div>
              </div>

              <div className="w-full bg-dark-200 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                  style={{
                    width: `${Math.min(((pool.memberCount || 0) / pool.maxMembers) * 100, 100)}%`
                  }}
                />
              </div>

              <button className="btn-primary w-full">
                View Details
              </button>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Pool Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">Create New Pool</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-dark-600 hover:text-dark-900"
              >
                ✕
              </button>
            </div>
            <p className="text-dark-600 text-center py-8">
              Pool creation functionality will be connected to smart contracts.
              <br />
              This requires contract interaction implementation.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary w-full"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
