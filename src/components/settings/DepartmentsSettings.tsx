import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit, X, Check, Trash } from 'lucide-react';
import { Department, departmentService } from '../../services/departmentService';
import NewDepartmentModal from './NewDepartmentModal';

interface EditableRole {
  value: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

export default function DepartmentsSettings() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Department>>({});
  const [isNewDepartmentModalOpen, setIsNewDepartmentModalOpen] = useState(false);
  const [editingRoles, setEditingRoles] = useState<EditableRole[]>([]);

  // Initial data from your list
  const initialDepartments: Department[] = [
    {
      departmentId: 'DEP001',
      name: 'Administration',
      head: 'Admin Manager',
      roles: ['Admin Manager', 'Registration', 'Driver', 'Nurse', 'Infection Control']
    },
    {
      departmentId: 'DEP002',
      name: 'Finance',
      head: 'Finance Manager',
      roles: ['Finance Manager', 'Accounts Clerk']
    },
    {
      departmentId: 'DEP003',
      name: 'Laboratory',
      head: 'Lab Manager',
      roles: ['Lab Manager', 'Lab Supervisor', 'Lab Technician', 'Lab Scientist']
    },
    {
      departmentId: 'DEP004',
      name: 'IT',
      head: 'IT Specialist',
      roles: ['IT Specialist']
    },
    {
      departmentId: 'DEP005',
      name: 'Senior Management',
      head: 'Managing Pathologist',
      roles: ['Managing Pathologist', 'Finance Executive']
    }
  ];

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const data = await departmentService.getAllDepartments();
      if (data.length === 0) {
        // Initialize with default data if empty
        await Promise.all(initialDepartments.map(dept => 
          departmentService.addDepartment(dept)
        ));
        const initializedData = await departmentService.getAllDepartments();
        setDepartments(initializedData);
      } else {
        setDepartments(data);
      }
    } catch (err) {
      setError('Failed to fetch departments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (department: Department) => {
    setEditingId(department.id!);
    setEditForm(department);
    setEditingRoles(department.roles.map(role => ({ value: role })));
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;

    try {
      // Filter out deleted roles and extract only the values
      const updatedRoles = editingRoles
        .filter(role => !role.isDeleted)
        .map(role => role.value.trim())
        .filter(role => role !== '');

      await departmentService.updateDepartment(editingId, {
        ...editForm,
        roles: updatedRoles
      });
      await fetchDepartments();
      setEditingId(null);
      setEditForm({});
      setEditingRoles([]);
    } catch (err) {
      setError('Failed to update department');
    }
  };

  const addRole = () => {
    setEditingRoles(prev => [...prev, { value: '', isNew: true }]);
  };

  const removeRole = (index: number) => {
    setEditingRoles(prev => prev.map((role, i) => 
      i === index ? { ...role, isDeleted: true } : role
    ));
  };

  const updateRole = (index: number, value: string) => {
    setEditingRoles(prev => prev.map((role, i) => 
      i === index ? { ...role, value } : role
    ));
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.head.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="animate-pulse">Loading departments...</div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-secondary-900">Departments</h2>
        <button 
          onClick={() => setIsNewDepartmentModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Head</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredDepartments.map((dept) => (
              <tr key={dept.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-secondary-900">{dept.departmentId}</td>
                <td className="px-6 py-4 text-sm text-secondary-900">
                  {editingId === dept.id ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  ) : (
                    dept.name
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-secondary-600">
                  {editingId === dept.id ? (
                    <input
                      type="text"
                      value={editForm.head || ''}
                      onChange={(e) => setEditForm({ ...editForm, head: e.target.value })}
                      className="w-full px-2 py-1 border rounded"
                    />
                  ) : (
                    dept.head
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === dept.id ? (
                    <div className="space-y-2">
                      {editingRoles
                        .filter(role => !role.isDeleted)
                        .map((role, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={role.value}
                              onChange={(e) => updateRole(index, e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Enter role"
                            />
                            <button
                              type="button"
                              onClick={() => removeRole(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      <button
                        type="button"
                        onClick={addRole}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add role
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {dept.roles.map((role) => (
                        <span 
                          key={role}
                          className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === dept.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({});
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(dept)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit className="w-4 h-4 text-secondary-400" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Department Modal */}
      <NewDepartmentModal
        isOpen={isNewDepartmentModalOpen}
        onClose={() => setIsNewDepartmentModalOpen(false)}
        onSuccess={fetchDepartments}
      />
    </div>
  );
} 