import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { AuthContext } from "../contexts/AuthContext";
import { LoginForm } from "../components/auth/LoginForm";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = React.useContext(AuthContext);
  const { loading: userLoading } = useCurrentUser();

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-12 w-12 bg-primary-200 rounded-full mx-auto"></div>
          <div className="h-4 w-32 bg-gray-200 rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            src="/images/logo.png"
            alt="Lab Partners"
            className="mx-auto h-16 w-auto"
          />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your account
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
          <LoginForm />
        </div>

        <div className="text-center text-sm text-gray-600">
          <p>Lab Partners Management System V2.0</p>
          <p className="mt-1">
            Powered by{" "}
            <a
              href="https://soxfort.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700">
              Soxfort Solutions
            </a>{" "}
            - Intuitive Innovation © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
