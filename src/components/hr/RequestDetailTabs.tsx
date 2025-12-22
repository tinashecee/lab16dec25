import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface RequestDetailTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function RequestDetailTabs({ tabs, activeTab, onTabChange }: RequestDetailTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
              ${activeTab === id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              }
            `}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
} 