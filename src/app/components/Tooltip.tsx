import { useState } from 'react';

export default function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-pointer"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute top-full mt-2 p-2 bg-gray-700 text-white text-sm rounded shadow-lg">
          {text}
        </div>
      )}
    </div>
  );
}