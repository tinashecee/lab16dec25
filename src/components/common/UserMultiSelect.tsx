import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Search, User, ChevronDown } from 'lucide-react';
import { User as UserType } from '@/services/userService';
import { userService } from '@/services/userService';
import { useClickOutside } from '@/hooks/useClickOutside';

interface UserMultiSelectProps {
  selectedUsers: User[];
  onSelect: (users: User[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  availableUsers?: User[];
}

export default function UserMultiSelect({ 
  selectedUsers, 
  onSelect, 
  placeholder = "Search and select users...",
  isLoading = false,
  availableUsers = []
}: UserMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  // Filter users based on search term and remove already selected users
  const filteredUsers = availableUsers.filter(user => {
    const isNotSelected = !selectedUsers.some(selected => selected.id === user.id);
    const matchesSearch = searchTerm === '' || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return isNotSelected && matchesSearch;
  });

  const handleUserSelect = (user: User) => {
    onSelect([...selectedUsers, user]);
    setSearchTerm(''); // Clear search after selection
    inputRef.current?.focus();
  };

  const handleUserRemove = (userId: string) => {
    onSelect(selectedUsers.filter(user => user.id !== userId));
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      {/* Selected Users Pills */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          {selectedUsers.map(user => (
            <div 
              key={user.id}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
            >
              <User className="w-3.5 h-3.5" />
              <span>{user.name}</span>
              <button
                type="button"
                onClick={() => handleUserRemove(user.id!)}
                className="ml-1 hover:text-primary-900 hover:bg-primary-200 rounded-full p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input with Dropdown */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          <ChevronDown 
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Dropdown List */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {searchTerm ? 'No users found matching your search' : 'No more users to add'}
              </div>
            ) : (
              <ul className="py-1">
                {filteredUsers.map(user => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => handleUserSelect(user)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary-700">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="truncate">{user.email}</span>
                            {user.department && (
                              <>
                                <span>•</span>
                                <span className="truncate">{user.department}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Check className="w-4 h-4 text-transparent" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Helper Text */}
      {selectedUsers.length > 0 && (
        <div className="text-xs text-gray-500">
          {selectedUsers.length} recipient{selectedUsers.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
} 