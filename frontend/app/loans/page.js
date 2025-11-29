'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeb3 } from '@/components/providers/Web3Provider';
import { FaCoins, FaCheckCircle, FaClock, FaTimes, FaLock, FaUnlock, FaUsers, FaShieldAlt } from 'react-icons/fa';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Loans() {
  const { account } = useWeb3();
  const [loans, setLoans] = useState([]);
  const [creditScore, setCreditScore] = useState(500);
  const [loading, setLoading] = useState(true);
  const [selectedLoanType, setSelectedLoanType] = useState('unsecured');
  const [showLoanForm, setShowLoanForm] = useState(false);

  useEffect(() => {
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

    if (account) {
      loadData();
    }
  }, [account]);



  const getBaseInterestRate = (score) => {
    if (score >= 800) return 5;
    if (score >= 700) return 8;
    if (score >= 600) return 12;
    if (score >= 500) return 15;
    return 20;
  };

  const loanTypes = {
    unsecured: {
      name: 'Unsecured',
      icon: <FaUnlock />,
      discount: 0,
      color: 'gray',
      description: 'Traditional credit-based lending',
      requirements: 'Credit score ≥ 400',
      pros: ['No collateral needed', 'Quick approval'],
      cons: ['Highest interest rate', 'Credit score dependent']
    },
    collateralized: {
      name: 'Collateralized',
      icon: <FaLock />,
      discount: 35,
      color: 'blue',
      description: '50% collateral required',
      requirements: 'Credit score ≥ 400 + 50% collateral',
      pros: ['35% interest discount', 'Collateral returned on repayment'],
      cons: ['Requires upfront ETH', 'Collateral seized if default']
    },
    cosigned: {
      name: 'Co-Signed',
      icon: <FaUsers />,
      discount: 20,
      color: 'purple',
      description: 'Co-signer backing required',
      requirements: 'Credit score ≥ 400 + Co-signer (credit ≥ 600)',
      pros: ['20% interest discount', 'Build credit together'],
      cons: ['Co-signer liable if default', 'Affects both credit scores']
    },
    poolBacked: {
      name: 'Pool-Backed',
      icon: <FaShieldAlt />,
      discount: 25,
      color: 'green',
      description: 'Insurance pool coverage',
      requirements: 'Credit score ≥ 400 + Active pool membership',
      pros: ['25% interest discount', 'Pool covers defaults'],
      cons: ['Pool must have funds', 'Blacklisted if default']
    }
  };

  const baseRate = getBaseInterestRate(creditScore);
  const selectedType = loanTypes[selectedLoanType];
  const finalRate = baseRate * (1 - selectedType.discount / 100);

  const statusConfig = {
    PENDING: { color: 'yellow', icon: <FaClock />, label: 'Pending' },
    ACTIVE: { color: 'blue', icon: <FaCheckCircle />, label: 'Active' },
    REPAID: { color: 'green', icon: <FaCheckCircle />, label: 'Repaid' },
    DEFAULTED: { color: 'red', icon: <FaTimes />, label: 'Defaulted' },
    LIQUIDATED: { color: 'orange', icon: <FaTimes />, label: 'Liquidated' }
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
            <p className="text-sm text-dark-600">Base Rate: {baseRate}%</p>
          </div>
        </div>
        <div className="w-full bg-dark-200 rounded-full h-3 mt-4">
          <div
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full"
            style={{ width: `${(creditScore / 900) * 100}%` }}
          />
        </div>
      </div>

      {/* Loan Type Selector */}
      <div className="card mb-8">
        <h2 className="text-2xl font-bold text-dark-900 mb-6">Choose Loan Type</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(loanTypes).map(([key, type]) => {
            const discountedRate = baseRate * (1 - type.discount / 100);
            const isSelected = selectedLoanType === key;
            
            return (
              <motion.div
                key={key}
                whileHover={{ scale: 1.02 }}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? `border-${type.color}-500 bg-${type.color}-500/10`
                    : 'border-dark-200 hover:border-dark-300'
                }`}
                onClick={() => setSelectedLoanType(key)}
              >
                <div className={`w-12 h-12 bg-${type.color}-500/20 rounded-xl flex items-center justify-center text-${type.color}-600 text-2xl mb-4`}>
                  {type.icon}
                </div>
                <h3 className="font-bold text-dark-900 mb-1">{type.name}</h3>
                <p className="text-sm text-dark-600 mb-3">{type.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-dark-500">Interest Rate:</span>
                    <div className="text-right">
                      {type.discount > 0 && (
                        <span className="text-xs text-dark-400 line-through mr-2">{baseRate}%</span>
                      )}
                      <span className="font-bold text-green-600">{discountedRate.toFixed(2)}%</span>
                    </div>
                  </div>
                  {type.discount > 0 && (
                    <div className="text-xs font-semibold text-green-600">
                      Save {type.discount}% on interest!
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Selected Type Details */}
        <div className={`p-6 bg-${selectedType.color}-500/5 rounded-2xl border-2 border-${selectedType.color}-500/20`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-dark-900 mb-2">{selectedType.name} Loan Details</h3>
              <p className="text-dark-600 mb-4">{selectedType.description}</p>
              <p className="text-sm text-dark-500"><strong>Requirements:</strong> {selectedType.requirements}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-dark-500 mb-1">Your Rate</p>
              <p className="text-3xl font-bold gradient-text">{finalRate.toFixed(2)}%</p>
              {selectedType.discount > 0 && (
                <p className="text-xs text-green-600 font-semibold">({selectedType.discount}% discount applied)</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-dark-900 mb-2">✅ Advantages</h4>
              <ul className="space-y-1">
                {selectedType.pros.map((pro, i) => (
                  <li key={i} className="text-sm text-dark-600">• {pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-dark-900 mb-2">⚠️ Considerations</h4>
              <ul className="space-y-1">
                {selectedType.cons.map((con, i) => (
                  <li key={i} className="text-sm text-dark-600">• {con}</li>
                ))}
              </ul>
            </div>
          </div>

          <button 
            className="btn-primary w-full mt-6"
            onClick={() => setShowLoanForm(true)}
          >
            Apply for {selectedType.name} Loan
          </button>
        </div>
      </div>

      {/* Interest Comparison Table */}
      <div className="card mb-8">
        <h3 className="text-xl font-bold text-dark-900 mb-4">Interest Rate Comparison</h3>
        <p className="text-dark-600 mb-4">Based on your credit score of {creditScore}</p>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-dark-200">
                <th className="text-left py-3 px-4">Loan Type</th>
                <th className="text-left py-3 px-4">Base Rate</th>
                <th className="text-left py-3 px-4">Discount</th>
                <th className="text-left py-3 px-4">Final Rate</th>
                <th className="text-right py-3 px-4">Savings on 1 ETH (90 days)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(loanTypes).map(([key, type]) => {
                const discountedRate = baseRate * (1 - type.discount / 100);
                const baseInterest = (1 * baseRate * 90) / (365 * 100);
                const discountedInterest = (1 * discountedRate * 90) / (365 * 100);
                const savings = baseInterest - discountedInterest;
                
                return (
                  <tr key={key} className="border-b border-dark-100 hover:bg-dark-50">
                    <td className="py-3 px-4 font-semibold">{type.name}</td>
                    <td className="py-3 px-4">{baseRate}%</td>
                    <td className="py-3 px-4">
                      {type.discount > 0 ? (
                        <span className="text-green-600 font-semibold">-{type.discount}%</span>
                      ) : (
                        <span className="text-dark-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold">{discountedRate.toFixed(2)}%</td>
                    <td className="py-3 px-4 text-right">
                      {savings > 0 ? (
                        <span className="text-green-600 font-semibold">
                          {savings.toFixed(4)} ETH (~${(savings * 2000).toFixed(2)})
                        </span>
                      ) : (
                        <span className="text-dark-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Your Loans */}
      <h2 className="text-2xl font-bold text-dark-900 mb-4">Your Loans</h2>
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : loans.length === 0 ? (
        <div className="card text-center py-12">
          <FaCoins className="text-6xl text-dark-400 mx-auto mb-4" />
          <p className="text-dark-600 mb-4">No loans yet</p>
          <p className="text-sm text-dark-500">Apply for your first loan above to get started</p>
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
                  <div className={`w-12 h-12 bg-${statusConfig[loan.status]?.color}-500/20 rounded-xl flex items-center justify-center text-${statusConfig[loan.status]?.color}-600`}>
                    {statusConfig[loan.status]?.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="font-semibold text-dark-900">Loan #{loan.loanId}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-${statusConfig[loan.status]?.color}-500/20 text-${statusConfig[loan.status]?.color}-700`}>
                        {statusConfig[loan.status]?.label}
                      </span>
                      {loan.loanType && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-700">
                          {loan.loanType}
                        </span>
                      )}
                    </div>
                    <p className="text-dark-600 text-sm mb-2">{loan.purpose}</p>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-dark-500">Principal</p>
                        <p className="font-semibold text-dark-900">{loan.principal} ETH</p>
                      </div>
                      <div>
                        <p className="text-dark-500">Interest Rate</p>
                        <p className="font-semibold text-dark-900">{(loan.interestRate / 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-dark-500">Duration</p>
                        <p className="font-semibold text-dark-900">{loan.duration} days</p>
                      </div>
                      <div>
                        <p className="text-dark-500">Repaid</p>
                        <p className="font-semibold text-dark-900">{loan.amountRepaid || 0} ETH</p>
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
