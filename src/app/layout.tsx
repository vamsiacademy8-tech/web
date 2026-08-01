import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { GlobalSecurityWrapper } from '@/components/ui/GlobalSecurityWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vamsi Academy - Online Examination Platform',
  description: 'Proctored online examination system for Vamsi Academy students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <GlobalSecurityWrapper>{children}</GlobalSecurityWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
