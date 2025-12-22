import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Car,
  Settings as SettingsIcon,
  BookOpen,
  Phone,
  TestTube2,
  Package,
  BarChart3,
  MessageSquare,
  ClipboardList,
  Landmark,
  Fuel
} from 'lucide-react';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Front Desk', href: '/app/front-desk', icon: Phone },
  { name: 'Sample Management', href: '/app/samples', icon: TestTube2 },
  { name: 'Human Resources', href: '/app/human-resources', icon: Users },
  { name: 'HR Approvals', href: '/app/hr-approvals', icon: ClipboardCheck },
  { name: 'Business Manual', href: '/app/business-manual', icon: BookOpen },
  { name: 'Tasks', href: '/app/tasks', icon: ClipboardList },
  { name: 'Inventory', href: '/app/inventory', icon: Package },
  { name: 'Finance', href: '/app/finance', icon: Landmark },
  { name: 'Driver Management', href: '/app/driver-management', icon: Car },
  { name: 'Fuel Management', href: '/app/fuel-management', icon: Fuel },
  { name: 'Reports', href: '/app/reports', icon: BarChart3 },
  { name: 'Communication', href: '/app/communication', icon: MessageSquare },
  { name: 'Settings', href: '/app/settings', icon: SettingsIcon }
];

const allowedSettingsRoles = [
  "Finance Manager",
  "Admin Manager",
  "Lab Manager",
  "IT Specialist",
  "Finance Executive",
  "Managing Pathologist"
];

export default function Sidebar() {
  const { role } = useCurrentUser();

  const filteredNavigation = navigation.filter(item => {
    if (item.name === 'Settings') {
      return allowedSettingsRoles.includes(role);
    }
    // Finance is now visible to all users
    if (item.href === '/app/hr-approvals') {
      return role === 'HR Manager' || role === 'Admin';
    }
    // Fuel Management is now visible to all users
    return true;
  });

  return (
    <div className="flex-shrink-0 w-72 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div 
        className="h-20 flex items-center justify-center px-6 border-b border-gray-200"
      >
        <img 
          src="/images/logo.png" 
          alt="Lab Partners" 
          className="h-12 w-auto"
        />
      </div>

      <nav className="p-4 space-y-1">
        {filteredNavigation.map((item) => (
          <div
            key={item.name}
          >
            <NavLink
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg ${
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-secondary-700 hover:text-primary-600 hover:bg-gray-50'
                }`
              }
            >
              <div>
                <item.icon className="w-5 h-5" />
              </div>
              {item.name}
            </NavLink>
          </div>
        ))}
      </nav>
    </div>
  );
} 