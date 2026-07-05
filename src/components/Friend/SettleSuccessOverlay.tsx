import React from 'react';

export const SettleSuccessOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-background/90 animate-fade-in fixed inset-0 z-[100] flex flex-col items-center justify-center gap-[18px] backdrop-blur-[8px]">
    <div className="bg-positive animate-success-pop flex size-[78px] items-center justify-center rounded-full">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="#062226"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
    <div className="text-[17px] font-semibold">{message}</div>
  </div>
);
