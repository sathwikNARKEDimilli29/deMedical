'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { FaChartLine, FaTrophy, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CreditScore() {
  const { account } = useWeb3();
  const [creditData, setCreditData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCreditData = async () => {
      try {
        const response = await axios.get(`${API_URL}/credit/${account}`);
        setCreditData(response.data);
      } catch (error) {
        console.error('Failed to load credit data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (account) {
      loadCreditData();
    }
  }, [account]);



  const getTierColor = (tier) => {
    const colors = {
      'Excellent': 'from-green-500 to-emerald-500',
      'Good': 'from-blue-500 to-cyan-500',
      'Fair': 'from-yellow-500 to-orange-500',
      'Poor': 'from-orange-500 to-red-500',
      'Very Poor': 'from-red-500 to-pink-500'
    };
    return colors[tier] || colors['Fair'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const score = creditData?.currentScore || 500;
  const tier = creditData?.tier || 'Fair';
  const factors = creditData?.factors || {};

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Credit Score</h1>

      {/* Main Score Card */}
      <div className={`card-gradient mb-8 text-center bg-gradient-to-br ${getTierColor(tier)}/20`}>
        <div className="flex items-center justify-center mb-4">
          <FaTrophy className="text-6xl text-yellow-500" />
        </div>
        <h2 className="text-6xl md:text-8xl font-bold gradient-text mb-2">{score}</h2>
        <p className="text-2xl font-semibold text-dark-900 mb-4">{tier}</p>
        <p className="text-dark-600">Your on-chain credit score</p>
        
        <div className="w-full bg-dark-200 rounded-full h-4 mt-6">
          <div
            className={`bg-gradient-to-r ${getTierColor(tier)} h-4 rounded-full transition-all duration-500`}
            style={{ width: `${(score / 900) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-dark-500 mt-2">
          <span>300</span>
          <span>900</span>
        </div>
      </div>

      {/* Score Factors */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-dark-900 mb-6">Score Factors</h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-dark-700">Loan Repayment Rate (40%)</span>
              <span className="font-semibold text-dark-900">
                {factors.totalLoans > 0 
                  ? `${Math.round((factors.repaidLoans / factors.totalLoans) * 100)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="w-full bg-dark-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                style={{
                  width: factors.totalLoans > 0 
                    ? `${(factors.repaidLoans / factors.totalLoans) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-dark-700">Payment Punctuality (30%)</span>
              <span className="font-semibold text-dark-900">
                {factors.totalPayments > 0
                  ? `${Math.round(((factors.totalPayments - factors.latePayments) / factors.totalPayments) * 100)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="w-full bg-dark-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full"
                style={{
                  width: factors.totalPayments > 0
                    ? `${((factors.totalPayments - factors.latePayments) / factors.totalPayments) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-dark-100 rounded-xl p-4">
              <p className="text-dark-600 text-sm mb-1">Total Loans</p>
              <p className="text-2xl font-bold text-dark-900">{factors.totalLoans || 0}</p>
            </div>
            <div className="bg-dark-100 rounded-xl p-4">
              <p className="text-dark-600 text-sm mb-1">Repaid Loans</p>
              <p className="text-2xl font-bold text-dark-900">{factors.repaidLoans || 0}</p>
            </div>
            <div className="bg-dark-100 rounded-xl p-4">
              <p className="text-dark-600 text-sm mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-dark-900">{factors.totalPayments || 0}</p>
            </div>
            <div className="bg-dark-100 rounded-xl p-4">
              <p className="text-dark-600 text-sm mb-1">Late Payments</p>
              <p className="text-2xl font-bold text-dark-900">{factors.latePayments || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Tips */}
      <div className="card">
        <h2 className="text-2xl font-bold text-dark-900 mb-6">How to Improve Your Score</h2>
        <div className="space-y-3">
          {[
            { icon: <FaArrowUp />, text: 'Make all payments on time' },
            { icon: <FaArrowUp />, text: 'Complete loan repayments successfully' },
            { icon: <FaArrowUp />, text: 'Maintain a longer credit history' },
            { icon: <FaArrowDown />, text: 'Avoid late payments and defaults' }
          ].map((tip, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                tip.icon.type === FaArrowUp ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
              }`}>
                {tip.icon}
              </div>
              <p className="text-dark-700">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
