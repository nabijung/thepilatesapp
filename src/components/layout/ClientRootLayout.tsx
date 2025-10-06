'use client';

import { ReactNode } from 'react';
import { Provider } from 'react-redux';

import AuthCheck from '@/components/auth/AuthCheck';
import HydrationSafeWrapper from '@/components/layout/HydrationSafeWrapper';
import { store } from '@/store';

export default function ClientRootLayout({ children }: { children: ReactNode }) {
    return (
        <Provider store={store}>
            <HydrationSafeWrapper>
                <AuthCheck>
                    <div className='bg-[#FAF3EE]'>
                        {children}
                    </div>
                </AuthCheck>
            </HydrationSafeWrapper>
        </Provider>
    );
}