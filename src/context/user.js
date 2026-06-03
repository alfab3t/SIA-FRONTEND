import Cookies from "js-cookie";
import { decryptId } from "../lib/encryptor";

const COOKIE_USER_DATA = "userData";
const COOKIE_SSO_DATA = "ssoData";

function getDecryptedCookie(name) {
  const cookieValue = Cookies.get(name);
  if (!cookieValue) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(cookieValue);
    const decrypted = decryptId(decoded);

    if (
      !decrypted ||
      typeof decrypted !== "string" ||
      decrypted.trim() === ""
    ) {
      return null;
    }

    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

export const getUserData = () => {
  const data = getDecryptedCookie(COOKIE_USER_DATA);
  if (!data) {
    return null;
  }

  // Khusus untuk NDA-PRODI, pastikan username tersedia
  let normalizedUsername = data.username ||
    data.kry_username ||
    data.user_id ||
    data.nip ||
    data.mhs_id ||
    data.nama ||
    "";

  // Jika masih kosong, coba ambil dari ssoData
  if (!normalizedUsername) {
    const ssoData = getDecryptedCookie(COOKIE_SSO_DATA);
    if (ssoData?.username) {
      normalizedUsername = ssoData.username;
    }
  }

  // DEBUG: Lihat semua cookie yang ada
  console.log("=== COOKIE DEBUG ===");
  console.log("All cookies:", document.cookie);
  console.log("Raw permissionData cookie:", Cookies.get("permissionData"));
  
  // Ambil permission dari cookie permissionData (TIDAK di-encrypt, langsung JSON)
  let permissionData = null;
  const permissionCookie = Cookies.get("permissionData");
  
  if (permissionCookie) {
    try {
      // Cookie permissionData adalah JSON string biasa, BUKAN encrypted
      permissionData = JSON.parse(permissionCookie);
      console.log("Permission found in cookie (parsed):", permissionData);
    } catch (e) {
      console.error("Error parsing permissionData cookie:", e);
    }
  }
  
  // Jika tidak ada di cookie, coba dari localStorage
  if (!permissionData) {
    try {
      const localStoragePermission = localStorage.getItem("permissionData");
      if (localStoragePermission) {
        permissionData = JSON.parse(localStoragePermission);
        console.log("Permission found in localStorage:", permissionData);
      }
    } catch (e) {
      console.error("Error reading permission from localStorage:", e);
    }
  }
  
  console.log("Decrypted permissionData:", permissionData);
  
  // Coba berbagai kemungkinan struktur data
  let permissions = [];
  if (permissionData) {
    // Jika permissionData sudah array langsung
    if (Array.isArray(permissionData)) {
      permissions = permissionData;
    } else {
      // Jika masih object, coba berbagai property
      permissions = permissionData.listPermission || 
                    permissionData.permissions || 
                    permissionData.permission ||
                    permissionData.list ||
                    [];
    }
  }
  
  console.log("Final permissions array:", permissions);
  console.log("=== END COOKIE DEBUG ===");

  const result = {
    ...data,

    // 🔑 NORMALISASI USERNAME
    username: normalizedUsername,

    displayName:
      data.displayName ||
      data.fullName ||
      data.nama ||
      "",
    
    // 🔑 TAMBAHKAN PERMISSION
    permission: permissions
  };
  

  return result;
};


export const getSSOData = () => getDecryptedCookie(COOKIE_SSO_DATA);
