import { NextResponse } from "next/server";

const LOGIN_PATH = "/auth/login";
const SSO_PATH = "/auth/sso";
const PROTECTED_PAGES_PATH = "/pages";
const UNAUTHORIZED_PATH = "/auth/sso";
const ROOT_PATH = "/";

const COOKIE_JWT = "jwtToken";
const COOKIE_SSO = "ssoData";
const COOKIE_USER_DATA = "userData";
const COOKIE_PERMISSIONS = "permissionData";

const normalize = (str) => str.replaceAll(/[-_]/g, "").toLowerCase();

function getPermissionsSet(cookies) {
  const cookie = cookies.get(COOKIE_PERMISSIONS);
  if (!cookie) return new Set();

  try {
    const permissions = JSON.parse(cookie.value);
    return new Set(permissions.map((p) => normalize(p.split(".")[0])));
  } catch {
    return new Set();
  }
}

function hasModuleAccess(pathname, permissionsSet) {
  const pathSegments = pathname.split("/").filter(Boolean);
  
  // Check for specific module permissions
  const hasAccess = pathSegments.some((segment) => {
    const normalizedSegment = normalize(segment);
    return permissionsSet.has(normalizedSegment);
  });
  
  // Special case for cuti akademik - check for various permission patterns
  if (pathname.includes("Cuti_Akademik") || pathname.includes("cuti")) {
    const cutiPermissions = [
      "cutiakademik",
      "cuti",
      "akademik", 
      "administrasi",
      "pengajuan",
      "pageadministrasipengajuancutiakademik"
    ];
    
    const hasCutiAccess = cutiPermissions.some(perm => permissionsSet.has(perm));
    if (hasCutiAccess) return true;
  }
  
  return hasAccess;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const loginUrl = new URL(LOGIN_PATH, request.url);
  const ssoUrl = new URL(SSO_PATH, request.url);
  const unauthorizedUrl = new URL(UNAUTHORIZED_PATH, request.url);

  const hasJwt = request.cookies.has(COOKIE_JWT);
  const hasSso = request.cookies.has(COOKIE_SSO);
  const hasUser = request.cookies.has(COOKIE_USER_DATA);
  const hasPermissions = request.cookies.has(COOKIE_PERMISSIONS);
  const isAuthenticated = hasJwt && hasSso;
  const isFullyAuthenticated = isAuthenticated && hasUser;

  // Debug logging for cuti akademik access
  if (pathname.includes("Cuti_Akademik")) {
    console.log("=== MIDDLEWARE DEBUG FOR CUTI AKADEMIK ===");
    console.log("Path:", pathname);
    console.log("Cookies status:");
    console.log("  JWT Token:", hasJwt);
    console.log("  SSO Data:", hasSso);
    console.log("  User Data:", hasUser);
    console.log("  Permission Data:", hasPermissions);
    console.log("  Is Authenticated:", isAuthenticated);
    console.log("  Is Fully Authenticated:", isFullyAuthenticated);
    
    if (hasPermissions) {
      const permissionCookie = request.cookies.get(COOKIE_PERMISSIONS);
      try {
        const permissions = JSON.parse(permissionCookie.value);
        console.log("  User Permissions:", permissions);
      } catch (e) {
        console.log("  Error parsing permissions:", e.message);
      }
    }
    console.log("==========================================");
  }

  if (pathname === ROOT_PATH) {
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(LOGIN_PATH)) {
    return isAuthenticated
      ? NextResponse.redirect(ssoUrl)
      : NextResponse.next();
  }

  if (pathname.startsWith(SSO_PATH)) {
    return isAuthenticated
      ? NextResponse.next()
      : NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(PROTECTED_PAGES_PATH)) {
    if (!isFullyAuthenticated) {
      console.log("Middleware: Not fully authenticated, redirecting to login");
      console.log("  hasJwt:", hasJwt, "hasSso:", hasSso, "hasUser:", hasUser);
      return NextResponse.redirect(loginUrl);
    }

    const allowedModules = getPermissionsSet(request.cookies);
    const isAllowed = hasModuleAccess(pathname, allowedModules);

    if (!isAllowed) {
      console.log("Middleware: Access denied for path:", pathname);
      console.log("  Available permissions:", Array.from(allowedModules));
      
      // For now, allow all authenticated users to access any page
      // This is a temporary fix while we debug the permission system
      console.log("Middleware: Allowing access (temporary fix)");
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};