'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { FaHeart, FaTrophy, FaClock, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import Link from 'next/link';
import { ethers } from 'ethers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function MyCampaigns() {
  const { account, contract } = useWeb3();
  const [activeTab, setActiveTab] = useState('created'); // 'created' or 'contributed'
  const [createdCampaigns, setCreatedCampaigns] = useState([]);
  const [contributedCampaigns, setContributedCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [releasingMilestone, setReleasingMilestone] = useState(null);

  useEffect(() => {
    if (account) {
      loadData();
    }
  }, [account]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load created campaigns
      const createdRes = await axios.get(`${API_URL}/crowdfunding/user/${account}/created`);
      setCreatedCampaigns(createdRes.data.campaigns || []);

      // Load contributed campaigns
      const contributedRes = await axios.get(`${API_URL}/crowdfunding/user/${account}/contributions`);
      setContributedCampaigns(contributedRes.data.data || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseMilestone = async (campaignId, milestoneIndex) => {
    try {
      setReleasingMilestone(`${campaignId}-${milestoneIndex}`);

      // Upload proof (optional - you could add a form for this)
      const proofHash = ''; // TODO: Add proof upload functionality

      const tx = await contract.crowdFunding.releaseMilestone(
        campaignId,
        milestoneIndex,
        proofHash
      );
      await tx.wait();

      // Update backend
      await axios.post(
        `${API_URL}/crowdfunding/${campaignId}/milestone/${milestoneIndex}/release`,
        { proofIpfsHash: proofHash }
      );

      alert('Milestone funds released successfully!');
      await loadData();
    } catch (error) {
      console.error('Error releasing milestone:', error);
      alert('Failed to release milestone. Please try again.');
    } finally {
      setReleasingMilestone(null);
    }
  };

  const calculateProgress = (raised, goal) => {
    const raisedNum = parseFloat(raised || '0');
    const goalNum = parseFloat(goal || '1');
    return Math.min((raisedNum / goalNum) * 100, 100);
  };

  const getTotalContributed = () => {
    return contributedCampaigns.reduce(
      (sum, item) => sum + parseFloat(item.totalContributed || '0'),
      0
    );
  };

  const getTotalRaisedFromMyConsiders = () => {
    return createdCampaigns.reduce(
      (sum, campaign) => sum + parseFloat(campaign.raisedAmount || '0'),
      0
    );
  };

  const getSuccessRate = () => {
    if (createdCampaigns.length === 0) return 0;
    const successful = createdCampaigns.filter(c => c.status === 'SUCCESSFUL').length;
    return ((successful / createdCampaigns.length) * 100).toFixed(1);
  };

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <FaHeart className="text-6xl text-dark-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-dark-900 mb-2">Connect Your Wallet</h2>
        <p className="text-dark-600">Please connect your wallet to view your campaigns</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">My Campaigns</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card-gradient">
          <p className="text-dark-600 mb-2">Campaigns Created</p>
          <p className="text-4xl font-bold gradient-text">{createdCampaigns.length}</p>
        </div>
        <div className="card-gradient">
          <p className="text-dark-600 mb-2">Total Raised</p>
          <p className="text-4xl font-bold text-primary-500">
            {getTotalRaisedFromMyConsiders().toFixed(4)} ETH
          </p>
        </div>
        <div className="card-gradient">
          <p className="text-dark-600 mb-2">Success Rate</p>
          <p className="text-4xl font-bold text-green-600">{getSuccessRate()}%</p>
        </div>
        <div className="card-gradient">
          <p className="text-dark-600 mb-2">Total Contributed</p>
          <p className="text-4xl font-bold text-secondary-500">
            {getTotalContributed().toFixed(4)} ETH
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab('created')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'created'
              ? 'bg-primary-500 text-white'
              : 'bg-dark-100 text-dark-700 hover:bg-dark-200'
          }`}
        >
          Created by Me ({createdCampaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('contributed')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'contributed'
              ? 'bg-secondary-500 text-white'
              : 'bg-dark-100 text-dark-700 hover:bg-dark-200'
          }`}
        >
          My Contributions ({contributedCampaigns.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'created' ? (
        <div className="space-y-6">
          {createdCampaigns.length === 0 ? (
            <div className="card text-center py-12">
              <FaHeart className="text-6xl text-dark-400 mx-auto mb-4" />
              <p className="text-dark-600 text-lg mb-4">You haven't created any campaigns yet</p>
              <Link href="/crowdfunding/create">
                <button className="btn-primary">Create Your First Campaign</button>
              </Link>
            </div>
          ) : (
            createdCampaigns.map((campaign, index) => {
              const progress = calculateProgress(campaign.raisedAmount, campaign.goalAmount);

              return (
                <motion.div
                  key={campaign.campaignId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link href={`/crowdfunding/${campaign.campaignId}`}>
                        <h3 className="text-2xl font-bold text-dark-900 hover:text-primary-500 cursor-pointer mb-2">
                          {campaign.title}
                        </h3>
                      </Link>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        campaign.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                        campaign.status === 'SUCCESSFUL' ? 'bg-green-100 text-green-700' :
                        campaign.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {campaign.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-500">
                        {parseFloat(campaign.raisedAmount || '0').toFixed(4)} ETH
                      </p>
                      <p className="text-dark-600">
                        of {parseFloat(campaign.goalAmount).toFixed(4)} ETH
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="w-full bg-dark-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-dark-600 mt-1">
                      <span>{progress.toFixed(1)}% funded</span>
                      <span>{campaign.contributorsCount || 0} backers</span>
                    </div>
                  </div>

                  {/* Analytics */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-dark-50 rounded-xl">
                    <div>
                      <p className="text-dark-500 text-sm">Views</p>
                      <p className="font-bold text-dark-900">{campaign.analytics?.viewCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-dark-500 text-sm">Avg. Contribution</p>
                      <p className="font-bold text-dark-900">
                        {parseFloat(campaign.analytics?.averageContribution || '0').toFixed(4)} ETH
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-500 text-sm">Deadline</p>
                      <p className="font-bold text-dark-900">
                        {new Date(campaign.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Milestones Management */}
                  {campaign.milestones && campaign.milestones.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-dark-900 mb-3">Milestones</h4>
                      <div className="space-y-2">
                        {campaign.milestones.map((milestone, midx) => (
                          <div
                            key={midx}
                            className={`flex items-center justify-between p-3 rounded-xl ${
                              milestone.isReleased ? 'bg-green-50 border-2 border-green-300' : 'bg-white border-2 border-dark-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="font-semibold text-dark-900">
                                  Milestone {midx + 1}
                                </p>
                                {milestone.isReleased && (
                                  <FaCheckCircle className="text-green-600" />
                                )}
                              </div>
                              <p className="text-sm text-dark-600">{milestone.description}</p>
                              <p className="text-sm text-dark-500">
                                {parseFloat(milestone.amount).toFixed(4)} ETH
                              </p>
                            </div>

                            {!milestone.isReleased && campaign.status === 'SUCCESSFUL' && (
                              <button
                                onClick={() => handleReleaseMilestone(campaign.campaignId, midx)}
                                disabled={releasingMilestone === `${campaign.campaignId}-${midx}`}
                                className="btn-primary px-4 py-2 text-sm"
                              >
                                {releasingMilestone === `${campaign.campaignId}-${midx}` 
                                  ? 'Releasing...' 
                                  : 'Release Funds'
                                }
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {contributedCampaigns.length === 0 ? (
            <div className="card text-center py-12">
              <FaTrophy className="text-6xl text-dark-400 mx-auto mb-4" />
              <p className="text-dark-600 text-lg mb-4">You haven't contributed to any campaigns yet</p>
              <Link href="/crowdfunding">
                <button className="btn-primary">Browse Campaigns</button>
              </Link>
            </div>
          ) : (
            contributedCampaigns.map((item, index) => {
              const campaign = item.campaign;
              const progress = calculateProgress(campaign.raisedAmount, campaign.goalAmount);

              return (
                <motion.div
                  key={campaign.campaignId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link href={`/crowdfunding/${campaign.campaignId}`}>
                        <h3 className="text-2xl font-bold text-dark-900 hover:text-primary-500 cursor-pointer mb-2">
                          {campaign.title}
                        </h3>
                      </Link>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        campaign.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                        campaign.status === 'SUCCESSFUL' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {campaign.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-dark-600 mb-1">Your Contribution</p>
                      <p className="text-2xl font-bold text-secondary-500">
                        {parseFloat(item.totalContributed).toFixed(4)} ETH
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-dark-600">
                        {parseFloat(campaign.raisedAmount || '0').toFixed(4)} ETH raised
                      </span>
                      <span className="font-bold text-dark-900">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-dark-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-dark-600 mt-1">
                      Goal: {parseFloat(campaign.goalAmount).toFixed(4)} ETH
                    </p>
                  </div>

                  {/* Contribution History */}
                  <div className="p-4 bg-dark-50 rounded-xl">
                    <h4 className="font-semibold text-dark-900 mb-3">Your Contributions</h4>
                    <div className="space-y-2">
                      {item.contributions.map((contrib, cidx) => (
                        <div key={cidx} className="flex justify-between text-sm">
                          <span className="text-dark-600">
                            {new Date(contrib.timestamp).toLocaleString()}
                          </span>
                          <span className="font-semibold text-dark-900">
                            {parseFloat(contrib.amount).toFixed(4)} ETH
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
