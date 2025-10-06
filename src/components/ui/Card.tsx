// src/components/ui/Card.tsx
import { ReactNode } from 'react';

interface CardProps {
    title?: string;
    children: ReactNode;
    actionButton?: ReactNode;
    extraContainerClass?: string
}

export default function Card({ title, children, actionButton, extraContainerClass }: CardProps) {
    return (
        <div className={
            `bg-white rounded-[30px] shadow-sm ${extraContainerClass}`
        }>
            {actionButton || title ? <div className="flex justify-between items-center p-4 ">
                <h2 className="text-lg font-bold text-[#00474E]">{title}</h2>
                {actionButton}
            </div> : null}
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}