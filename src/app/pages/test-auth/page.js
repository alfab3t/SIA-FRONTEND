"use client";

import { useEffect, useState } from "react";
import { checkAuthStatus } from "@/lib/auth-utils";
import MainContent from "@/components/layout/MainContent";

export default function TestAuthPage() {
  const [authInfo, setAuthInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      console.log("=== TEST AUTH PAGE ===");
      const authStatus = checkAuthStatus();
      console.log("Auth Status:", authStatus);
      setAuthInfo(authStatus);
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <MainContent
        layout="Admin"
        loading={true}
        title="Test Authentication"
        breadcrumb={[{ label: "Test" }]}
      >
        <div>Loading...</div>
      </MainContent>
    );
  }

  return (
    <MainContent
      layout="Admin"
      loading={false}
      title="Test Authentication"
      breadcrumb={[{ label: "Test" }]}
    >
      <div className="card">
        <div className="card-header">
          <h5>Authentication Status</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6>Authentication Status:</h6>
              <p className={authInfo?.isAuthenticated ? "text-success" : "text-danger"}>
                {authInfo?.isAuthenticated ? "✓ Authenticated" : "✗ Not Authenticated"}
              </p>
              
              {!authInfo?.isAuthenticated && (
                <p><strong>Reason:</strong> {authInfo?.reason}</p>
              )}
            </div>
            
            {authInfo?.isAuthenticated && (
              <>
                <div className="col-md-6">
                  <h6>User Data:</h6>
                  <pre className="bg-light p-2 rounded">
                    {JSON.stringify(authInfo.userData, null, 2)}
                  </pre>
                </div>
                
                <div className="col-md-6">
                  <h6>SSO Data:</h6>
                  <pre className="bg-light p-2 rounded">
                    {JSON.stringify(authInfo.ssoData, null, 2)}
                  </pre>
                </div>
                
                <div className="col-md-6">
                  <h6>Permissions:</h6>
                  <pre className="bg-light p-2 rounded">
                    {JSON.stringify(authInfo.permissions, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-3">
            <button 
              className="btn btn-primary me-2"
              onClick={() => window.location.href = "/pages/Page_Administrasi_Pengajuan_Cuti_Akademik"}
            >
              Go to Cuti Akademik
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </MainContent>
  );
}