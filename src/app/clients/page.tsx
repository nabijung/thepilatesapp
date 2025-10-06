// src/app/clients/page.tsx
'use client';

import Image from 'next/image'
import { useState } from 'react';

import ClientList from '@/components/clients/ClientList';
import ChangeStudioModal from '@/components/studio/ChangeStudioModal';
import Card from '@/components/ui/Card';

export default function ClientsPage() {
    const [isChangeStudioModalOpen, setIsChangeStudioModalOpen] = useState(false);

    return (
        <div className="flex flex-col md:flex-row max-w-6xl mx-auto p-4 sm:px-6 md:px-10 md:gap-6">
            {/* Mobile: Fullwidth ClientList, Desktop: 1/3 width */}
            <div className="w-full md:w-1/3 mb-4 md:mb-0">
                <ClientList />
            </div>

            {/* Mobile: Fullwidth Card, Desktop: 2/3 width */}
            <div className="w-full md:w-2/3">
                <Card title="Client Information">
                    <div className="py-12 text-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Image
                                src="/assets/client-gray-icon.svg"
                                height={34}
                                width={34}
                                alt="Select a client icon"
                            />
                        </div>
                        <p className="text-lg font-medium mb-2">No client selected</p>
                        <p className="px-4">Select a client from the list to view their details</p>
                    </div>
                </Card>
            </div>

            <ChangeStudioModal
                isOpen={isChangeStudioModalOpen}
                onClose={() => setIsChangeStudioModalOpen(false)}
            />
        </div>
    );
}