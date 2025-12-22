import React from "react";
import {
  Home,
  Users,
  TestTube2,
  Truck,
  ClipboardList,
  Package,
  FileText,
  MessageSquare,
  Settings,
  BarChart3,
  ClipboardCheck,
  HelpCircle,
  ChevronDown,
  Landmark,
  Fuel,
} from "lucide-react";
import Logo from "./Logo";
import SidebarItem from "./SidebarItem";
import AboutModal from './common/AboutModal';
import { useCurrentUser } from "../hooks/useCurrentUser";

interface SidebarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

const menuItems = [
  { icon: Home, label: "Dashboard", value: "dashboard" },
  { icon: Users, label: "Front Desk", value: "front-desk" },
  { icon: TestTube2, label: "Sample Management", value: "samples" },
  { icon: Users, label: "Human Resources", value: "hr" },
  { icon: ClipboardCheck, label: "HR Approvals", value: "hr-approvals" },
  { icon: FileText, label: "Business Manual", value: "business-manual" },
  { icon: Package, label: "Inventory", value: "inventory" },
  { icon: Landmark, label: "Finance", value: "finance" },
  { icon: Truck, label: "Driver Management", value: "drivers" },
  { icon: Fuel, label: "Fuel Management", value: "fuel-management" },
  { icon: ClipboardList, label: "Tasks", value: "tasks" },
  { icon: BarChart3, label: "Reports", value: "reports" },
  { icon: MessageSquare, label: "Communication", value: "communication" },
  { icon: Settings, label: "Settings", value: "settings" },
];

export default function Sidebar({ onNavigate, currentPage }: SidebarProps) {
  const { role } = useCurrentUser();
  const allowedSettingsRoles = [
    "Finance Manager",
    "Admin Manager",
    "Lab Manager",
    "IT Specialist",
    "Finance Executive",
    "Managing Pathologist"
  ];
  const filteredMenuItems = menuItems.filter(item => {
    if (item.label === "Settings") {
      return allowedSettingsRoles.includes(role);
    }
    return true;
  });
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const helpRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setHelpOpen(false);
      }
    }
    if (helpOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [helpOpen]);

  const handleClick = (value: string) => {
    if (value !== currentPage) {
      onNavigate(value);
    }
  };

  return (
    <div className="bg-white border-r border-gray-200 text-secondary-600 w-64 h-screen fixed top-0 left-0 z-30 p-4 flex flex-col justify-between">
      <div>
        <Logo className="mb-8" />
        <nav className="space-y-1">
          {filteredMenuItems.map((item) => (
            <SidebarItem
              key={item.value}
              {...item}
              isActive={currentPage === item.value}
              onClick={() => handleClick(item.value)}
            />
          ))}
        </nav>
      </div>
      {/* Help Menu */}
      <div className="relative mt-8" ref={helpRef}>
        <button
          className="flex items-center gap-3 w-full p-3 rounded-lg transition-colors hover:bg-gray-50 text-secondary-600"
          onClick={() => setHelpOpen((open) => !open)}
          type="button"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Help</span>
          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
        </button>
        {helpOpen && (
          <div className="absolute left-0 bottom-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50">Support Ticket</button>
            <button 
              className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50"
              onClick={() => { 
                handleClick('user-manual'); 
                setHelpOpen(false); 
              }}
            >
              User Manual
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-secondary-700 hover:bg-gray-50" onClick={() => { setAboutOpen(true); setHelpOpen(false); }}>About</button>
          </div>
        )}
      </div>
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
