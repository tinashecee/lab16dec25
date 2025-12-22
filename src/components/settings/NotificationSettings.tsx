import React, { useState } from 'react';
import { Mail, Bell, Toggle, Edit, ChevronDown } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

interface NotificationRule {
  id: string;
  event: string;
  template: string;
  recipients: string[];
  isActive: boolean;
}

export default function NotificationSettings() {
  const [templates] = useState<NotificationTemplate[]>([
    {
      id: '1',
      name: 'Sample Collection Request',
      subject: 'New Sample Collection Request - {requestId}',
      body: 'Dear {driverName},\n\nA new sample collection request has been assigned to you.\n\nLocation: {location}\nTime: {time}\n\nBest regards,\nLab Partners',
      variables: ['requestId', 'driverName', 'location', 'time']
    },
    {
      id: '2',
      name: 'Sample Processing Complete',
      subject: 'Sample {sampleId} Processing Complete',
      body: 'Dear {centerName},\n\nThe sample processing has been completed.\n\nSample ID: {sampleId}\nTest: {testName}\n\nBest regards,\nLab Partners',
      variables: ['sampleId', 'centerName', 'testName']
    }
  ]);

  const [rules] = useState<NotificationRule[]>([
    {
      id: '1',
      event: 'New Sample Collection Request',
      template: 'Sample Collection Request',
      recipients: ['assigned_driver', 'lab_manager'],
      isActive: true
    },
    {
      id: '2',
      event: 'Sample Processing Complete',
      template: 'Sample Processing Complete',
      recipients: ['collection_center', 'lab_manager'],
      isActive: true
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Email Templates Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-semibold text-secondary-900">Email Templates</h2>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            <Plus className="w-4 h-4" />
            <span>Add Template</span>
          </button>
        </div>

        <div className="space-y-4">
          {templates.map((template) => (
            <div 
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setSelectedTemplate(selectedTemplate === template.id ? null : template.id)}
              >
                <div>
                  <h3 className="font-medium text-secondary-900">{template.name}</h3>
                  <p className="text-sm text-secondary-500">{template.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-secondary-400 hover:text-secondary-600 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <ChevronDown className={`w-5 h-5 text-secondary-400 transition-transform ${
                    selectedTemplate === template.id ? 'transform rotate-180' : ''
                  }`} />
                </div>
              </div>

              {selectedTemplate === template.id && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Template Body
                      </label>
                      <textarea
                        value={template.body}
                        readOnly
                        rows={6}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-1">
                        Available Variables
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {template.variables.map((variable) => (
                          <span 
                            key={variable}
                            className="px-2 py-1 text-xs rounded-full bg-primary-50 text-primary-700"
                          >
                            {`{${variable}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notification Rules Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary-500" />
          <h2 className="text-xl font-semibold text-secondary-900">Notification Rules</h2>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-secondary-900">
                    {rule.event}
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary-600">
                    {rule.template}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {rule.recipients.map((recipient) => (
                        <span 
                          key={recipient}
                          className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700"
                        >
                          {recipient.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.isActive ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        rule.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-secondary-400 hover:text-secondary-600 rounded-lg">
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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