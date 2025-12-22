import React, { useState } from 'react';
import { Plus, Search, Edit, Check, X, Shield } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
}

const permissions: Permission[] = [
  {
    id: 'manage_users',
    name: 'Manage Users',
    description: 'Create, edit, and delete user accounts',
    module: 'Users'
  },
  {
    id: 'manage_samples',
    name: 'Manage Samples',
    description: 'Handle sample collection and processing',
    module: 'Samples'
  },
  {
    id: 'manage_drivers',
    name: 'Manage Drivers',
    description: 'Assign and track drivers',
    module: 'Drivers'
  },
  {
    id: 'view_reports',
    name: 'View Reports',
    description: 'Access and download reports',
    module: 'Reports'
  },
  {
    id: 'manage_settings',
    name: 'Manage Settings',
    description: 'Configure system settings',
    module: 'Settings'
  }
];

export default function RolesSettings() {
  const [roles, setRoles] = useState<Role[]>([
    {
      id: '1',
      name: 'Lab Manager',
      description: 'Full access to all system features',
      permissions: ['manage_users', 'manage_samples', 'manage_drivers', 'view_reports', 'manage_settings'],
      userCount: 3
    },
    {
      id: '2',
      name: 'Front Desk',
      description: 'Handle sample collection requests and basic operations',
      permissions: ['manage_samples', 'view_reports'],
      userCount: 5
    },
    {
      id: '3',
      name: 'Driver',
      description: 'Access to driver-specific features',
      permissions: ['manage_samples'],
      userCount: 8
    }
  ]);

  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePermissionToggle = (roleId: string, permissionId: string) => {
    setRoles(roles.map(role => {
      if (role.id === roleId) {
        const newPermissions = role.permissions.includes(permissionId)
          ? role.permissions.filter(p => p !== permissionId)
          : [...role.permissions, permissionId];
        return { ...role, permissions: newPermissions };
      }
      return role;
    }));
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-semibold text-secondary-900">User Roles</h2>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" />
          <span>Add Role</span>
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      <div className="space-y-4">
        {filteredRoles.map((role) => (
          <div 
            key={role.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-secondary-900">{role.name}</h3>
                  <p className="text-sm text-secondary-500">{role.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-secondary-500">
                    {role.userCount} users
                  </span>
                  <button 
                    onClick={() => setEditingRole(editingRole === role.id ? null : role.id)}
                    className="p-2 text-secondary-400 hover:text-secondary-600 rounded-lg"
                  >
                    {editingRole === role.id ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {editingRole === role.id ? (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-secondary-900 mb-3">Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-200"
                      >
                        <div className="pt-0.5">
                          <button
                            onClick={() => handlePermissionToggle(role.id, permission.id)}
                            className={`w-5 h-5 rounded border ${
                              role.permissions.includes(permission.id)
                                ? 'bg-primary-500 border-primary-500 text-white'
                                : 'border-gray-300 text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">{permission.name}</p>
                          <p className="text-sm text-secondary-500">{permission.description}</p>
                          <span className="inline-block mt-1 px-2 py-1 text-xs rounded-full bg-gray-100 text-secondary-700">
                            {permission.module}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {permissions
                    .filter(permission => role.permissions.includes(permission.id))
                    .map(permission => (
                      <span
                        key={permission.id}
                        className="px-2 py-1 text-xs rounded-full bg-primary-50 text-primary-700"
                      >
                        {permission.name}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Save Changes Button */}
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          Save Changes
        </button>
      </div>
    </div>
  );
} 