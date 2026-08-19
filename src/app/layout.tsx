import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { GlobalSecurityWrapper } from '@/components/ui/GlobalSecurityWrapper';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.vamsiacademy.in'),
  title: {
    default: 'Vamsi Academy - Premium Online Education & Examination Platform',
    template: '%s | Vamsi Academy',
  },
  description: 'Vamsi Academy provides a state-of-the-art proctored online examination system and premium educational resources for students to excel in their academic careers.',
  keywords: [
    'Vamsi Academy',
    'Online Exams',
    'Proctored Examination',
    'Best Coaching',
    'Student Portal',
    'Online Education',
    'Test Series',
    'Mock Tests'
  ],
  authors: [{ name: 'Vamsi Academy' }],
  creator: 'Vamsi Academy',
  publisher: 'Vamsi Academy',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.vamsiacademy.in',
    siteName: 'Vamsi Academy',
    title: 'Vamsi Academy - Online Examination Platform',
    description: 'Proctored online examination system for Vamsi Academy students. Access premium mock tests and resources.',
    images: [
      {
        url: '/og-image.jpg', // Placeholder for actual OG image if uploaded later
        width: 1200,
        height: 630,
        alt: 'Vamsi Academy Platform',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vamsi Academy - Online Examination Platform',
    description: 'Proctored online examination system and premium educational resources.',
  },
  alternates: {
    canonical: 'https://www.vamsiacademy.in',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Vamsi Academy',
  url: 'https://www.vamsiacademy.in',
  description: 'Proctored online examination system and premium educational resources.',
  sameAs: [
    'https://www.vamsiacademy.in'
  ]
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} font-sans`}>
        <AuthProvider>
          <GlobalSecurityWrapper>{children}</GlobalSecurityWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
