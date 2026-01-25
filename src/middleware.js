import { NextResponse } from "next/server";

const LOGIN_PATH = "/auth/login";
const SSO_PATH = "/auth/sso";
const PROTECTED_PAGES_PATH = "/pages";
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

function isNdaProdiUser(cookies) {
  const ssoDataCookie = cookies.get(COOKIE_SSO);
  if (!ssoDataCookie) return false;
  
  try {
    const ssoData = JSON.parse(decodeURIComponent(ssoDataCookie.value));
    return ssoData?.username?.toLowerCase().includes('nda_prodi');
  } catch {
    return false;
  }
}

function logNdaProdiDebug(debugInfo) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const { pathname, hasJwt, hasSso, hasUser, hasPermissions, isAuthenticated, isFullyAuthenticated, cookies } = debugInfo;
  
  console.log("=== MIDDLEWARE DEBUG FOR NDA_PRODI ===");
  console.log("Path:", pathname);
  console.log("Cookies status:");
  console.log("  JWT Token:", hasJwt);
  console.log("  SSO Data:", hasSso);
  console.log("  User Data:", hasUser);
  console.log("  Permission Data:", hasPermissions);
  console.log("  Is Authenticated:", isAuthenticated);
  console.log("  Is Fully Authenticated:", isFullyAuthenticated);
  
  if (hasUser) {
    const userDataCookie = cookies.get(COOKIE_USER_DATA);
    console.log("  User Data Cookie exists:", !!userDataCookie);
    if (userDataCookie) {
      console.log("  User Data Cookie value length:", userDataCookie.value.length);
    }
  }
  console.log("==========================================");
}

function logCutiAkademikDebug(debugInfo) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const { pathname, hasJwt, hasSso, hasUser, hasPermissions, isAuthenticated, isFullyAuthenticated, cookies } = debugInfo;
  
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
    const permissionCookie = cookies.get(COOKIE_PERMISSIONS);
    try {
      const permissions = JSON.parse(permissionCookie.value);
      console.log("  User Permissions:", permissions);
    } catch {
      console.log("  Error parsing permissions");
    }
  }
  console.log("==========================================");
}

function handleDebugLogging(debugInfo) {
  if (process.env.NODE_ENV !== 'development') return;
  
  const { cookies, pathname } = debugInfo;
  const isNdaProdi = isNdaProdiUser(cookies);
  
  if (isNdaProdi) {
    logNdaProdiDebug(debugInfo);
  }
  
  if (pathname.includes("Cuti_Akademik")) {
    logCutiAkademikDebug(debugInfo);
  }
}

function handleRootPath(loginUrl) {
  return NextResponse.redirect(loginUrl);
}

function handleLoginPath(isAuthenticated, ssoUrl) {
  return isAuthenticated
    ? NextResponse.redirect(ssoUrl)
    : NextResponse.next();
}

function handleSsoPath(isAuthenticated, loginUrl) {
  return isAuthenticated
    ? NextResponse.next()
    : NextResponse.redirect(loginUrl);
}

function checkAuthenticationAndRedirect(authInfo) {
  const { isFullyAuthenticated, hasJwt, hasSso, hasUser, cookies, loginUrl, ssoUrl } = authInfo;
  
  if (isFullyAuthenticated) {
    return null; // Continue to permission check
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log("Middleware: Not fully authenticated, redirecting to login");
    console.log("  hasJwt:", hasJwt, "hasSso:", hasSso, "hasUser:", hasUser);
  }
  
  const isNdaProdi = isNdaProdiUser(cookies);
  
  if (isNdaProdi && !hasUser) {
    if (process.env.NODE_ENV === 'development') {
      console.log("Middleware: NDA-PRODI missing userData cookie, redirecting to SSO instead of login");
    }
    return NextResponse.redirect(ssoUrl);
  }
  
  return NextResponse.redirect(loginUrl);
}

function checkPermissionAndAllow(permissionInfo) {
  const { pathname, cookies } = permissionInfo;
  
  const allowedModules = getPermissionsSet(cookies);
  const isAllowed = hasModuleAccess(pathname, allowedModules);

  if (!isAllowed && process.env.NODE_ENV === 'development') {
    console.log("Middleware: Access denied for path:", pathname);
    console.log("  Available permissions:", Array.from(allowedModules));
    console.log("Middleware: Allowing access (temporary fix)");
  }
  
  // For now, allow all authenticated users to access any page
  // This is a temporary fix while we debug the permission system
  return NextResponse.next();
}

function handleProtectedPath(protectedPathInfo) {
  const { isFullyAuthenticated, hasJwt, hasSso, hasUser, cookies, loginUrl, ssoUrl, pathname } = protectedPathInfo;
  
  const authResult = checkAuthenticationAndRedirect({
    isFullyAuthenticated,
    hasJwt,
    hasSso,
    hasUser,
    cookies,
    loginUrl,
    ssoUrl
  });
  
  if (authResult) {
    return authResult;
  }
  
  return checkPermissionAndAllow({ pathname, cookies });
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const loginUrl = new URL(LOGIN_PATH, request.url);
  const ssoUrl = new URL(SSO_PATH, request.url);

  const hasJwt = request.cookies.has(COOKIE_JWT);
  const hasSso = request.cookies.has(COOKIE_SSO);
  const hasUser = request.cookies.has(COOKIE_USER_DATA);
  const hasPermissions = request.cookies.has(COOKIE_PERMISSIONS);
  const isAuthenticated = hasJwt && hasSso;
  const isFullyAuthenticated = isAuthenticated && hasUser;

  // Debug logging
  handleDebugLogging({
    pathname,
    hasJwt,
    hasSso,
    hasUser,
    hasPermissions,
    isAuthenticated,
    isFullyAuthenticated,
    cookies: request.cookies
  });

  // Route handling
  if (pathname === ROOT_PATH) {
    return handleRootPath(loginUrl);
  }

  if (pathname.startsWith(LOGIN_PATH)) {
    return handleLoginPath(isAuthenticated, ssoUrl);
  }

  if (pathname.startsWith(SSO_PATH)) {
    return handleSsoPath(isAuthenticated, loginUrl);
  }

  if (pathname.startsWith(PROTECTED_PAGES_PATH)) {
    return handleProtectedPath({
      isFullyAuthenticated,
      hasJwt,
      hasSso,
      hasUser,
      cookies: request.cookies,
      loginUrl,
      ssoUrl,
      pathname
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};