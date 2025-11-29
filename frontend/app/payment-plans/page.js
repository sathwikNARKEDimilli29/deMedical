'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaCreditCard, FaPiggyBank, FaCalendarAlt } from 'react-icons/fa';

export default function PaymentPlans() {
  const [activeTab, setActiveTab] = useState('bnpl');

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-4xl font-bold gradient-text mb-8">Payment Plans</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab('bnpl')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'bnpl'
              ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
              : 'bg-dark-200 text-dark-700'
          }`}
        >
          <FaCreditCard className="inline mr-2" />
          Buy Now Pay Later
        </button>
        <button
          onClick={() => setActiveTab('snpl')}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === 'snpl'
              ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
              : 'bg-dark-200 text-dark-700'
          }`}
        >
          <FaPiggyBank className="inline mr-2" />
          Save Now Pay Later
        </button>
      </div>

      {activeTab === 'bnpl' ? (
        <div>
          {/* BNPL Info */}
          <div className="card-gradient mb-8">
            <h2 className="text-2xl font-bold text-dark-900 mb-4">Buy Now Pay Later</h2>
            <p className="text-dark-600 mb-4">
              Split your medical expenses into easy monthly installments. Interest rates based on your credit score (3-15%).
            </p>
            <ul className="space-y-2 text-dark-700">
              <li>✓ 2-12 monthly installments</li>
              <li>✓ Credit score based interest rates</li>
              <li>✓ Minimum credit score: 450</li>
              <li>✓ Instant approval for qualified users</li>
            </ul>
          </div>

          {/* Create BNPL */}
          <div className="card">
            <h3 className="text-xl font-bold text-dark-900 mb-6">Create New BNPL Plan</h3>
            <button className="btn-primary w-full">Create Plan</button>
          </div>
        </div>
      ) : (
        <div>
          {/* SNPL Info */}
          <div className="card-gradient mb-8">
            <h2 className="text-2xl font-bold text-dark-900 mb-4">Save Now Pay Later</h2>
            <p className="text-dark-600 mb-4">
              Save systematically for future medical expenses. Set your target and monthly deposit amount.
            </p>
            <ul className="space-y-2 text-dark-700">
              <li>✓ 3-24 month savings plans</li>
              <li>✓ Flexible monthly deposits</li>
              <li>✓ No interest charges</li>
              <li>✓ Withdraw when target reached</li>
            </ul>
          </div>

          {/* Create SNPL */}
          <div className="card">
            <h3 className="text-xl font-bold text-dark-900 mb-6">Create New SNPL Plan</h3>
            <button className="btn-primary w-full">Start Saving</button>
          </div>
        </div>
      )}
    </div>
  );
}
