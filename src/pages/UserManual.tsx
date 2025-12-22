import React, { useState } from "react";
import { 
  BookOpen, 
  User, 
  Navigation, 
  BarChart3, 
  Phone, 
  UserPlus, 
  TestTube2, 
  FileText, 
  CheckSquare, 
  DollarSign, 
  Truck, 
  ClipboardList, 
  Settings, 
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Home
} from "lucide-react";

interface ManualSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  content: React.ReactNode;
}

const manualSections: ManualSection[] = [
  {
    id: "login-access",
    title: "Login and Access",
    icon: User,
    description: "How to log into the system and manage your account access",
    content: (
      <div className="space-y-6">
        <h4 className="font-semibold text-secondary-900">Step-by-Step Guide: Login and Accessing Lab Partners Automation System</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-secondary-600 mb-4">
            Follow this interactive guide to learn how to login and access the Lab Partners Automation System:
          </p>
          <div className="w-full" style={{ minHeight: '640px' }}>
            <iframe 
              src="https://app.tango.us/app/embed/0d39407d-1946-4d8f-a146-b18d35448d1c" 
              style={{ minHeight: '640px' }} 
              sandbox="allow-scripts allow-top-navigation-by-user-activation allow-popups allow-same-origin" 
              security="restricted" 
              title="Login and Accessing Lab Partners Automation System." 
              width="100%" 
              height="100%" 
              referrerPolicy="strict-origin-when-cross-origin" 
              frameBorder="0" 
              allowFullScreen
            />
          </div>
        </div>
        
        <h4 className="font-semibold text-secondary-900">Getting Started</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Navigate to the login page using your provided URL</li>
          <li>Enter your assigned email address and password</li>
          <li>If you forget your password, use the "Forgot Password" link</li>
          <li>Contact IT support if you're unable to access your account</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Account Security</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Use a strong password with at least 8 characters</li>
          <li>Never share your login credentials with others</li>
          <li>Log out when you're finished using the system</li>
          <li>Report any suspicious account activity immediately</li>
        </ul>
      </div>
    )
  },
  {
    id: "navigation",
    title: "Navigation",
    icon: Navigation,
    description: "How to navigate through the system interface",
    content: (
      <div className="space-y-6">
        <h4 className="font-semibold text-secondary-900">Step-by-Step Guide: Navigating the Lab Partners System</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-secondary-600 mb-4">
            Follow this interactive guide to learn how to navigate through the Lab Partners System:
          </p>
          <div className="w-full" style={{ minHeight: '640px' }}>
            <iframe 
              src="https://app.tango.us/app/embed/9cbcf28f-e386-4843-b323-cddbab67b520" 
              style={{ minHeight: '640px' }} 
              sandbox="allow-scripts allow-top-navigation-by-user-activation allow-popups allow-same-origin" 
              security="restricted" 
              title="Navigating the Lab Partners System" 
              width="100%" 
              height="100%" 
              referrerPolicy="strict-origin-when-cross-origin" 
              frameBorder="0" 
              allowFullScreen
            />
          </div>
        </div>
        
        <h4 className="font-semibold text-secondary-900">Main Interface</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Use the left sidebar to access different system modules</li>
          <li>The top bar shows your profile information and notifications</li>
          <li>Breadcrumbs help you track your current location in the system</li>
          <li>Use the search function to quickly find specific items</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Quick Tips</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Click on section headers to expand or collapse content</li>
          <li>Use keyboard shortcuts where available for faster navigation</li>
          <li>The help menu is always available in the bottom left corner</li>
        </ul>
      </div>
    )
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: BarChart3,
    description: "Understanding your dashboard and key metrics",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Dashboard Overview</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>View key performance indicators and metrics at a glance</li>
          <li>Monitor recent activities and notifications</li>
          <li>Access quick links to frequently used functions</li>
          <li>Customize widget display based on your role and preferences</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Widget Types</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Statistical widgets showing counts and totals</li>
          <li>Chart widgets displaying trends and patterns</li>
          <li>Activity feeds showing recent system events</li>
          <li>Quick action buttons for common tasks</li>
        </ul>
      </div>
    )
  },
  {
    id: "call-logging",
    title: "Call Logging",
    icon: Phone,
    description: "How to log and manage phone calls in the system",
    content: (
      <div className="space-y-6">
        <h4 className="font-semibold text-secondary-900">Step-by-Step Guide: Log Sample Collection Call</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-secondary-600 mb-4">
            Follow this interactive guide to learn how to log sample collection calls in the system:
          </p>
          <div className="w-full" style={{ minHeight: '640px' }}>
            <iframe 
              src="https://app.tango.us/app/embed/5b402406-a354-4902-aae8-b60fce51c679?skipCover=false&defaultListView=false&skipBranding=false&makeViewOnly=true&hideAuthorAndDetails=false" 
              style={{ minHeight: '640px' }} 
              sandbox="allow-scripts allow-top-navigation-by-user-activation allow-popups allow-same-origin" 
              security="restricted" 
              title="Log Sample Collection Call in System" 
              width="100%" 
              height="100%" 
              referrerPolicy="strict-origin-when-cross-origin" 
              frameBorder="0" 
              allowFullScreen
            />
          </div>
        </div>
        
        <h4 className="font-semibold text-secondary-900">Creating Call Logs</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Access the call logging function from the front desk module</li>
          <li>Enter caller information including name and contact details</li>
          <li>Select the purpose of the call from predefined categories</li>
          <li>Add detailed notes about the conversation</li>
          <li>Assign follow-up actions if required</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Managing Call History</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Search call logs by date, caller name, or purpose</li>
          <li>Filter calls by status (completed, pending follow-up)</li>
          <li>Export call reports for analysis</li>
          <li>Update call status and add additional notes</li>
        </ul>
      </div>
    )
  },
  {
    id: "walk-in-registration",
    title: "Walk in Patient Registration",
    icon: UserPlus,
    description: "Process for registering walk-in patients",
    content: (
      <div className="space-y-6">
        <h4 className="font-semibold text-secondary-900">Step-by-Step Guide: Logging Walk in Patients</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-secondary-600 mb-4">
            Follow this interactive guide to learn how to log walk-in patients in the system:
          </p>
          <div className="w-full" style={{ minHeight: '640px' }}>
            <iframe 
              src="https://app.tango.us/app/embed/3af46d0e-9f35-42b8-9562-36330580e49a" 
              style={{ minHeight: '640px' }} 
              sandbox="allow-scripts allow-top-navigation-by-user-activation allow-popups allow-same-origin" 
              security="restricted" 
              title="Logging Walk in Patients Manage" 
              width="100%" 
              height="100%" 
              referrerPolicy="strict-origin-when-cross-origin" 
              frameBorder="0" 
              allowFullScreen
            />
          </div>
        </div>
        
        <h4 className="font-semibold text-secondary-900">Registration Process</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Access the patient registration form from the front desk</li>
          <li>Collect and enter patient demographic information</li>
          <li>Verify patient identification documents</li>
          <li>Record insurance information if applicable</li>
          <li>Assign a unique patient ID number</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Required Information</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Full name and date of birth</li>
          <li>Contact information (phone, email, address)</li>
          <li>Emergency contact details</li>
          <li>Medical history and current medications</li>
          <li>Reason for visit and preferred test date</li>
        </ul>
      </div>
    )
  },
  {
    id: "sample-operations",
    title: "Sample Operations",
    icon: TestTube2,
    description: "Managing laboratory samples and testing procedures",
    content: (
      <div className="space-y-6">
        <h4 className="font-semibold text-secondary-900">Step-by-Step Guide: Sample Operations</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-secondary-600 mb-4">
            Follow this interactive guide to learn how to manage sample operations in the system:
          </p>
          <div className="w-full" style={{ minHeight: '640px' }}>
            <iframe 
              src="https://app.tango.us/app/embed/7cc62e8f-4ba6-42e9-8cf8-398655816eac" 
              style={{ minHeight: '640px' }} 
              sandbox="allow-scripts allow-top-navigation-by-user-activation allow-popups allow-same-origin" 
              security="restricted" 
              title="Sample Operations" 
              width="100%" 
              height="100%" 
              referrerPolicy="strict-origin-when-cross-origin" 
              frameBorder="0" 
              allowFullScreen
            />
          </div>
        </div>
        
        <h4 className="font-semibold text-secondary-900">Sample Collection</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Verify patient identity before sample collection</li>
          <li>Use proper labeling with patient ID and collection time</li>
          <li>Follow standard operating procedures for each sample type</li>
          <li>Ensure proper storage conditions for collected samples</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Sample Tracking</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Track samples from collection to result reporting</li>
          <li>Update sample status at each processing stage</li>
          <li>Monitor sample integrity and quality parameters</li>
          <li>Handle sample rejections and re-collection requests</li>
        </ul>
      </div>
    )
  },
  {
    id: "leave-application",
    title: "Leave Application",
    icon: FileText,
    description: "How to apply for and manage leave requests",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Submitting Leave Requests</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Access the leave application form in the HR module</li>
          <li>Select the type of leave (annual, sick, emergency, etc.)</li>
          <li>Specify start and end dates for your leave period</li>
          <li>Provide a reason for your leave request</li>
          <li>Submit to your supervisor for approval</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Leave Tracking</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>View your leave balance and usage history</li>
          <li>Track the status of pending leave requests</li>
          <li>Receive notifications about approval or rejection</li>
          <li>Plan future leave based on available balance</li>
        </ul>
      </div>
    )
  },
  {
    id: "loan-application",
    title: "Loan Application",
    icon: DollarSign,
    description: "Process for applying for employee loans",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Loan Application Process</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Complete the loan application form with all required details</li>
          <li>Specify the loan amount and preferred repayment terms</li>
          <li>Provide justification for the loan request</li>
          <li>Submit supporting documents as required</li>
          <li>Await review and approval from authorized personnel</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Loan Management</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Monitor loan application status and approvals</li>
          <li>Track repayment schedule and outstanding balance</li>
          <li>Update bank details for loan disbursement</li>
          <li>Request early repayment if desired</li>
        </ul>
      </div>
    )
  },
  {
    id: "leave-approvals",
    title: "Leave Approvals",
    icon: CheckSquare,
    description: "Managing and approving employee leave requests",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Approval Process</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Review pending leave requests from your team members</li>
          <li>Check employee leave balance and eligibility</li>
          <li>Consider operational requirements and staffing needs</li>
          <li>Approve or reject requests with appropriate comments</li>
          <li>Notify employees of approval decisions promptly</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Management Tools</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>View team leave calendar and coverage planning</li>
          <li>Generate leave reports for analysis</li>
          <li>Set up approval delegation during your absence</li>
          <li>Monitor leave patterns and trends</li>
        </ul>
      </div>
    )
  },
  {
    id: "loan-approval",
    title: "Loan Approval",
    icon: DollarSign,
    description: "Process for reviewing and approving loan applications",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Review Process</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Evaluate loan applications based on company policy</li>
          <li>Verify employee eligibility and service record</li>
          <li>Assess loan amount against salary and repayment capacity</li>
          <li>Review supporting documentation and justification</li>
          <li>Make approval decisions within specified timeframes</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Approval Criteria</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Employee must have completed probationary period</li>
          <li>Good performance record and attendance</li>
          <li>No existing loan defaults or disciplinary issues</li>
          <li>Loan amount within policy limits</li>
          <li>Adequate collateral or guarantee if required</li>
        </ul>
      </div>
    )
  },
  {
    id: "business-manual",
    title: "Business Manual",
    icon: BookOpen,
    description: "Accessing and managing business documentation",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Accessing Documents</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Browse documents by category (Finance, HR, Operations, etc.)</li>
          <li>Use search function to find specific procedures</li>
          <li>Download documents for offline reference</li>
          <li>View document version history and updates</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Document Management</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Upload new procedures and policies (authorized users)</li>
          <li>Review and approve document changes</li>
          <li>Maintain document version control</li>
          <li>Archive outdated documents appropriately</li>
        </ul>
      </div>
    )
  },
  {
    id: "driver-management",
    title: "Driver Management",
    icon: Truck,
    description: "Managing driver information and vehicle assignments",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Driver Registration</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Register new drivers with complete profile information</li>
          <li>Upload and verify driving license and documents</li>
          <li>Assign vehicles and routes to drivers</li>
          <li>Set up driver contact information and emergency contacts</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Operations Management</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Track driver schedules and availability</li>
          <li>Monitor vehicle usage and maintenance schedules</li>
          <li>Manage fuel allocation and expense tracking</li>
          <li>Generate driver performance and activity reports</li>
        </ul>
      </div>
    )
  },
  {
    id: "tasks",
    title: "Tasks",
    icon: ClipboardList,
    description: "Creating, assigning, and managing tasks",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Task Creation</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Create new tasks with clear titles and descriptions</li>
          <li>Set priority levels and due dates</li>
          <li>Assign tasks to specific team members</li>
          <li>Add attachments and relevant documentation</li>
          <li>Set up task dependencies and workflows</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Task Management</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Track task progress and status updates</li>
          <li>Monitor task completion rates and deadlines</li>
          <li>Receive notifications for task assignments and updates</li>
          <li>Generate task reports and productivity metrics</li>
        </ul>
      </div>
    )
  },
  {
    id: "reports",
    title: "Reports",
    icon: BarChart3,
    description: "Generating and managing system reports",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Report Types</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Financial reports and revenue analysis</li>
          <li>Operational efficiency and productivity metrics</li>
          <li>Human resources and attendance reports</li>
          <li>Sample processing and laboratory statistics</li>
          <li>Customer satisfaction and service quality reports</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Report Generation</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Select report type and parameters</li>
          <li>Choose date ranges and filtering criteria</li>
          <li>Export reports in various formats (PDF, Excel, CSV)</li>
          <li>Schedule automated report generation</li>
          <li>Share reports with stakeholders</li>
        </ul>
      </div>
    )
  },
  {
    id: "communication",
    title: "Communication",
    icon: MessageSquare,
    description: "Using the communication tools and features",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">Internal Messaging</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Send messages to individual users or groups</li>
          <li>Create message threads for ongoing discussions</li>
          <li>Share files and documents through messages</li>
          <li>Set message priority and delivery notifications</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">Announcements</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Create system-wide announcements</li>
          <li>Target announcements to specific departments</li>
          <li>Schedule announcements for future delivery</li>
          <li>Track announcement read receipts</li>
        </ul>
      </div>
    )
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    description: "Configuring system settings and preferences",
    content: (
      <div className="space-y-4">
        <h4 className="font-semibold text-secondary-900">User Settings</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Update personal profile information</li>
          <li>Change password and security settings</li>
          <li>Configure notification preferences</li>
          <li>Set language and timezone preferences</li>
        </ul>
        
        <h4 className="font-semibold text-secondary-900 mt-6">System Administration</h4>
        <ul className="list-disc list-inside space-y-2 text-secondary-700">
          <li>Manage user accounts and permissions</li>
          <li>Configure system-wide settings and parameters</li>
          <li>Set up integrations with external systems</li>
          <li>Monitor system performance and logs</li>
          <li>Backup and restore system data</li>
        </ul>
      </div>
    )
  }
];

