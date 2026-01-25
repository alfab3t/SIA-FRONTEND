"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { checkAuthStatus, clearAuthCookies } from "@/lib/auth-utils";
import MainContent from "@/components/layout/MainContent";

import PropTypes from "prop-types";

export default function AuthGuard({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = checkAuthStatus();
        
        if (process.env.NODE_ENV === 'development') {
          console.log("AuthGuard - Auth Status:", authStatus);
        }
        
        if (!authStatus.isAuthenticated) {
          if (process.env.NODE_ENV === 'development') {
            console.log("AuthGuard - Not authenticated:", authStatus.reason);
          }
          clearAuthCookies();
          router.push("/auth/login");
          return;
        }

        // For now, skip permission checking to allow access
        // This is a temporary fix while we debug the permission system
        if (process.env.NODE_ENV === 'development') {
          console.log("AuthGuard - Authentication successful, allowing access");
          console.log("AuthGuard - User permissions:", authStatus.permissions);
        }

        setIsAuthenticated(true);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error("AuthGuard - Error:", error);
        }
        clearAuthCookies();
        router.push("/auth/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <MainContent
        layout="Admin"
        loading={true}
        title="Memuat..."
        breadcrumb={[]}
      >
        <div className="text-center py-5">
          <output className="spinner-border text-primary">
            <span className="visually-hidden">Loading...</span>
          </output>
          <p className="mt-3 text-muted">Memverifikasi autentikasi...</p>
        </div>
      </MainContent>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return children;
}


AuthGuard.propTypes = {
  children: PropTypes.node.isRequired
};
