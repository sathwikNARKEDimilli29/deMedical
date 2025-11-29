'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { FaCheckCircle, FaClock, FaTimes, FaFileAlt } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Claims() {
  const { account } = useWeb3();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClaims = async () => {
      try {
        const response = await axios.get(`${API_URL}/claims?claimant=${account}`);
        setClaims(response.data);
      } catch (error) {
        console.error('Failed to load claims:', error);
      } finally {
        setLoading(false);
      }
    };

    if (account) {
      loadClaims();
    }
  }, [account]);



  const statusConfig = {
    PENDING: { color: 'yellow', icon: <FaClock />, label: 'Pending' },
    APPROVED: { color: 'green', icon: <FaCheckCircle />, label: 'Approved' },
    REJECTED: { color: 'red', icon: <FaTimes />, label: 'Rejected' },
    PAID: { color: 'blue', icon: <FaCheckCircle />, label: 'Paid' }
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">My Claims</h1>
          <p className="text-dark-600">Track and manage your insurance claims</p>
        </div>
        <button className="btn-primary">Submit New Claim</button>
      </div>

      {loading? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : claims.length === 0 ? (
        <div className="card text-center py-20">
          <FaFileAlt className="text-6xl text-dark-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-dark-900 mb-2">No Claims Yet</h3>
          <p className="text-dark-600 mb-6">You haven&apos;t submitted any claims</p>
          <button className="btn-primary">Submit Your First Claim</button>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim, index) => (
            <motion.div
              key={claim.claimId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card flex items-center justify-between hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-start space-x-4 flex-1">
                <div className={`w-12 h-12 bg-${statusConfig[claim.status].color}-500/20 rounded-xl flex items-center justify-center text-${statusConfig[claim.status].color}-600`}>
                  {statusConfig[claim.status].icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="font-semibold text-dark-900">Claim #{claim.claimId}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig[claim.status].color}-500/20 text-${statusConfig[claim.status].color}-700`}>
                      {statusConfig[claim.status].label}
                    </span>
                  </div>
                  <p className="text-dark-600 text-sm mb-2">{claim.description}</p>
                  <div className="flex items-center space-x-4 text-xs text-dark-500">
                    <span>Pool ID: {claim.poolId}</span>
                    <span>Amount: {claim.amount} ETH</span>
                    <span>Votes: {claim.approvalCount || 0} / {(claim.approvalCount || 0) + (claim.rejectionCount || 0)}</span>
                  </div>
                </div>
              </div>
              <button className="btn-secondary ml-4">View Details</button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
