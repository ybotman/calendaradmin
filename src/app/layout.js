import { Inter } from 'next/font/google';
import { ThemeRegistry } from '@/components/ThemeRegistry';
import { AuthProvider } from '@/lib/firebase-auth';
import { AppProvider } from '@/lib/AppContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Calendar Admin',
  description: 'Administration for the Calendar Backend',
  icons: {
    icon: [
      { url: '/CalOpsIcon.png' },
      { url: '/favicon.ico' },
    ],
    apple: '/CalOpsIcon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeRegistry>
          <AuthProvider>
            <AppProvider>
              {children}
            </AppProvider>
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}