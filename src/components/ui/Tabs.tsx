// src/components/ui/Tabs.tsx
'use client';

interface Tab {
    id: string;
    label: string;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (tabId: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
    return (
        <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex space-x-4 sm:space-x-8 px-4 sm:px-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${activeTab === tab.id
                            ? 'border-[#FD7363] text-[#FD7363]'
                            : 'border-transparent text-[#49454F] hover:text-gray-700 hover:border-[#49454F]'
                            }`}
                        onClick={() => onChange(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
    );
}