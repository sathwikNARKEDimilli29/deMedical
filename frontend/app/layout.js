import { Inter } from 'next/font/google';
import './globals.css';
import { Web3Provider } from '@/components/providers/Web3Provider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import Navbar from '@/components/Navbar';
import AIAssistant from '@/components/AIAssistant';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'De-Medical - Blockchain Insurance Platform',
  description: 'Revolutionary blockchain-powered insurance with pooled contributions, micro-loans, and smart payment plans',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Web3Provider>
          <AuthProvider>
            <div className="min-h-screen bg-gradient-to-br from-dark-50 via-primary-900/10 to-secondary-900/10">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                {children}
              </main>
              <AIAssistant />
            </div>
          </AuthProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
