import Cookies from "js-cookie";

export function debugAuthState() {
  console.log("=== DEBUG AUTH STATE ===");
  
  const cookies = {
    jwtToken: Cookies.get("jwtToken"),
    ssoData: Cookies.get("ssoData"),
    userData: Cookies.get("userData"),
    permissionData: Cookies.get("permissionData")
  };
  
  console.log("Cookies present:");
  Object.entries(cookies).forEach(([key, value]) => {
    console.log(`  ${key}: ${value ? "✓ Present" : "✗ Missing"}`);
    if (value && key === "permissionData") {
      try {
        const permissions = JSON.parse(value);
        console.log(`    Permissions (${permissions.length}):`, permissions);
      } catch (e) {
        console.log(`    Error parsing permissions:`, e.message);
      }
    }
  });
  
  console.log("Current URL:", window.location.href);
  console.log("========================");
  
  return cookies;
}

// Call this function in browser console to debug
if (typeof window !== "undefined") {
  window.debugAuth = debugAuthState;
}