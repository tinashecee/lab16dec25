import React, { useState } from "react";
import {
  Users,
  TestTube2,
  Building2,
  Calendar,
  FileText,
  ShieldCheck,
  MapPin,
  ChevronRight,
  Settings as SettingsIcon
} from "lucide-react";
import UsersSettings from "../components/settings/UsersSettings";
import DepartmentsSettings from "../components/settings/DepartmentsSettings";
import CalendarSettings from "../components/settings/CalendarSettings";
import BusinessManualSettings from "../components/settings/BusinessManualSettings";
import RolesSettings from "../components/settings/RolesSettings";
import CentersSettings from "../components/settings/CentersSettings";
import { TestsTable } from '../components/settings/TestsTable';
import ApprovalRulesSettings from '../components/settings/ApprovalRulesSettings';
import OrganizationsSettings from '../components/settings/OrganizationsSettings';
import IntegrationsSettings from '../components/settings/IntegrationsSettings';
import VPSettingsComponent from '../components/settings/VPSettings';
import TestsSettings from '../components/settings/TestsSettings';
import ICDCodesSettings from '../components/settings/ICDCodesSettings';

type SettingSection =
  | "users"
  | "tests"
  | "departments"
  | "calendar"
  | "business-manual"
  | "roles"
  | "centers"
  | "organizations"
  | "approval-rules"
  | "icd-codes"
  | "integrations"
  | "finance-vp";

const settingSections = [
  {
    id: "users",
    title: "Users",
    description: "Manage system users and their information",
    icon: Users,
  },
  {
    id: "tests",
    title: "Tests",
    description: "Configure available tests and their parameters",
    icon: TestTube2,
  },
  {
    id: "departments",
    title: "Departments",
    description: "Manage laboratory departments",
    icon: Building2,
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Configure calendar settings and working hours",
    icon: Calendar,
  },
  {
    id: "business-manual",
    title: "Business Manual",
    description: "Manage standard operating procedures and documentation",
    icon: FileText,
  },
  {
    id: "roles",
    title: "User Roles",
    description: "Define user roles and permissions",
    icon: ShieldCheck,
  },
  {
    id: "centers",
    title: "Collection Centers",
    description: "Manage sample collection centers",
    icon: MapPin,
  },
  {
    id: "organizations",
    title: "Organizations",
    description: "Manage healthcare organizations",
    icon: Building2,
  },
  {
    id: "approval-rules",
    title: "Approval Rules",
    description: "Configure approval workflows and thresholds",
    icon: SettingsIcon,
  },
  {
    id: "icd-codes",
    title: "ICD Codes",
    description: "Manage International Classification of Diseases codes",
    icon: FileText,
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "Configure external API connections and keys",
    icon: SettingsIcon,
  },
  {
    id: "finance-vp",
    title: "Finance: Venepuncture",
    description: "Configure venepuncture payment settings",
    icon: SettingsIcon,
  },
] as const;

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingSection>("users");

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
          <p className="text-secondary-600">
            Manage system settings and configurations
          </p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Settings Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <nav className="space-y-1">
              {settingSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? "bg-primary-50 text-primary-600"
                        : "hover:bg-gray-50 text-secondary-600"
                    }`}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{section.title}</span>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 ${
                        activeSection === section.id
                          ? "text-primary-600"
                          : "text-secondary-400"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {activeSection === "users" && <UsersSettings />}
              {activeSection === "tests" && <TestsSettings />}
              {activeSection === "departments" && <DepartmentsSettings />}
              {activeSection === "calendar" && <CalendarSettings />}
              {activeSection === "business-manual" && <BusinessManualSettings />}
              {activeSection === "roles" && <RolesSettings />}
              {activeSection === "centers" && <CentersSettings />}
              {activeSection === "organizations" && <OrganizationsSettings />}
              {activeSection === "approval-rules" && <ApprovalRulesSettings />}
              {activeSection === "icd-codes" && <ICDCodesSettings />}
              {activeSection === "integrations" && <IntegrationsSettings />}
              {activeSection === "finance-vp" && <VPSettingsComponent />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
