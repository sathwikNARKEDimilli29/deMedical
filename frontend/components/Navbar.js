'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWeb3 } from './providers/Web3Provider';
import { useAuth } from './providers/AuthProvider';
import { FaWallet, FaUser, FaBars, FaTimes } from 'react-icons/fa';

export default function Navbar() {
  const { account, connectWallet, disconnectWallet } = useWeb3();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleConnect = async () => {
    await connectWallet();
  };

  const handleDisconnect = () => {
    disconnectWallet();
    logout();
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/pools', label: 'Pools' },
    { href: '/claims', label: 'Claims' },
    { href: '/loans', label: 'Loans' },
    { href: '/credit-score', label: 'Credit Score' },
    { href: '/payment-plans', label: 'Payments' },
  ];

  return (
    <nav className="bg-dark-100/80 backdrop-blur-lg border-b border-dark-200/50 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">N</span>
            </div>
            <span className="text-xl font-bold gradient-text hidden md:block">
              Nishkama
            </span>
          </Link>

          {/* Desktop Nav Links */}
          {account && (
            <div className="hidden md:flex space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-dark-600 hover:text-primary-500 transition-colors font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* Connect Button */}
          <div className="flex items-center space-x-4">
            {account ? (
              <div className="flex items-center space-x-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm text-dark-600">
                    {user?.fullName || 'User'}
                  </span>
                  <span className="text-xs text-dark-500">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center cursor-pointer">
                  <FaUser className="text-white" />
                </div>
                <button
                  onClick={handleDisconnect}
                  className="hidden md:block text-sm text-dark-600 hover:text-red-500 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="btn-primary flex items-center space-x-2"
              >
                <FaWallet />
                <span>Connect Wallet</span>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-dark-600"
            >
              {mobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && account && (
          <div className="md:hidden py-4 border-t border-dark-200/50">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-dark-600 hover:text-primary-500 transition-colors font-medium px-4 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  handleDisconnect();
                  setMobileMenuOpen(false);
                }}
                className="text-red-500 font-medium px-4 py-2 text-left"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
