'use client';

import { ReactNode } from 'react';

import AuthLayout from '@/components/layout/AuthLayout';

export default function LessonsLayout({ children }: { children: ReactNode }) {
    return <AuthLayout>{children}</AuthLayout>;
}