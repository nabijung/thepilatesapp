'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import InstructorAccountForm from '@/components/account/InstructorAccountForm';
import StudentAccountForm from '@/components/account/StudentAccountForm';
import Header from '@/components/layout/Header';
import { useGetStudioStudentDataQuery } from '@/store/api/clientsApi';
import { useGetInstructorProfileQuery } from '@/store/api/instructorsApi';
import { useGetStudentProfileQuery } from '@/store/api/studentsApi';
import { useAppSelector } from '@/store/hooks';

export default function AccountPage() {
    const router = useRouter();
    const { user, userType } = useAppSelector((state) => state.auth);
    const { activeStudio } = useAppSelector((state) => state.studio);

    // Fetch profile based on user type
    const {
        data: studentProfile,
        isLoading: studentLoading,
        error: studentError
    } = useGetStudentProfileQuery(
        user?.id ? String(user.id) : '',
        { skip: !user?.id || userType !== 'student' }
    );

    const {
        data: instructorProfile,
        isLoading: instructorLoading,
        error: instructorError
    } = useGetInstructorProfileQuery(
        user?.id ? String(user.id) : '',
        { skip: !user?.id || userType !== 'instructor' }
    );

    // Fetch studio-student relationship data if student and has active studio
    const {
        data: studioStudentData,
        isLoading: studioStudentLoading
    } = useGetStudioStudentDataQuery(
        {
            studentId: user?.id ? String(user.id) : '',
            studioId: String(activeStudio?.studio_id) || ''
        },
        {
            skip: !user?.id || userType !== 'student' || !activeStudio?.studio_id
        }
    );

    // Redirect if not authenticated
    useEffect(() => {
        if (!user) {
            router.push('/login');
        }
    }, [user, router]);

    // Determine loading state based on user type
    const isLoading = (userType === 'student' && (studentLoading || studioStudentLoading)) ||
        (userType === 'instructor' && instructorLoading);

    // Determine error state based on user type
    const error = (userType === 'student' && studentError) ||
        (userType === 'instructor' && instructorError);

    // Return loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header userName={user?.first_name || 'User'} />
                <div className="container mx-auto p-4 flex justify-center items-center">
                    <div className="text-center">Loading account information...</div>
                </div>
            </div>
        );
    }

    // Return error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header userName={user?.first_name || 'User'} />
                <div className="container mx-auto p-4 flex justify-center items-center">
                    <div className="text-center text-red-500">
                        Error loading account information. Please try again later.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header userName={user?.first_name || 'User'} />
            <main className="container mx-auto p-4 max-w-4xl">
                {userType === 'student' ? (
                    <StudentAccountForm
                        profile={studentProfile}
                        userId={user?.id ? String(user.id) : undefined}
                        studioStudentData={studioStudentData}
                    />
                ) : (
                    <InstructorAccountForm
                        profile={instructorProfile}
                        userId={user?.id ? String(user.id) : undefined}
                    />
                )}
            </main>
        </div>
    );
}