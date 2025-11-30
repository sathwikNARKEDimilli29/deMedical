'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { useParams, useRouter } from 'next/navigation';
import { 
  FaHeart, 
  FaUsers, 
  FaClock, 
  FaCheckCircle,
  FaFileAlt,
  FaShare
} from 'react-icons/fa';
import axios from 'axios';
import { ethers } from 'ethers';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const categories = {
  SURGERY: { label: 'Surgery', icon: '🔪' },
  TREATMENT: { label: 'Treatment', icon: '💊' },
  MEDICATION: { label: 'Medication', icon: '💉' },
  EMERGENCY: { label: 'Emergency', icon: '🚨' },
  THERAPY: { label: 'Therapy', icon: '🧠' },
  DIAGNOSTICS: { label: 'Diagnostics', icon: '🔬' },
  OTHER: { label: 'Other', icon: '📋' }
};

export default function CampaignDetails() {
  const { id } = useParams();
  const { account, contract } = useWeb3();
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');

  useEffect(() => {
    if (id) {
      loadCampaign();
    }
  }, [id]);

  const loadCampaign = async () => {
    try {
      const response = await axios.get(`${API_URL}/crowdfunding/${id}`);
      setCampaign(response.data.campaign);
    } catch (error) {
      console.error('Error loading campaign:', error);
      alert('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setContributing(true);

      const amountWei = ethers.parseEther(contributionAmount);
      const tx = await contract.crowdFunding.contribute(id, { value: amountWei });
      const receipt = await tx.wait();

      // Record in backend
      await axios.post(`${API_URL}/crowdfunding/${id}/contribute`, {
        contributor: account,
        amount: contributionAmount,
        transactionHash: receipt.hash
      });

      alert('Contribution successful! Thank you for your support! 💚');
      setContributionAmount('');
      await loadCampaign();
    } catch (error) {
      console.error('Error contributing:', error);
      alert('Failed to contribute. Please try again.');
    } finally {
      setContributing(false);
    }
  };

  const handleVoteApprove = async (approve) => {
    try {
      const tx = await contract.crowdFunding.voteForCampaignApproval(id, approve);
      await tx.wait();

      await axios.post(`${API_URL}/crowdfunding/${id}/approve`, {
        voter: account,
        approved: approve
      });

      alert(approve ? 'Voted to approve!' : 'Voted to reject');
      await loadCampaign();
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to vote. You may have already voted or the campaign is not pending approval.');
    }
  };

  const calculateProgress = () => {
    if (!campaign) return 0;
    const raised = parseFloat(campaign.raisedAmount || '0');
    const goal = parseFloat(campaign.goalAmount || '1');
    return Math.min((raised / goal) * 100, 100);
  };

  const getTimeRemaining = () => {
    if (!campaign) return 'Loading...';
    
    const now = new Date();
    const end = new Date(campaign.deadline);
    const diff = end - now;

    if (diff <= 0) return 'Campaign Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} days, ${hours} hours left`;
    if (hours > 0) return `${hours} hours, ${minutes} minutes left`;
    return `${minutes} minutes left`;
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Campaign link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-dark-600 text-lg mb-4">Campaign not found</p>
        <Link href="/crowdfunding">
          <button className="btn-primary">Browse Campaigns</button>
        </Link>
      </div>
    );
  }

  const progress = calculateProgress();
  const categoryInfo = categories[campaign.category] || categories.OTHER;
  const isCreator = account && account.toLowerCase() === campaign.creator.toLowerCase();
  const canContribute = campaign.status === 'ACTIVE' && new Date(campaign.deadline) > new Date();

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Header */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <span className="px-4 py-2 bg-dark-100 rounded-full text-sm font-semibold text-dark-700">
                {categoryInfo.icon} {categoryInfo.label}
              </span>
              <button onClick={handleShare} className="flex items-center space-x-2 text-primary-500 hover:text-primary-700">
                <FaShare />
                <span>Share</span>
              </button>
            </div>

            <h1 className="text-4xl font-bold text-dark-900 mb-4">{campaign.title}</h1>

            <div className="flex items-center space-x-4 text-dark-600 mb-6">
              <span>
                by {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}
              </span>
              <span>•</span>
              <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Status Badge */}
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full  font-semibold mb-6">
              {campaign.status.replace('_', ' ')}
            </div>

            {/* Progress Section */}
            <div className="mb-8">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-4xl font-bold text-primary-500">
                    {parseFloat(campaign.raisedAmount || '0').toFixed(4)} ETH
                  </p>
                  <p className="text-dark-600">
                    raised of {parseFloat(campaign.goalAmount).toFixed(4)} ETH goal
                  </p>
                </div>
                <p className="text-3xl font-bold text-dark-900">{progress.toFixed(1)}%</p>
              </div>

              <div className="w-full bg-dark-200 rounded-full h-4">
                <motion.div
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-4 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>

              <div className="flex items-center justify-between mt-4 text-dark-700">
                <div className="flex items-center space-x-2">
                  <FaUsers className="text-primary-500" />
                  <span className="font-semibold">{campaign.contributorsCount || 0}</span>
                  <span>backers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FaClock className="text-primary-500" />
                  <span className="font-semibold">{getTimeRemaining()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card">
            <h2 className="text-2xl font-bold text-dark-900 mb-4">Story</h2>
            <p className="text-dark-700 whitespace-pre-wrap leading-relaxed">
              {campaign.description}
            </p>
          </div>

          {/* Milestones */}
          {campaign.milestones && campaign.milestones.length > 0 && (
            <div className="card">
              <h2 className="text-2xl font-bold text-dark-900 mb-6">Milestones</h2>
              <div className="space-y-4">
                {campaign.milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-2 ${
                      milestone.isReleased
                        ? 'border-green-500 bg-green-50'
                        : 'border-dark-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-bold text-dark-900">Milestone {index + 1}</h3>
                          {milestone.isReleased && (
                            <FaCheckCircle className="text-green-600" />
                          )}
                        </div>
                        <p className="text-dark-700 mb-2">{milestone.description}</p>
                        <p className="text-sm text-dark-600">
                          Amount: {parseFloat(milestone.amount).toFixed(4)} ETH
                        </p>
                        {milestone.isReleased && milestone.releaseDate && (
                          <p className="text-sm text-green-600 mt-1">
                            Released on {new Date(milestone.releaseDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {campaign.documents && campaign.documents.length > 0 && (
            <div className="card">
              <h2 className="text-2xl font-bold text-dark-900 mb-4">Documents</h2>
              <div className="space-y-2">
                {campaign.documents.map((doc, index) => (
                  <a
                    key={index}
                    href={`https://gateway.pinata.cloud/ipfs/${doc}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 p-3 bg-dark-50 rounded-xl hover:bg-dark-100 transition-colors"
                  >
                    <FaFileAlt className="text-primary-500" />
                    <span className="text-dark-700 font-mono text-sm">
                      Document {index + 1}: {doc.slice(0, 20)}...
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Backers List */}
          {campaign.contributors && campaign.contributors.length > 0 && (
            <div className="card">
              <h2 className="text-2xl font-bold text-dark-900 mb-4">
                Recent Backers ({campaign.contributors.length})
              </h2>
              <div className="space-y-3">
                {campaign.contributors.slice(-10).reverse().map((contributor, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-dark-50 rounded-xl"
                  >
                    <span className="text-dark-700">
                      {contributor.contributor.slice(0, 6)}...{contributor.contributor.slice(-4)}
                    </span>
                    <div className="text-right">
                      <p className="font-bold text-primary-500">
                        {parseFloat(contributor.amount).toFixed(4)} ETH
                      </p>
                      <p className="text-xs text-dark-500">
                        {new Date(contributor.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-6">
            {/* Contribution Card */}
            {canContribute && !isCreator && (
              <div className="card-gradient">
                <h3 className="text-2xl font-bold text-dark-900 mb-4">Support This Campaign</h3>
                
                <div className="mb-4">
                  <label className="block text-dark-700 font-semibold mb-2">
                    Contribution Amount (ETH)
                  </label>
                  <input
                    type="number"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    step="0.01"
                    min="0.01"
                    className="w-full px-4 py-3 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none text-lg"
                    placeholder="0.1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {['0.1', '0.5', '1.0'].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setContributionAmount(amount)}
                      className="py-2 bg-dark-100 hover:bg-primary-100 rounded-xl font-semibold text-dark-700 hover:text-primary-700 transition-colors"
                    >
                      {amount} ETH
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleContribute}
                  disabled={contributing || !account}
                  className="btn-primary w-full text-lg py-4"
                >
                  {contributing ? 'Processing...' : (
                    <>
                      <FaHeart className="mr-2" />
                      Contribute Now
                    </>
                  )}
                </button>

                {!account && (
                  <p className="text-sm text-center text-dark-600 mt-2">
                    Please connect your wallet to contribute
                  </p>
                )}
              </div>
            )}

            {/* Pending Approval Voting */}
            {campaign.status === 'PENDING_APPROVAL' && !isCreator && (
              <div className="card bg-yellow-50 border-2 border-yellow-300">
                <h3 className="text-xl font-bold text-dark-900 mb-4">Community Approval</h3>
                <p className="text-dark-700 mb-4">
                  This campaign is pending community approval. Help decide if it should go live.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVoteApprove(true)}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleVoteApprove(false)}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold"
                  >
                    Reject
                  </button>
                </div>
                <p className="text-sm text-dark-600 mt-3">
                  Votes: {campaign.approvalVotes?.length || 0}
                </p>
              </div>
            )}

            {/* Campaign Info */}
            <div className="card">
              <h3 className="text-xl font-bold text-dark-900 mb-4">Campaign Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-dark-500">Refund Policy</p>
                  <p className="font-semibold text-dark-900">
                    {campaign.allOrNothing ? 'All-or-Nothing' : 'Keep-it-All'}
                  </p>
                </div>
                <div>
                  <p className="text-dark-500">Deadline</p>
                  <p className="font-semibold text-dark-900">
                    {new Date(campaign.deadline).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-dark-500">Created</p>
                  <p className="font-semibold text-dark-900">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {isCreator && (
                  <div className="pt-3 border-t-2 border-dark-200">
                    <Link href="/crowdfunding/my-campaigns">
                      <button className="w-full btn-primary">
                        Manage Campaign
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
