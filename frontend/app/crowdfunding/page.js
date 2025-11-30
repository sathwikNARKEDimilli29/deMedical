'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { 
  FaHeart, 
  FaPlus, 
  FaClock, 
  FaUsers, 
  FaCheckCircle,
  FaSearch,
  FaFilter
} from 'react-icons/fa';
import axios from 'axios';
import Link from 'next/link';
import { ethers } from 'ethers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const categories = [
  { value: 'ALL', label: 'All Categories', icon: '🏥' },
  { value: 'SURGERY', label: 'Surgery', icon: '🔪' },
  { value: 'TREATMENT', label: 'Treatment', icon: '💊' },
  { value: 'MEDICATION', label: 'Medication', icon: '💉' },
  { value: 'EMERGENCY', label: 'Emergency', icon: '🚨' },
  { value: 'THERAPY', label: 'Therapy', icon: '🧠' },
  { value: 'DIAGNOSTICS', label: 'Diagnostics', icon: '🔬' },
  { value: 'OTHER', label: 'Other', icon: '📋' }
];

const statusFilters = [
  { value: 'ALL', label: 'All Campaigns' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUCCESSFUL', label: 'Successful' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' }
];

export default function CrowdFunding() {
  const { account } = useWeb3();
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    successfulCampaigns: 0,
    totalRaised: '0'
  });

  useEffect(() => {
    loadCampaignsAndStats();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [campaigns, selectedCategory, selectedStatus, searchQuery, sortBy]);

  const loadCampaignsAndStats = async () => {
    try {
      setLoading(true);
      
      // Load all campaigns
      const campaignsRes = await axios.get(`${API_URL}/crowdfunding?limit=100`);
      setCampaigns(campaignsRes.data.campaigns || []);

      // Load stats
      const statsRes = await axios.get(`${API_URL}/crowdfunding/stats/overview`);
      setStats(statsRes.data.stats || stats);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    // Category filter
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === 'ending') {
        return new Date(a.deadline) - new Date(b.deadline);
      } else if (sortBy === 'funded') {
        const aProgress = (parseFloat(a.raisedAmount) / parseFloat(a.goalAmount)) * 100;
        const bProgress = (parseFloat(b.raisedAmount) / parseFloat(b.goalAmount)) * 100;
        return bProgress - aProgress;
      }
      return 0;
    });

    setFilteredCampaigns(filtered);
  };

  const calculateProgress = (raised, goal) => {
    const raisedNum = parseFloat(raised || '0');
    const goalNum = parseFloat(goal || '1');
    return Math.min((raisedNum / goalNum) * 100, 100);
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days} days left`;
    return `${hours} hours left`;
  };

  const statusColors = {
    PENDING_APPROVAL: 'yellow',
    ACTIVE: 'blue',
    SUCCESSFUL: 'green',
    FAILED: 'red',
    CANCELLED: 'gray'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="card-gradient text-center">
          <motion.h1 
            className="text-5xl font-bold gradient-text mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            💚 Medical Crowdfunding
          </motion.h1>
          <p className="text-dark-600 text-lg mb-8 max-w-2xl mx-auto">
            Support medical campaigns or create your own to get help with healthcare expenses.
            Transparent, blockchain-powered, and community-driven.
          </p>
          
          <Link href="/crowdfunding/create">
            <button className="btn-primary text-lg px-8 py-4">
              <FaPlus className="mr-2" />
              Start a Campaign
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-gradient">
            <p className="text-dark-600 mb-2">Total Campaigns</p>
            <p className="text-4xl font-bold gradient-text">{stats.totalCampaigns}</p>
          </div>
          <div className="card-gradient">
            <p className="text-dark-600 mb-2">Active Campaigns</p>
            <p className="text-4xl font-bold text-blue-600">{stats.activeCampaigns}</p>
          </div>
          <div className="card-gradient">
            <p className="text-dark-600 mb-2">Successful Campaigns</p>
            <p className="text-4xl font-bold text-green-600">{stats.successfulCampaigns}</p>
          </div>
          <div className="card-gradient">
            <p className="text-dark-600 mb-2">Total Raised</p>
            <p className="text-4xl font-bold text-primary-500">
              {parseFloat(stats.totalRaised || '0').toFixed(2)} ETH
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Filters Section */}
        <div className="card mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-dark-900">Browse Campaigns</h2>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="ending">Ending Soon</option>
                <option value="funded">Most Funded</option>
              </select>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  selectedCategory === category.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-100 text-dark-700 hover:bg-dark-200'
                }`}
              >
                {category.icon} {category.label}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-3">
            {statusFilters.map((status) => (
              <button
                key={status.value}
                onClick={() => setSelectedStatus(status.value)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  selectedStatus === status.value
                    ? 'bg-secondary-500 text-white'
                    : 'bg-dark-100 text-dark-700 hover:bg-dark-200'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="card text-center py-12">
            <FaHeart className="text-6xl text-dark-400 mx-auto mb-4" />
            <p className="text-dark-600 text-lg">No campaigns found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign, index) => {
              const progress = calculateProgress(campaign.raisedAmount, campaign.goalAmount);
              const categoryIcon = categories.find(c => c.value === campaign.category)?.icon || '🏥';
              const statusColor = statusColors[campaign.status] || 'gray';

              return (
                <motion.div
                  key={campaign.campaignId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/crowdfunding/${campaign.campaignId}`}>
                    <div className="card-gradient hover:scale-105 transition-transform cursor-pointer h-full">
                      {/* Status Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${statusColor}-500/20 text-${statusColor}-700`}>
                          {campaign.status.replace('_', ' ')}
                        </span>
                        <span className="text-2xl">{categoryIcon}</span>
                      </div>

                      {/* Campaign Title */}
                      <h3 className="text-xl font-bold text-dark-900 mb-2 line-clamp-2">
                        {campaign.title}
                      </h3>

                      {/* Creator */}
                      <p className="text-sm text-dark-500 mb-4">
                        by {campaign.creator.slice(0, 6)}...{campaign.creator.slice(-4)}
                      </p>

                      {/* Description */}
                      <p className="text-dark-600 mb-4 line-clamp-3">
                        {campaign.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-dark-600">
                            {parseFloat(campaign.raisedAmount || '0').toFixed(4)} ETH raised
                          </span>
                          <span className="font-bold text-dark-900">
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-dark-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-dark-600 mt-1">
                          Goal: {parseFloat(campaign.goalAmount).toFixed(4)} ETH
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1 text-dark-600">
                          <FaUsers />
                          <span>{campaign.contributorsCount || 0} backers</span>
                        </div>
                        <div className="flex items-center space-x-1 text-dark-600">
                          <FaClock />
                          <span>{getTimeRemaining(campaign.deadline)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
