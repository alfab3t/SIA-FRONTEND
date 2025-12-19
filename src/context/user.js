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
  if (!data) return null;

  return {
    ...data,

    // 🔑 NORMALISASI USERNAME
    username:
      data.username ||
      data.kry_username ||
      data.user_id ||
      data.nip ||
      data.mhs_id ||
      data.nama ||          // ⬅️ INI KUNCI UNTUK NDA-PRODI
      "",

    displayName:
      data.displayName ||
      data.fullName ||
      data.nama ||
      ""
  };
};


export const getSSOData = () => getDecryptedCookie(COOKIE_SSO_DATA);
