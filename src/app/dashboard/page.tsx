// src/app/dashboard/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import StudentDashboard from '@/components/dashboard/StudentDashboard';
import { useAppSelector } from '@/store/hooks';

export default function Dashboard() {
    const router = useRouter();
    const { user, userType, isLoading: loading } = useAppSelector((state) => state.auth);

    useEffect(() => {
        // If not loading and the user is an instructor, redirect to clients
        if (!loading && userType === 'instructor') {
            router.replace('/clients');
        }
    }, [loading, userType, router]);

    if (loading || !user) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div>
            <main className="px-4 sm:px-6 md:px-10">
                <StudentDashboard studentId={String(user.id)} />
            </main>
        </div>
    );
}