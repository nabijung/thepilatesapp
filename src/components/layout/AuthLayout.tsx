'use client';

import { ReactNode } from 'react';

import Header from '@/components/layout/Header';
import { useAppSelector } from '@/store/hooks';

interface AuthLayoutProps {
    children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    const { user, isLoading } = useAppSelector((state) => state.auth);
    const userName = user?.first_name || 'User';

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-t-4 border-[#FD7363] border-solid rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return null; // Will be redirected by the useEffect

    return (
        <div className="min-h-screen bg-[#FAF3EE]">
            <Header userName={userName} />
            <main>
                {children}
            </main>
        </div>
    );
}