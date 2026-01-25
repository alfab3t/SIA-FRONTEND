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

  // Ambil permission dari cookie permissionData
  const permissionData = getDecryptedCookie("permissionData");
  
  // Coba berbagai kemungkinan struktur data
  let permissions = [];
  if (permissionData) {
    permissions = permissionData.listPermission || 
                  permissionData.permissions || 
                  permissionData.permission ||
                  permissionData.list ||
                  (Array.isArray(permissionData) ? permissionData : []);
  }
  

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
