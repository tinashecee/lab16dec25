import React, { useState, useEffect } from 'react';
import { Plus, Users, DollarSign, Package } from 'lucide-react';
import { ApprovalRule } from '../../types/approvalRules';
import { approvalRulesService } from '../../services/approvalRulesService';
import { ApprovalRuleForm } from './ApprovalRuleForm';

const getTypeIcon = (type: ApprovalRule['type']) => {
  switch (type) {
    case 'leave':
      return <Users className="w-4 h-4" />;
    case 'loan':
      return <DollarSign className="w-4 h-4" />;
    case 'inventory':
      return <Package className="w-4 h-4" />;
  }
};

export default function ApprovalRulesSettings() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await approvalRulesService.getRules();
      setRules(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load approval rules';
      setError(errorMessage);
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Omit<ApprovalRule, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    try {
      await approvalRulesService.addRule(data);
      await loadRules();
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving approval rule:', error);
      throw error;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Approval Rules</h2>
        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Rule</span>
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No approval rules found.</p>
          <p className="mt-2 text-sm">Click the "Add Rule" button to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <div 
              key={rule.id}
              className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2">
                {getTypeIcon(rule.type)}
                <h3 className="font-medium text-gray-900 capitalize">
                  {rule.type} Approval Rule
                </h3>
              </div>
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                {rule.threshold && (
                  <div>
                    <span className="font-medium">Threshold:</span>{' '}
                    {rule.type === 'loan' ? (
                      `$${rule.threshold.toLocaleString()}`
                    ) : (
                      rule.threshold
                    )}
                    {rule.type === 'leave' ? ' days' : ''}
                  </div>
                )}
                <div>
                  <span className="font-medium">Approvers:</span>
                  <div className="mt-1 space-y-1">
                    {rule.approvers.map((approver, index) => (
                      <div key={approver.userId} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {index + 1}{getOrdinalSuffix(index + 1)}:
                        </span>
                        <span>{approver.userName}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Approval Flow:</span>{' '}
                  {rule.requireAllApprovers ? 'Sequential approval required' : 'Any can approve'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ApprovalRuleForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
} 