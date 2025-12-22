import React, { useState, useEffect } from 'react';
import { X, Plus, Trash } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { ApprovalRuleFormData, Approver } from '../../types/approvalRules';
import { userService } from '../../services/userService';
import { User } from '../../types/user';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApprovalRuleFormData) => Promise<void>;
}

const ruleTypes = [
  { value: 'leave', label: 'Leave Request' },
  { value: 'loan', label: 'Loan Request' },
  { value: 'inventory', label: 'Inventory Request' }
] as const;

export const ApprovalRuleForm: React.FC<Props> = ({ isOpen, onClose, onSubmit }) => {
  const [users, setUsers] = useState<User[]>([]);
  const { register, handleSubmit, watch, control, setValue, reset, formState: { errors } } = useForm<ApprovalRuleFormData>({
    defaultValues: {
      requireAllApprovers: false,
      numberOfApprovers: 1,
      approvers: [{ userId: '', userName: '', order: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "approvers"
  });

  const selectedType = watch('type');
  const numberOfApprovers = watch('numberOfApprovers');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Adjust approvers array when numberOfApprovers changes
    const currentLength = fields.length;
    const targetLength = numberOfApprovers;

    if (currentLength < targetLength) {
      // Add new approvers
      for (let i = currentLength; i < targetLength; i++) {
        append({ userId: '', userName: '', order: i + 1 });
      }
    } else if (currentLength > targetLength) {
      // Remove excess approvers
      for (let i = currentLength - 1; i >= targetLength; i--) {
        remove(i);
      }
    }
  }, [numberOfApprovers, fields.length, append, remove]);

  const loadUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleUserSelect = (index: number, userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setValue(`approvers.${index}.userName`, user.name);
    }
  };

  const onFormSubmit = async (data: ApprovalRuleFormData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving approval rule:', error);
    }
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } z-50`}
    >
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Approval Rule</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Rule Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Rule Type</label>
              <select
                {...register('type', { required: 'Rule type is required' })}
                className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">Select a type...</option>
                {ruleTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            {/* Threshold */}
            {selectedType && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {selectedType === 'loan' ? 'Amount Threshold ($)' : 
                   selectedType === 'leave' ? 'Days Threshold' : 
                   'Quantity Threshold'}
                </label>
                <input
                  type="number"
                  {...register('threshold', { 
                    required: 'Threshold is required',
                    min: { value: 0, message: 'Threshold must be positive' }
                  })}
                  className="mt-1 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder={selectedType === 'loan' ? 'e.g., 1000' : 'e.g., 5'}
                />
                {errors.threshold && (
                  <p className="mt-1 text-sm text-red-600">{errors.threshold.message}</p>
                )}
              </div>
            )}

            {/* Number of Approvers */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Number of Approvers Required
              </label>
              <select
                {...register('numberOfApprovers', { 
                  required: 'Number of approvers is required',
                  min: 1
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Approvers */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Approvers
              </label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">
                      {index + 1}{getOrdinalSuffix(index + 1)} Approver
                    </label>
                    <select
                      {...register(`approvers.${index}.userId` as const, {
                        required: 'Approver is required'
                      })}
                      onChange={(e) => handleUserSelect(index, e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    >
                      <option value="">Select approver...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Require All Approvers */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register('requireAllApprovers')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label className="text-sm text-gray-700">
                Require all approvers to approve (in order)
              </label>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button
            type="submit"
            onClick={handleSubmit(onFormSubmit)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Save Rule
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function for ordinal numbers
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
} 