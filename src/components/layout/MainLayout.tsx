import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar";
import TopBar from "./TopBar";
import Footer from "./Footer";
import Breadcrumbs from "./Breadcrumbs";

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function MainLayout({
  children,
  currentPage,
  onNavigate,
}: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (page: string) => {
    const targetPath = `/app/${page}`;
    if (!location.pathname.startsWith(targetPath)) {
      onNavigate(page);
      navigate(targetPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Sidebar onNavigate={handleNavigate} currentPage={currentPage} />
      <div className="ml-64 flex flex-col min-h-screen">
        <TopBar />
        <div className="max-w-7xl mx-auto w-full">
          <Breadcrumbs />
        </div>
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