export default function UserManual() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const filteredSections = manualSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary-50 rounded-xl">
            <BookOpen className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">User Manual</h1>
            <p className="text-secondary-600">
              Comprehensive guide to using the laboratory management system
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Search manual sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-primary-50 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-secondary-900 mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" />
          Table of Contents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => toggleSection(section.id)}
              className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-primary-100 transition-colors text-left group"
            >
              <section.icon className="w-5 h-5 text-primary-600 flex-shrink-0" />
              <span className="text-sm font-medium text-secondary-900 group-hover:text-primary-700">
                {section.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Manual Sections */}
      <div className="space-y-4">
        {filteredSections.map((section) => (
          <div
            key={section.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-50 rounded-lg">
                  <section.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-secondary-900">
                    {section.title}
                  </h3>
                  <p className="text-secondary-600 text-sm">
                    {section.description}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {expandedSection === section.id ? (
                  <ChevronDown className="w-5 h-5 text-secondary-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-secondary-400" />
                )}
              </div>
            </button>

            {/* Section Content */}
            {expandedSection === section.id && (
              <div className="px-6 pb-6 border-t border-gray-100">
                <div className="pt-6">
                  {section.content}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredSections.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">
            No sections found
          </h3>
          <p className="text-secondary-600">
            Try adjusting your search terms to find relevant content.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 p-6 bg-gray-50 rounded-xl">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">
            Need Additional Help?
          </h3>
          <p className="text-secondary-600 mb-4">
            If you can't find what you're looking for in this manual, please contact our support team.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Contact Support
            </button>
            <button className="px-4 py-2 border border-gray-200 text-secondary-700 rounded-lg hover:bg-gray-50 transition-colors">
              Submit Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 