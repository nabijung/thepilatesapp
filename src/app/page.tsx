'use client';

import { useAppSelector } from '@/store/hooks';

export default function HomePage() {
    
    const { user, isLoading } = useAppSelector((state) => state.auth);

    // Show loading while determining redirection
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-t-4 border-[#FD7363] border-solid rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
            </div>
        </div>
    );
}