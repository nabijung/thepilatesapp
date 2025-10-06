// src/components/ui/Toast/ToastContainer.tsx
'use client';

import { useEffect } from 'react';

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeToast } from '@/store/slices/toastSlice';

import Toast from './Toast';

export default function ToastContainer() {
    const toasts = useAppSelector(state => state.toast.toasts);
    const dispatch = useAppDispatch();

    // Remove toasts after their duration
    useEffect(() => {
        toasts.forEach(toast => {
            const timer = setTimeout(() => {
                dispatch(removeToast(toast.id));
            }, toast.duration);

            return () => clearTimeout(timer);
        });
    }, [toasts, dispatch]);

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    type={toast.type}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={() => dispatch(removeToast(toast.id))}
                />
            ))}
        </div>
    );
}