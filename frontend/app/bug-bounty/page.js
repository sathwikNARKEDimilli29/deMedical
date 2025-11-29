'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { FaBug, FaTrophy, FaCheckCircle, FaClock, FaTimes, FaShieldAlt } from 'react-icons/fa';
import axios from 'axios';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function BugBounty() {
  const { account } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [researcher, setResearcher] = useState(null);
  const [reports, setReports] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account, loadData]);

  const loadData = useCallback(async () => {
    try {
      // Check if researcher is registered
      const researcherRes = await axios.get(`${API_URL}/bug-bounty/researcher/${account}`).catch(() => null);
      
      if (researcherRes?.data?.researcher) {
        setResearcher(researcherRes.data.researcher);
        setReports(researcherRes.data.reports || []);
        setIsRegistered(true);
      }

      // Load leaderboard
      const leaderboardRes = await axios.get(`${API_URL}/bug-bounty/leaderboard`);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [account]);

  const handleRegister = async () => {
    try {
      await axios.post(`${API_URL}/bug-bounty/register`, { address: account });
      await loadData();
    } catch (error) {
      console.error('Failed to register:', error);
      alert('Registration failed. Please try again.');
    }
  };

  const severityConfig = {
    CRITICAL: { color: 'red', reward: '25 ETH (~$50,000)', icon: '🔴' },
    HIGH: { color: 'orange', reward: '5 ETH (~$10,000)', icon: '🟠' },
    MEDIUM: { color: 'yellow', reward: '2.5 ETH (~$5,000)', icon: '🟡' },
    LOW: { color: 'blue', reward: '0.5 ETH (~$1,000)', icon: '🔵' },
    INFORMATIONAL: { color: 'gray', reward: '0.1 ETH (~$200)', icon: '⚪' }
  };

  const statusConfig = {
    SUBMITTED: { color: 'blue', icon: <FaClock />, label: 'Submitted' },
    TRIAGED: { color: 'yellow', icon: <FaClock />, label: 'Triaged' },
    VERIFIED: { color: 'green', icon: <FaCheckCircle />, label: 'Verified' },
    REJECTED: { color: 'red', icon: <FaTimes />, label: 'Rejected' },
    PAID: { color: 'green', icon: <FaCheckCircle />, label: 'Paid' }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="card-gradient text-center">
          <FaShieldAlt className="text-6xl text-primary-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold gradient-text mb-4">Join Nishkama Bug Bounty Program</h1>
          <p className="text-dark-600 mb-8 text-lg">
            Help secure the platform and earn rewards from $200 to $50,000
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="font-bold text-dark-900 mb-2">Find Bugs</h3>
              <p className="text-sm text-dark-600">Test smart contracts and find vulnerabilities</p>
            </div>
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="font-bold text-dark-900 mb-2">Submit Reports</h3>
              <p className="text-sm text-dark-600">Document with POC and IPFS storage</p>
            </div>
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="font-bold text-dark-900 mb-2">Earn Rewards</h3>
              <p className="text-sm text-dark-600">Get paid for verified vulnerabilities</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 mb-8">
            <h3 className="font-bold text-dark-900 mb-4">Reward Structure</h3>
            <div className="space-y-3">
              {Object.entries(severityConfig).map(([severity, config]) => (
                <div key={severity} className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{config.icon}</span>
                    <span className="font-semibold text-dark-900">{severity}</span>
                  </div>
                  <span className="font-bold text-green-600">{config.reward}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary text-lg px-12 py-4" onClick={handleRegister}>
            Register as Security Researcher
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold gradient-text">Bug Bounty Dashboard</h1>
        <Link href="/bug-bounty/submit">
          <button className="btn-primary">
            <FaBug className="mr-2" />
            Submit New Report
          </button>
        </Link>
      </div>

      {/* Researcher Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card-gradient">
          <p className="text-dark-600 mb-2">Total Reports</p>
          <p className="text-4xl font-bold gradient-text">{researcher?.totalReports || 0}</p>
        </div>
        <div className="card-gradient">
          <p className="text-dark-600 mb-2">Valid Reports</p>
          <p className="text-4xl font-bold text-green-600">{researcher?.validReports || 0}</p>
        </div>
        <div className="card-gradient">
          <p className="text-dark-600 mb-2">Total Rewards</p>
          <p className="text-4xl font-bold text-primary-500">{researcher?.totalRewards || 0} ETH</p>
        </div>
        <div className="card-gradient">
          <p className="text-dark-600 mb-2">Leaderboard Rank</p>
          <div className="flex items-center space-x-2">
            <FaTrophy className="text-3xl text-yellow-500" />
            <p className="text-4xl font-bold text-dark-900">#{researcher?.rank || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Your Reports */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-dark-900 mb-6">Your Bug Reports</h2>
        
        {reports.length === 0 ? (
          <div className="text-center py-12">
            <FaBug className="text-6xl text-dark-400 mx-auto mb-4" />
            <p className="text-dark-600 mb-4">No bug reports yet</p>
            <Link href="/bug-bounty/submit">
              <button className="btn-primary">Submit Your First Report</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report, index) => {
              const severity = severityConfig[report.severity];
              const status = statusConfig[report.status];
              
              return (
                <motion.div
                  key={report.reportId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 border-2 border-dark-200 rounded-2xl hover:border-primary-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-dark-900">{report.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${severity.color}-500/20 text-${severity.color}-700`}>
                          {severity.icon} {report.severity}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${status.color}-500/20 text-${status.color}-700 flex items-center space-x-1`}>
                          {status.icon}
                          <span>{status.label}</span>
                        </span>
                      </div>
                      
                      <p className="text-dark-600 mb-4">Submitted: {new Date(report.submittedAt).toLocaleDateString()}</p>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-dark-500">Report ID</p>
                          <p className="font-semibold text-dark-900">#{report.reportId}</p>
                        </div>
                        <div>
                          <p className="text-dark-500">Potential Reward</p>
                          <p className="font-semibold text-green-600">{severity.reward}</p>
                        </div>
                        <div>
                          <p className="text-dark-500">Actual Reward</p>
                          <p className="font-bold text-green-600">
                            {report.reward ? `${report.reward} ETH` : 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="card">
        <h2 className="text-2xl font-bold text-dark-900 mb-6">🏆 Top Security Researchers</h2>
        
        {leaderboard.length === 0 ? (
          <p className="text-dark-600 text-center py-8">No researchers yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {leaderboard.slice(0, 10).map((researcher, index) => (
              <div
                key={researcher.address}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30' : 'bg-dark-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-dark-200 text-dark-700'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-dark-900">
                      {researcher.address.slice(0, 6)}...{researcher.address.slice(-4)}
                    </p>
                    <p className="text-sm text-dark-500">{researcher.validReports} valid reports</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600 text-lg">{researcher.totalRewards} ETH</p>
                  <p className="text-xs text-dark-500">Total Earned</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
