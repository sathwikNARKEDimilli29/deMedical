'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaShieldAlt, FaCoins, FaCreditCard, FaChartLine, FaUsers, FaRocket } from 'react-icons/fa';

export default function Home() {
  const router = useRouter();

  const features = [
    {
      icon: <FaUsers className="text-4xl" />,
      title: 'Pooled Insurance',
      description: 'Join pools with proportional contributions and claims. Democratic voting on claim approvals.'
    },
    {
      icon: <FaCoins className="text-4xl" />,
      title: 'Micro Loans',
      description: 'Healthcare loans with credit-based interest rates (5-25% APR). Quick approval and flexible terms.'
    },
    {
      icon: <FaChartLine className="text-4xl" />,
      title: 'Credit Scoring',
      description: 'On-chain credit scores that improve with good payment history. Fair and transparent.'
    },
    {
      icon: <FaCreditCard className="text-4xl" />,
      title: 'BNPL & SNPL',
      description: 'Buy Now Pay Later or Save Now Pay Later for medical expenses. Flexible payment plans.'
    },
    {
      icon: <FaShieldAlt className="text-4xl" />,
      title: 'Blockchain Secured',
      description: 'Immutable records, transparent transactions, and trustless smart contracts.'
    },
    {
      icon: <FaRocket className="text-4xl" />,
      title: 'AI Powered',
      description: 'Smart recommendations and 24/7 AI assistant to guide you through the platform.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-transparent to-secondary-500/20 animate-gradient" />
        
        <div className="relative z-10 max-w-6xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="gradient-text">Healthcare Insurance</span>
              <br />
              <span className="text-dark-900">Reimagined</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-dark-600 mb-8 max-w-3xl mx-auto">
              Join the revolution of blockchain-powered insurance with pooled contributions,
              micro-loans, and smart payment plans designed for everyone.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/register" className="btn-primary text-lg px-8 py-4">
                Get Started
              </Link>
              <Link href="/pools" className="btn-secondary text-lg px-8 py-4">
                Explore Pools
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20"
          >
            {[
              { label: 'Active Pools', value: '50+' },
              { label: 'Members Protected', value: '1,000+' },
              { label: 'Claims Processed', value: '$500K+' }
            ].map((stat, index) => (
              <div key={index} className="card-gradient text-center">
                <h3 className="text-4xl font-bold gradient-text mb-2">{stat.value}</h3>
                <p className="text-dark-600">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="section-title">Powerful Features</h2>
            <p className="text-dark-600 text-lg max-w-2xl mx-auto">
              Everything you need for affordable, transparent, and accessible healthcare coverage
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card hover:scale-105 transition-transform"
              >
                <div className="text-primary-500 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-dark-900 mb-3">{feature.title}</h3>
                <p className="text-dark-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-dark-100/50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="section-title">How It Works</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Connect Wallet', desc: 'Link your MetaMask wallet' },
              { step: '2', title: 'Join a Pool', desc: 'Choose and contribute to a pool' },
              { step: '3', title: 'Get Covered', desc: "You're protected immediately" },
              { step: '4', title: 'Submit Claims', desc: 'File claims when needed' }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="card text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-dark-900 mb-2">{item.title}</h3>
                <p className="text-dark-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="card-gradient p-12"
          >
            <h2 className="text-4xl font-bold text-dark-900 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-dark-600 text-lg mb-8">
              Join thousands of members who are already enjoying affordable healthcare coverage
            </p>
            <Link href="/auth/register" className="btn-primary text-lg px-8 py-4 inline-block">
              Create Your Account
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
