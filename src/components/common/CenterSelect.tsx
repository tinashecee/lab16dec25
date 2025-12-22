import React, { useState, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { useCollectionCenters, Center } from '@/hooks/useCollectionCenters';
import { useClickOutside } from '@/hooks/useClickOutside';

interface CenterSelectProps {
  selectedCenter: Center | null;
  onSelect: (center: Center) => void;
  placeholder?: string;
}

export default function CenterSelect({
  selectedCenter,
  onSelect,
  placeholder = 'Search for a center...'
}: CenterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { centers, loading, error } = useCollectionCenters(searchTerm);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(true)}
        className="w-full p-2 border border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 flex items-center gap-2"
      >
        <MapPin className="w-5 h-5 text-gray-400" />
        <span className={`flex-1 text-sm ${!selectedCenter ? 'text-gray-500' : 'text-gray-900'}`}>
          {selectedCenter ? selectedCenter.label : placeholder}
        </span>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Search centers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : centers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No centers found</div>
            ) : (
              <div className="py-1">
                {centers.map((center) => (
                  <button
                    key={center.id}
                    onClick={() => {
                      onSelect(center);
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3"
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{center.label}</div>
                      <div className="text-xs text-gray-500">{center.address}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 