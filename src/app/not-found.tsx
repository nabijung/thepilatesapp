'use client'

// src/app/not-found.tsx
import Link from 'next/link';
import { useEffect, useState } from 'react';

import Logo from '@/components/ui/Logo';
import { useAppSelector } from '@/store/hooks';
import { UserType } from '@/types/index';

export default function NotFoundPage() {
    // Use local state to avoid hydration issues
    const [userState, setUserState] = useState({
        isLoggedIn: false,
        userType: null as UserType | null
    });

    // Get auth state from Redux
    const { user, userType } = useAppSelector((state) => state.auth);

    // Update local state after component mounts
    useEffect(() => {
        setUserState({
            isLoggedIn: !!user,
            userType
        });
    }, [user, userType]);

    // Determine link based on user state
    const getLink = () => {
        if (!userState.isLoggedIn) {
            return '/login';
        }

        return userState.userType === 'student' ? '/dashboard' : '/clients';
    };

    // Determine button text based on user state
    const getButtonText = () => {
        if (!userState.isLoggedIn) {
            return 'Go to Login';
        }

        return `Return to ${userState.userType === 'student' ? 'Dashboard' : 'Clients'}`;
    };

    return (
        <div className="min-h-screen bg-[#F9F6F5] flex items-center justify-center p-4">
            <div className="max-w-lg w-full mx-auto bg-white rounded-lg shadow-sm p-6 md:p-8 text-center">
                <div className="mb-6 flex flex-col items-center">
                    <Logo />

                    <div className="flex justify-center my-8">
                        <div className='text-4xl md:text-[100px] font-bold'>404</div>
                    </div>

                    <h1 className="text-xl md:text-2xl font-medium text-[#00474E] mb-2">
                        Page Not Found
                    </h1>

                    <p className="text-sm md:text-base text-gray-500 mb-8">
                        The page you're looking for doesn't exist or has been moved.
                    </p>

                    <Link
                        href={getLink()}
                        className="inline-flex items-center justify-center px-6 py-3 bg-[#FF7A5A] text-white rounded-full text-sm md:text-base transition-colors hover:bg-[#FF6A4A]"
                    >
                        {getButtonText()}
                    </Link>
                </div>
            </div>
        </div>
    );
}