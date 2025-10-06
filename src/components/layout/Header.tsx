// src/components/layout/Header.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import ChangeStudioModal from '@/components/studio/ChangeStudioModal';
import { useLogoutMutation } from '@/store/api/authApi';
import { useGetInstructorStudiosQuery } from '@/store/api/instructorsApi';
import { useGetStudentProfileQuery, useGetStudentStudiosQuery } from '@/store/api/studentsApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout as logoutAndClearStudios } from '@/store/slices/authSlice';
import { setStudios, setActiveStudio, clearStudios } from '@/store/slices/studioSlice';

import { Studio } from '@/store/slices/studioSlice';

import Logo from '../ui/Logo';

interface HeaderProps {
    userName: string;
}

export default function Header({ userName }: HeaderProps) {
    const router = useRouter();

    const [menuOpen, setMenuOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isChangeStudioModalOpen, setIsChangeStudioModalOpen] = useState(false);
    const dispatch = useAppDispatch();
    const [logout] = useLogoutMutation();
    const { user, userType } = useAppSelector((state) => state.auth);
    const { activeStudio } = useAppSelector((state) => state.studio);

    // Fetch user's studios based on user type
    const { data: studentStudios } = useGetStudentStudiosQuery(String(user?.id) || '', {
        skip: !user?.id || userType !== 'student',
        refetchOnMountOrArgChange: true, // Always refetch when component mounts
        refetchOnFocus: true, // Refetch when window regains focus
        refetchOnReconnect: true // Refetch when network reconnects
    });

    const { data: instructorStudios } = useGetInstructorStudiosQuery(String(user?.id) || '', {
        skip: !user?.id || userType !== 'instructor',
        refetchOnMountOrArgChange: true, // Always refetch when component mounts
        refetchOnFocus: true, // Refetch when window regains focus
        refetchOnReconnect: true // Refetch when network reconnects
    });

    // Get student profile data (for profile picture)
    const { data: studentProfile } = useGetStudentProfileQuery(String(user?.id) || '', {
        skip: !user?.id || userType !== 'student'
    });

    // Validate and update activeStudio when instructor studios are fetched
    useEffect(() => {
        if (userType === 'instructor' && instructorStudios && instructorStudios.length > 0) {
            // Type assertion for instructor studios
            const typedInstructorStudios = instructorStudios as Studio[];

            // Check if current activeStudio is in the fetched studios
            const isActiveStudioValid = activeStudio && typedInstructorStudios.some(
                studio => String(studio.studio_id) === String(activeStudio.studio_id)
            );

            if (!isActiveStudioValid) {
                // Find first approved studio
                const firstApprovedStudio = typedInstructorStudios.find(studio => studio.is_approved);

                if (firstApprovedStudio) {
                    dispatch(setActiveStudio(firstApprovedStudio));
                } else {
                    dispatch(clearStudios());
                }
            }

            // Update the studios in Redux state
            dispatch(setStudios(typedInstructorStudios));
        }
    }, [instructorStudios, activeStudio, userType, dispatch]);

    // Validate and update activeStudio when student studios are fetched
    useEffect(() => {
        if (userType === 'student' && studentStudios && studentStudios.length > 0) {
            // Type assertion for student studios
            const typedStudentStudios = studentStudios as Studio[];

            // Check if current activeStudio is in the fetched studios
            const isActiveStudioValid = activeStudio && typedStudentStudios.some(
                studio => String(studio.studio_id) === String(activeStudio.studio_id)
            );

            if (!isActiveStudioValid) {
                // For students, just use the first studio (they don't have approval status)
                const firstStudio = typedStudentStudios[0];

                if (firstStudio) {
                    dispatch(setActiveStudio(firstStudio));
                } else {
                    dispatch(clearStudios());
                }
            }

            // Update the studios in Redux state
            dispatch(setStudios(typedStudentStudios));
        }
    }, [studentStudios, activeStudio, userType, dispatch]);

    // Use short_id if available, otherwise fall back to studio_id
    const shortStudioId = activeStudio?.short_id || activeStudio?.studio_id || '';

    // Studios are now loaded in the validation useEffects above

    // Close mobile menu when route changes
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [router]);

    const handleLogout = async () => {
        try {
            await logout().unwrap();
            dispatch(logoutAndClearStudios());
            router.push('/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const handleOpenChangeStudio = () => {
        setIsChangeStudioModalOpen(true);
        setMenuOpen(false);
        setMobileMenuOpen(false);
    };

    const pendingInstructorStudios = []
    if (instructorStudios) {
        instructorStudios.forEach((studio) => {
            if (!(studio as any).is_approved) {
                pendingInstructorStudios.push(studio)
            }
        })
    }

    // Get the profile picture URL
    const profilePictureUrl = userType === 'student' ? studentProfile?.profile_picture_url : null;

    return (
        <div>
            <header className="bg-[#F7E3D8] p-4 px-4 md:px-10 flex justify-between items-center relative">
                <Link href="/">
                    <Logo />
                </Link>

                {/* Desktop Navigation for instructors */}
                {userType === 'instructor' && (
                    <nav className="hidden md:flex ml-8 space-x-6">
                        <Link href="/clients" className="text-gray-700 hover:text-gray-900">
                            Clients
                        </Link>
                        <Link href="/lessons" className="text-gray-700 hover:text-gray-900">
                            Lessons
                        </Link>
                        <Link href="/instructors" className="text-gray-700 hover:text-gray-900">
                            Studio Instructors
                        </Link>
                    </nav>
                )}

                {/* Desktop User Menu */}
                <div className="hidden md:block relative">
                    <button
                        className="flex items-center space-x-2"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-teal-500 flex items-center justify-center text-white">
                            {profilePictureUrl ? (
                                <img
                                    src={profilePictureUrl}
                                    alt={userName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                userName.charAt(0)
                            )}
                        </div>
                        <span className="text-gray-800">{userName}</span>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                            <div className="py-1">
                                <button
                                    onClick={handleOpenChangeStudio}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Change Studio
                                </button>
                                <Link href="/account"
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Account
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Hamburger Button */}
                <button
                    className="md:hidden flex flex-col justify-center items-center h-10 w-10 relative z-20"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`block h-0.5 w-6 bg-gray-900 transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'rotate-45 translate-y-[8px]' : ''}`}></span>
                    <span className={`block h-0.5 w-6 bg-gray-900 my-1.5 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                    <span className={`block h-0.5 w-6 bg-gray-900 transition-transform duration-300 ease-in-out ${mobileMenuOpen ? '-rotate-45 -translate-y-[7.5px]' : ''}`}></span>
                </button>

                {/* Mobile Menu */}
                <div className={`fixed inset-0 bg-white z-10 transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 flex flex-col h-full">
                        <div className="flex items-center justify-end mb-8">
                            {/* Empty div for spacing */}
                        </div>

                        <div className="flex items-center space-x-3 mb-8 mt-6 px-4">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-teal-500 flex items-center justify-center text-white">
                                {profilePictureUrl ? (
                                    <img
                                        src={profilePictureUrl}
                                        alt={userName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    userName.charAt(0)
                                )}
                            </div>
                            <span className="text-gray-800 font-medium">{userName}</span>
                        </div>

                        {/* Instructor Nav Links (if user is instructor) */}
                        {userType === 'instructor' && (
                            <div className="border-t border-b border-gray-200 py-4 mb-4">
                                <h3 className="text-xs uppercase text-gray-500 font-semibold mb-2 px-4">Navigation</h3>
                                <Link href="/clients" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                                    Clients
                                </Link>
                                <Link href="/lessons" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                                    Lessons
                                </Link>
                                <Link href="/instructors" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
                                    Studio Instructors
                                </Link>
                            </div>
                        )}

                        {/* User Options */}
                        <div className="flex-grow">
                            <button
                                onClick={handleOpenChangeStudio}
                                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                            >
                                Change Studio
                            </button>
                            <Link href="/account"
                                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                            >
                                Account
                            </Link>
                        </div>

                        {/* Logout at bottom */}
                        <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-3 text-red-600 hover:bg-gray-100 border-t border-gray-200 mt-auto"
                        >
                            Log out
                        </button>
                    </div>
                </div>
            </header>

            {userType === 'instructor' && (
                activeStudio && activeStudio.is_approved ? (
                    <div className='flex flex-col sm:flex-row px-4 md:px-10 my-4 md:my-6'>
                        <div className='italic text-lg md:text-[22px] mr-0 sm:mr-5 mb-1 sm:mb-0'>
                            {activeStudio.name}
                        </div>
                        <div className='text-lg md:text-[22px] font-[700]'>
                            Studio ID: {shortStudioId}
                        </div>
                    </div>
                ) : (
                    pendingInstructorStudios.map((pendingStudio) => (
                        <div
                            key={pendingStudio.studio_id}
                            className=" text-yellow-800 text-lg py-2 px-4 md:px-10  my-4 md:my-6">
                            Your approval for {pendingStudio.name} (Studio ID: {pendingStudio.short_id || ''}) is pending
                        </div>
                    ))
                )
            )}
            <ChangeStudioModal
                isOpen={isChangeStudioModalOpen}
                onClose={() => setIsChangeStudioModalOpen(false)}
            />
        </div >
    );
}