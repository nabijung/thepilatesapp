// src/components/auth/AuthCheck.tsx
'use client';

import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCredentials, setLoading } from '@/store/slices/authSlice';

export default function AuthCheck({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    useEffect(() => {
        const checkAuth = async () => {
            dispatch(setLoading(true));
            try {
                const response = await fetch('/api/auth/user');
                const data = await response.json();

                if (data.success && data.data) {
                    dispatch(setCredentials({
                        user: data.data.user,
                        userType: data.data.userType
                    }));
                }
            } catch (error) {
                console.error('Auth check failed:', error);
            } finally {
                dispatch(setLoading(false));
            }
        };

        if (!user) {
            checkAuth();
        }
    }, [dispatch, user]);

    return children;
}