import React from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";

export default function UserProfile() {
  const { name, role, department } = useCurrentUser();

  return (
    <div className="mt-auto pt-4 border-t border-gray-200">
      <div className="flex items-center gap-3">
        <img
          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=40&h=40"
          alt="User"
          className="w-10 h-10 rounded-full object-cover"
        />
        <div>
          <p className="text-sm font-medium text-secondary-900">{name}</p>
          <p className="text-xs text-secondary-500">{role}</p>
          <p className="text-xs text-secondary-400">{department}</p>
        </div>
      </div>
    </div>
  );
}
