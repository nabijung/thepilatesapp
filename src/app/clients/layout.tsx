'use client';

import { ReactNode } from 'react';

import AuthLayout from '@/components/layout/AuthLayout';

export default function ClientsLayout({ children }: { children: ReactNode }) {
    return <AuthLayout>{children}</AuthLayout>;
}