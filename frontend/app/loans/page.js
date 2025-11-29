'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { FaCoins, FaCheckCircle, FaClock, FaTimes } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Loans() {
  const { account } = useWeb3();
  const [loans, setLoans] = useState([]);
  const [creditScore, setCreditScore] = useState(500);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account]);

  const loadData = async () => {
    try {
      const [loansRes, creditRes] = await Promise.all([
        axios.get(`${API_URL}/loans?borrower=${account}`),
        axios.get(`${API_URL}/credit/${account}`)
      ]);
      
      setLoans(loansRes.data);
      setCreditScore(creditRes.data.currentScore || 500);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInterestRate = (score) => {
    if (score >= 800) return 5;
    if (score >= 700) return 8;
    if (score >= 600) return 12;
    if (score >= 500) return 15;
    return 20;
  };

  const statusConfig = {
    PENDING: { color: 'yellow', icon: <FaClock />, label: 'Pending' },
    ACTIVE: { color: 'blue', icon: <FaCheckCircle />, label: 'Active' },
    REPAID: { color: 'green', icon: <FaCheckCircle />, label: 'Repaid' },
    DEFAULTED: { color: 'red', icon: <FaTimes />, label: 'Defaulted' }
  };

  return (
    <div className="max-w-7xl mx-auto py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Healthcare Micro-Loans</h1>

      {/* Credit Score Card */}
      <div className="card-gradient mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-dark-900 mb-2">Your Credit Score</h2>
            <p className="text-dark-600">Based on your payment history and loan performance</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold gradient-text mb-1">{creditScore}</div>
            <p className="text-sm text-dark-600">Interest Rate: {getInterestRate(creditScore)}%</p>
          </div>
        </div>
        <div className="w-full bg-dark-200 rounded-full h-3 mt-4">
          <div
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full"
            style={{ width: `${(creditScore / 900) * 100}%` }}
          />
        </div>
      </div>

      {/* Apply for Loan */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-dark-900 mb-4">Apply for New Loan</h2>
        <p className="text-dark-600 mb-6">
          Get instant healthcare loans from 0.01 to 10 ETH with flexible repayment terms
        </p>
        <button className="btn-primary">Apply Now</button>
      </div>

      {/* Loans List */}
      <h2 className="text-2xl font-bold text-dark-900 mb-4">Your Loans</h2>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : loans.length === 0 ? (
        <div className="card text-center py-12">
          <FaCoins className="text-6xl text-dark-400 mx-auto mb-4" />
          <p className="text-dark-600">No loans yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {loans.map((loan, index) => (
            <motion.div
              key={loan.loanId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`w-12 h-12 bg-${statusConfig[loan.status].color}-500/20 rounded-xl flex items-center justify-center text-${statusConfig[loan.status].color}-600`}>
                    {statusConfig[loan.status].icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="font-semibold text-dark-900">Loan #{loan.loanId}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig[loan.status].color}-500/20 text-${statusConfig[loan.status].color}-700`}>
                        {statusConfig[loan.status].label}
                      </span>
                    </div>
                    <p className="text-dark-600 text-sm mb-2">{loan.purpose}</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-dark-500">Principal</p>
                        <p className="font-semibold text-dark-900">{loan.principal} ETH</p>
                      </div>
                      <div>
                        <p className="text-dark-500">Interest Rate</p>
                        <p className="font-semibold text-dark-900">{loan.interestRate / 100}%</p>
                      </div>
                      <div>
                        <p className="text-dark-500">Duration</p>
                        <p className="font-semibold text-dark-900">{loan.duration} days</p>
                      </div>
                    </div>
                  </div>
                </div>
                {loan.status === 'ACTIVE' && (
                  <button className="btn-primary ml-4">Make Payment</button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
