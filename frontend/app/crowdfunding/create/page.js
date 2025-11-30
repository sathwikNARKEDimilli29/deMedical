'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { useRouter } from 'next/navigation';
import { FaUpload, FaPlus, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const categories = [
  { value: 'SURGERY', label: 'Surgery', icon: '🔪' },
  { value: 'TREATMENT', label: 'Treatment', icon: '💊' },
  { value: 'MEDICATION', label: 'Medication', icon: '💉' },
  { value: 'EMERGENCY', label: 'Emergency', icon: '🚨' },
  { value: 'THERAPY', label: 'Therapy', icon: '🧠' },
  { value: 'DIAGNOSTICS', label: 'Diagnostics', icon: '🔬' },
  { value: 'OTHER', label: 'Other', icon: '📋' }
];

export default function CreateCampaign() {
  const { account, contract } = useWeb3();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SURGERY',
    goalAmount: '',
    durationDays: 30,
    allOrNothing: true,
    documents: []
  });

  const [milestones, setMilestones] = useState([
    { description: '', amount: '' }
  ]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMilestoneChange = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { description: '', amount: '' }]);
  };

  const removeMilestone = (index) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(`${API_URL}/ipfs/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        return response.data.ipfsHash;
      });

      const ipfsHashes = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...ipfsHashes]
      }));
      
      alert('Documents uploaded successfully!');
    } catch (error) {
      console.error('Error uploading documents:', error);
      alert('Failed to upload documents. Please try again.');
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.title || !formData.description || !formData.goalAmount) {
        alert('Please fill in all required fields');
        return false;
      }
      if (parseFloat(formData.goalAmount) <= 0) {
        alert('Goal amount must be greater than 0');
        return false;
      }
    }
    
    if (step === 3) {
      // Validate milestones sum to goal
      const totalMilestoneAmount = milestones.reduce(
        (sum, m) => sum + parseFloat(m.amount || 0),
        0
      );
      const goalAmount = parseFloat(formData.goalAmount);
      
      if (Math.abs(totalMilestoneAmount - goalAmount) > 0.0001) {
        alert(`Milestones must sum to goal amount. Current sum: ${totalMilestoneAmount} ETH, Goal: ${goalAmount} ETH`);
        return false;
      }

      for (const milestone of milestones) {
        if (!milestone.description || !milestone.amount) {
          alert('All milestones must have description and amount');
          return false;
        }
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const previousStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    try {
      setLoading(true);

      // Convert milestone amounts to wei
      const milestonesWei = milestones.map(m => ({
        description: m.description,
        amount: ethers.parseEther(m.amount).toString(),
        isReleased: false
      }));

      // Call smart contract
      const goalWei = ethers.parseEther(formData.goalAmount);
      const tx = await contract.crowdFunding.createCampaign(
        formData.title,
        formData.description,
        categories.findIndex(c => c.value === formData.category),
        goalWei,
        parseInt(formData.durationDays),
        formData.documents,
        formData.allOrNothing,
        milestonesWei
      );

      const receipt = await tx.wait();
      
      // Get campaign ID from event
      const event = receipt.logs.find(log => {
        try {
          return contract.crowdFunding.interface.parseLog(log).name === 'CampaignCreated';
        } catch {
          return false;
        }
      });
      
      const campaignId = event ? contract.crowdFunding.interface.parseLog(event).args.campaignId.toString() : null;

      // Save to backend
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + parseInt(formData.durationDays));

      await axios.post(`${API_URL}/crowdfunding/create`, {
        campaignId: campaignId || Date.now(),
        creator: account,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        goalAmount: formData.goalAmount,
        deadline: deadline.toISOString(),
        documents: formData.documents,
        allOrNothing: formData.allOrNothing,
        milestones: milestones
      });

      alert('Campaign created successfully!');
      router.push(`/crowdfunding/${campaignId || Date.now()}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-dark-900">Basic Information</h2>
            
            <div>
              <label className="block text-dark-700 font-semibold mb-2">Campaign Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
                placeholder="e.g., Help John's Cancer Treatment"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-dark-700 font-semibold mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-700 font-semibold mb-2">Goal Amount (ETH) *</label>
                <input
                  type="number"
                  name="goalAmount"
                  value={formData.goalAmount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0.01"
                  className="w-full px-4 py-3 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  placeholder="e.g., 5.0"
                />
              </div>

              <div>
                <label className="block text-dark-700 font-semibold mb-2">Duration (Days) *</label>
                <input
                  type="number"
                  name="durationDays"
                  value={formData.durationDays}
                  onChange={handleInputChange}
                  min="7"
                  max="365"
                  className="w-full px-4 py-3 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-dark-700 font-semibold mb-2">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-4 py-3 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
                placeholder="Share your story, medical condition, and why you need support..."
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-dark-900">Medical Documents</h2>
            <p className="text-dark-600">Upload medical reports, bills, or other supporting documents (optional but recommended)</p>
            
            <div className="border-2 border-dashed border-dark-300 rounded-xl p-8 text-center">
              <FaUpload className="text-4xl text-dark-400 mx-auto mb-4" />
              <label className="btn-primary cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                Upload Documents
              </label>
              <p className="text-sm text-dark-500 mt-2">PDF, JPG, PNG (Max 10MB each)</p>
            </div>

            {formData.documents.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-dark-900">Uploaded Documents:</h3>
                {formData.documents.map((hash, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-dark-50 rounded-xl">
                    <span className="text-dark-700 font-mono text-sm">{hash.slice(0, 20)}...</span>
                    <button
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        documents: prev.documents.filter((_, i) => i !== index)
                      }))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-dark-900">Milestones</h2>
            <p className="text-dark-600">
              Define how funds will be released. Milestones allow transparent fund management.
              Total must equal your goal amount of {formData.goalAmount} ETH.
            </p>

            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div key={index} className="p-4 border-2 border-dark-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-dark-900">Milestone {index + 1}</h3>
                    {milestones.length > 1 && (
                      <button
                        onClick={() => removeMilestone(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      value={milestone.description}
                      onChange={(e) => handleMilestoneChange(index, 'description', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
                      placeholder="e.g., Initial consultation and diagnosis"
                    />
                    <input
                      type="number"
                      value={milestone.amount}
                      onChange={(e) => handleMilestoneChange(index, 'amount', e.target.value)}
                      step="0.01"
                      min="0.01"
                      className="w-full px-4 py-2 border-2 border-dark-200 rounded-xl focus:border-primary-500 focus:outline-none"
                      placeholder="Amount in ETH"
                    />
                  </div>
                </div>
              ))}

              <button
                onClick={addMilestone}
                className="w-full py-3 border-2 border-dashed border-primary-500 rounded-xl text-primary-500 hover:bg-primary-50 font-semibold flex items-center justify-center space-x-2"
              >
                <FaPlus />
                <span>Add Milestone</span>
              </button>
            </div>

            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <p className="text-blue-900">
                <strong>Total Milestone Amount:</strong> {milestones.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0).toFixed(4)} ETH
              </p>
              <p className="text-blue-900">
                <strong>Goal Amount:</strong> {formData.goalAmount} ETH
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-dark-900">Settings & Review</h2>
            
            <div className="card bg-white p-6">
              <h3 className="font-bold text-dark-900 mb-4">Refund Policy</h3>
              
              <label className="flex items-start space-x-3 p-4 border-2 border-dark-200 rounded-xl cursor-pointer hover:border-primary-500 transition-all mb-3">
                <input
                  type="radio"
                  name="refundPolicy"
                  checked={formData.allOrNothing}
                  onChange={() => setFormData(prev => ({ ...prev, allOrNothing: true }))}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-dark-900">All-or-Nothing (Recommended)</p>
                  <p className="text-sm text-dark-600">You receive funds only if the goal is met. Otherwise, backers are refunded.</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 border-2 border-dark-200 rounded-xl cursor-pointer hover:border-primary-500 transition-all">
                <input
                  type="radio"
                  name="refundPolicy"
                  checked={!formData.allOrNothing}
                  onChange={() => setFormData(prev => ({ ...prev, allOrNothing: false }))}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-dark-900">Keep-it-All</p>
                  <p className="text-sm text-dark-600">You keep all funds raised, regardless of whether the goal is met.</p>
                </div>
              </label>
            </div>

            {/* Review Summary */}
            <div className="card bg-dark-50 p-6">
              <h3 className="font-bold text-dark-900 mb-4">Campaign Summary</h3>
              <div className="space-y-2 text-dark-700">
                <p><strong>Title:</strong> {formData.title}</p>
                <p><strong>Category:</strong> {formData.category}</p>
                <p><strong>Goal:</strong> {formData.goalAmount} ETH</p>
                <p><strong>Duration:</strong> {formData.durationDays} days</p>
                <p><strong>Milestones:</strong> {milestones.length}</p>
                <p><strong>Documents:</strong> {formData.documents.length} uploaded</p>
                <p><strong>Refund Policy:</strong> {formData.allOrNothing ? 'All-or-Nothing' : 'Keep-it-All'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="card">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  s <= step ? 'bg-primary-500 text-white' : 'bg-dark-200 text-dark-500'
                }`}>
                  {s}
                </div>
                {s < 4 && (
                  <div className={`w-12 md:w-24 h-1 ${s < step ? 'bg-primary-500' : 'bg-dark-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-dark-600">
            <span>Basic Info</span>
            <span>Documents</span>
            <span>Milestones</span>
            <span>Review</span>
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderStep()}
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t-2 border-dark-200">
          <button
            onClick={previousStep}
            disabled={step === 1}
            className="px-6 py-3 border-2 border-dark-300 rounded-xl font-semibold text-dark-700 hover:bg-dark-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="btn-primary px-8 py-3"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary px-8 py-3"
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
