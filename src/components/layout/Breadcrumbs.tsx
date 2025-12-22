import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  TestTube2,
  ClipboardCheck,
  FileText,
  Package,
  Truck,
  ClipboardList,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronRight,
} from "lucide-react";

const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <Home className="w-4 h-4 mr-1" />, // Home for dashboard
  "front-desk": <Users className="w-4 h-4 mr-1" />,
  samples: <TestTube2 className="w-4 h-4 mr-1" />,
  hr: <Users className="w-4 h-4 mr-1" />,
  "hr-approvals": <ClipboardCheck className="w-4 h-4 mr-1" />,
  "business-manual": <FileText className="w-4 h-4 mr-1" />,
  inventory: <Package className="w-4 h-4 mr-1" />,
  drivers: <Truck className="w-4 h-4 mr-1" />,
  tasks: <ClipboardList className="w-4 h-4 mr-1" />,
  reports: <BarChart3 className="w-4 h-4 mr-1" />,
  communication: <MessageSquare className="w-4 h-4 mr-1" />,
  settings: <Settings className="w-4 h-4 mr-1" />,
};

function toTitle(str: string) {
  return str
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname
    .replace(/^\/app\/?/, "")
    .split("/")
    .filter(Boolean);

  // Filter out "dashboard" from pathnames to avoid duplication
  const filteredPathnames = pathnames.filter(segment => segment !== "dashboard");

  // Always start with dashboard as home
  const crumbs = [
    {
      to: "/app/dashboard",
      label: "Dashboard",
      icon: ICON_MAP["dashboard"],
    },
    ...filteredPathnames.map((segment, idx) => {
      const to = `/app/${filteredPathnames.slice(0, idx + 1).join("/")}`;
      return {
        to,
        label: toTitle(segment),
        icon: ICON_MAP[segment] || <FileText className="w-4 h-4 mr-1" />,
      };
    }),
  ];

  return (
    <nav className="flex items-center text-sm py-2" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center space-x-1 md:space-x-2">
        {crumbs.map((crumb, idx) => (
          <li key={crumb.to} className="flex items-center">
            {idx > 0 && (
              <ChevronRight className="w-4 h-4 text-gray-400 mx-1" aria-hidden="true" />
            )}
            {idx < crumbs.length - 1 ? (
              <Link
                to={crumb.to}
                className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
              >
                {crumb.icon}
                <span className="hidden sm:inline">{crumb.label}</span>
              </Link>
            ) : (
              <span className="flex items-center text-gray-900 font-semibold" aria-current="page">
                {crumb.icon}
                <span className="hidden sm:inline">{crumb.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs; 