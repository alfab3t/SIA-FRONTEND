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
    console.log("❌ getUserData: No user data found");
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
    console.log("⚠️ Username kosong, mencoba ambil dari ssoData");
    const ssoData = getDecryptedCookie(COOKIE_SSO_DATA);
    if (ssoData && ssoData.username) {
      normalizedUsername = ssoData.username;
      console.log("✅ Username diambil dari ssoData:", normalizedUsername);
    }
  }

  const result = {
    ...data,

    // 🔑 NORMALISASI USERNAME
    username: normalizedUsername,

    displayName:
      data.displayName ||
      data.fullName ||
      data.nama ||
      ""
  };

  console.log("✅ getUserData result:", {
    username: result.username,
    displayName: result.displayName,
    appId: result.appId,
    roleId: result.roleId,
    role: result.role
  });

  return result;
};


export const getSSOData = () => getDecryptedCookie(COOKIE_SSO_DATA);
