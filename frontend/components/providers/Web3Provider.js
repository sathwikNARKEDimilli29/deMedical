'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contracts, setContracts] = useState({});

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      initializeProvider();
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  const initializeProvider = async () => {
    if (window.ethereum) {
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      setProvider(web3Provider);
      
      try {
        const network = await web3Provider.getNetwork();
        setChainId(Number(network.chainId));
      } catch (error) {
        console.error('Failed to get network:', error);
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return null;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      
      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);
      
      return accounts[0];
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return null;
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
    } else {
      setAccount(accounts[0]);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
  };

  const getContract = (address, abi) => {
    if (!signer) return null;
    return new ethers.Contract(address, abi, signer);
  };

  const value = {
    provider,
    signer,
    account,
    chainId,
    contracts,
    connectWallet,
    disconnectWallet,
    getContract,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within Web3Provider');
  }
  return context;
};
