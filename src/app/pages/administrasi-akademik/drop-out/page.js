"use client";

/**
 * ============================================================================
 * HALAMAN DROP OUT - ADMINISTRASI AKADEMIK
 * ============================================================================
 * 
 * KONFIGURASI ROLE SISTEM:
 * Anda bisa mengganti roleId sesuai kebutuhan di bagian ROLE_CONFIG di bawah
 * 
 * ┌─────────────┬──────────┬────────────────────────────────────────────────┐
 * │ ROLE        │ ROLE ID  │ HAK AKSES                                      │
 * ├─────────────┼──────────┼────────────────────────────────────────────────┤
 * │ MAHASISWA   │ ROL23    │ - Lihat data sendiri yang diajukan Prodi/Admin│
 * │             │          │ - TIDAK BISA tambah/edit data                  │
 * ├─────────────┼──────────┼────────────────────────────────────────────────┤
 * │ PRODI       │ ROL71    │ - Buat pengajuan untuk mahasiswa               │
 * │             │          │ - Lihat pengajuan yang dibuat sendiri          │
 * │             │          │ - Edit/hapus draft sendiri                     │
 * ├─────────────┼──────────┼────────────────────────────────────────────────┤
 * │ WADIR 1     │ ROL999   │ - Lihat pengajuan "Belum Disetujui Wadir 1"   │
 * │             │          │   (dari siapa saja)                            │
 * │             │          │ - Approve/Reject untuk ubah status             │
 * │             │          │ - Lihat SEMUA riwayat                          │
 * ├─────────────┼──────────┼────────────────────────────────────────────────┤
 * │ ADMIN       │ ROL21    │ - Buat pengajuan untuk mahasiswa               │
 * │             │ ROL74    │ - Lihat pengajuan yang dibuat sendiri          │
 * │             │          │ - Upload SK untuk "Menunggu Upload SK"         │
 * │             │          │ - Cetak SK                                     │
 * │             │          │ - Export data                                  │
 * ├─────────────┼──────────┼────────────────────────────────────────────────┤
 * │ FINANCE     │ ROL01    │ - Lihat riwayat saja (yang sudah disetujui)    │
 * │             │          │ - Download berkas                              │
 * └─────────────┴──────────┴────────────────────────────────────────────────┘
 * 
 * CARA MENGGANTI ROLE ID:
 * Edit bagian ROLE_CONFIG di bawah, ubah nilai roleId sesuai kebutuhan
 */

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Paging from "@/components/common/Paging";
import Table from "@/components/common/Table";
import Toast from "@/components/common/Toast";
import DropDown from "@/components/common/Dropdown";
import MainContent from "@/components/layout/MainContent";
import Formsearch from "@/components/common/Formsearch";
import { useRouter } from "next/navigation";
import fetchData from "@/lib/fetch";
import { API_LINK } from "@/lib/constant";
import { getSSOData, getUserData } from "@/context/user";
import SweetAlert from "@/components/common/SweetAlert";
import * as XLSX from "xlsx";
import { hasPermission } from "@/lib/permission-utils";

// ============================================================================
// KONFIGURASI ROLE - EDIT DI SINI UNTUK MENGGANTI ROLE ID
// ============================================================================
const ROLE_CONFIG = {
  MAHASISWA: "ROL23",
  PRODI: "ROL71",
  WADIR1: "ROL999",
  ADMIN: "ROL21",
  ADMIN_ALT: "ROL74",  // Role admin alternatif
  DIREKTUR: "ROL02",
  FINANCE: "ROL01"
};

export default function Page_Administrasi_Pengajuan_Drop_Out() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [dataDraft, setDataDraft] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  
  // Modal Reject
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // Modal Upload SK
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [fileSK, setFileSK] = useState(null);
  const [fileSuratKeterangan, setFileSuratKeterangan] = useState(null);
  const [uploading, setUploading] = useState(false);

  const sortRef = useRef();
  const statusRef = useRef();

  /* ================= FILTER ================= */

  const dataFilterSort = [
    { Value: "a.dro_created_date desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "a.dro_created_date asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "a.dro_id asc", Text: "No Pengajuan DO [↑]" },
    { Value: "mhs_nama asc", Text: "Nama Mahasiswa [↑]" }
  ];

  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" },
    { Value: "Draft", Text: "Draft" },
    { Value: "Belum Disetujui Wadir 1", Text: "Menunggu Wadir 1" },
    { Value: "Belum Disetujui Direktur", Text: "Menunggu Direktur" },
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Ditolak", Text: "Ditolak" }
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageRiwayat, setCurrentPageRiwayat] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default 10 rows per table
  
  const pageSizeOptions = [
    { Value: 10, Text: "10 per halaman" },
    { Value: 25, Text: "25 per halaman" },
    { Value: 50, Text: "50 per halaman" },
    { Value: 100, Text: "100 per halaman" },
    { Value: 999999, Text: "Tampilkan Semua" }
  ];
  
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState("");

  // ============================================================================
  // DETEKSI ROLE USER - Menggunakan ROLE_CONFIG di atas
  // ============================================================================
  const roleId = userData?.roleId || "";
  const isMahasiswa = roleId === ROLE_CONFIG.MAHASISWA;
  const isProdi = roleId === ROLE_CONFIG.PRODI;
  const isWadir1 = roleId === ROLE_CONFIG.WADIR1;
  const isFinance = roleId === ROLE_CONFIG.FINANCE;
  const isAdmin = roleId === ROLE_CONFIG.ADMIN || roleId === ROLE_CONFIG.ADMIN_ALT;
  const isDirektur = roleId === ROLE_CONFIG.DIREKTUR;

  // ============================================================================
  // HAK AKSES BERDASARKAN ROLE
  // ============================================================================
  
  // Permission checks untuk fitur-fitur
  const hasViewPermission = useMemo(() => {
    return hasPermission(userData, "drop_out.view");
  }, [userData]);

  const hasCreatePermission = useMemo(() => {
    return hasPermission(userData, "drop_out.create");
  }, [userData]);

  const hasEditPermission = useMemo(() => {
    return hasPermission(userData, "drop_out.edit");
  }, [userData]);

  const hasDeletePermission = useMemo(() => {
    return hasPermission(userData, "drop_out.delete");
  }, [userData]);

  const hasApproveRejectPermission = useMemo(() => {
    return hasPermission(userData, "drop_out.approve_reject");
  }, [userData]);

  const hasExportPermission = useMemo(() => {
    return hasPermission(userData, "drop_out.export");
  }, [userData]);

  // Hak akses berdasarkan ROLE (untuk tampilan berbeda per user)
  // Permission digunakan sebagai validasi tambahan
  const canCreate = useMemo(() => {
    if (!isClient) return false;
    // Hanya Prodi dan Admin yang bisa tambah (berdasarkan ROLE)
    // Permission sebagai validasi tambahan
    return (isProdi || isAdmin) && (hasCreatePermission || !userData?.permission || userData.permission.length === 0);
  }, [isClient, isProdi, isAdmin, hasCreatePermission, userData]);

  const canApprove = useMemo(() => {
    if (!isClient) return false;
    // Wadir bisa approve (berdasarkan ROLE)
    // Permission sebagai validasi tambahan
    return isWadir1 && (hasApproveRejectPermission || !userData?.permission || userData.permission.length === 0);
  }, [isClient, isWadir1, hasApproveRejectPermission, userData]);

  const canSeeDraft = useMemo(() => {
    if (!isClient) return false;
    // Prodi dan Admin bisa lihat draft (berdasarkan ROLE)
    return isProdi || isAdmin;
  }, [isClient, isProdi, isAdmin]);

  const canExport = useMemo(() => {
    if (!isClient) return false;
    // Admin dan Prodi bisa export (berdasarkan ROLE)
    // Permission sebagai validasi tambahan
    return (isAdmin || isProdi) && (hasExportPermission || !userData?.permission || userData.permission.length === 0);
  }, [isClient, isAdmin, isProdi, hasExportPermission, userData]);

  // Helper functions untuk extract dan parse response
  const extractArrayFromResponse = (response) => {
    if (Array.isArray(response)) return response;
    
    if (response && typeof response === 'object') {
      const data = response.data || response.result || response.items || response.list || [];
      if (data.length > 0) return data;
      
      const arrayValue = Object.values(response).find(val => Array.isArray(val));
      return arrayValue || [];
    }
    
    return [];
  };

  // Helper function untuk clean nama mahasiswa
  const cleanMahasiswaName = (namaMahasiswa) => {
    if (namaMahasiswa === "-") return namaMahasiswa;
    
    if (namaMahasiswa.includes(" - ")) {
      return namaMahasiswa.split(" - ").slice(1).join(" - ").trim();
    }
    
    if (namaMahasiswa.includes("-")) {
      const parts = namaMahasiswa.split("-");
      if (parts[0] && /^\d+$/.test(parts[0].trim())) {
        return parts.slice(1).join("-").trim();
      }
    }
    
    return namaMahasiswa;
  };

  // Helper function untuk check approval status
  const checkApprovalStatus = (statusLower) => {
    if (!canApprove) return false;
    
    const isFinanceApproval = (statusLower.includes("belum disetujui finance") || statusLower.includes("menunggu persetujuan finance")) && isFinance;
    const isWadirApproval = (statusLower.includes("belum disetujui wadir") || statusLower.includes("menunggu persetujuan wadir") || statusLower === "belum disetujui wadir 1") && isWadir1;
    const isDirekturApproval = (statusLower.includes("belum disetujui direktur") || statusLower.includes("menunggu persetujuan direktur")) && isDirektur;
    
    return isFinanceApproval || isWadirApproval || isDirekturApproval;
  };

  // Helper function untuk determine actions
  const getActionsForDropOut = (statusLower, itemId) => {
    
    if (statusLower === "draft") {
      if (isMahasiswa) return ["Detail"];
      
      const actions = ["Detail", "Edit", "Delete"];
      actions.push({
        IconName: "send-check",
        Title: "Ajukan",
        Function: () => handleAjukan(itemId)
      });
      return actions;
    }
    
    if (isMahasiswa) {
      return statusLower === "disetujui" ? ["Detail", "Unduh Berkas"] : ["Detail"];
    }
    
    if (statusLower === "disetujui") {
      return ["Detail", "Unduh Berkas"];
    }
    
    // Check untuk Wadir dengan status "belum disetujui wadir 1"
    if (isWadir1 && statusLower === "belum disetujui wadir 1") {
      return ["Detail", "Approve", "Reject"];
    }
    
    const approvalCheck = checkApprovalStatus(statusLower);
    
    if (approvalCheck) {
      return ["Detail", "Approve", "Reject"];
    }
    
    return ["Detail"];
  };

  const loadData = useCallback(
    async (page = 1, sort = sortBy, keyword = "") => {
      try {
        setLoading(true);

        const username = ssoData?.username || userData?.username || "";
        const nim = userData?.nim || userData?.username || "";

        if (!username) {
          setDataDraft([]);
          setDataRiwayat([]);
          return;
        }

        let pengajuanList = [];
        let riwayatList = [];

        // Untuk Wadir, fetch pengajuan dan riwayat secara terpisah dengan parameter khusus
        if (isWadir1) {
          const [pengajuanResponse, riwayatResponse] = await Promise.all([
            fetchData(API_LINK + "DropOut", { 
              keyword: keyword || "",
              sortBy: sort || "a.dro_created_date desc",
              status: "Belum Disetujui Wadir 1"
            }, "GET").catch(() => []),
            fetchData(API_LINK + "DropOut/riwayat", {
              username: username,
              keyword: keyword || "",
              sortBy: sort || "a.dro_created_date desc",
              konsentrasi: "",
              roleId: userData?.roleId || "",
              displayName: userData?.displayName || userData?.fullName || "",
              page: 1,
              pageSize: 9999
            }, "GET").catch(() => [])
          ]);
          
          pengajuanList = extractArrayFromResponse(pengajuanResponse);
          riwayatList = extractArrayFromResponse(riwayatResponse);
          
        } else {
          // Fetch data pengajuan dan riwayat secara PARALLEL untuk role lain
          let pengajuanParams = {
            keyword: keyword || "",
            sortBy: sort || "a.dro_created_date desc",
            konsentrasi: ""
          };

          let riwayatParams = {
            username: username,
            keyword: keyword || "",
            sortBy: sort || "a.dro_created_date desc",
            konsentrasi: "",
            roleId: userData?.roleId || "",
            displayName: userData?.displayName || userData?.fullName || "",
            page: 1,
            pageSize: 9999
          };

          // Untuk admin, tidak perlu filter berdasarkan username
          if (isMahasiswa) {
            pengajuanParams.mhsId = nim;
            riwayatParams.mhsId = nim;
          } else if (!isAdmin) {
            // Non-admin (selain mahasiswa) tetap menggunakan username filter
            riwayatParams.username = username;
          }

          const [pengajuanResponse, riwayatResponse] = await Promise.all([
            fetchData(API_LINK + "DropOut", pengajuanParams, "GET").catch(() => []),
            fetchData(API_LINK + "DropOut/riwayat", riwayatParams, "GET").catch(() => [])
          ]);

          pengajuanList = extractArrayFromResponse(pengajuanResponse);
          riwayatList = extractArrayFromResponse(riwayatResponse);
        }
        // Mapping functions
        const mapItemDefault = (item, index) => {
          const status = item.status || "";
          const statusLower = status.toLowerCase();
          const itemId = item.id || item.droId;
          const actions = getActionsForDropOut(statusLower, itemId);
          const namaMahasiswa = cleanMahasiswaName(item.namaMahasiswa || "-");

          return {
            No: index + 1,
            id: itemId || "",
            "No. Pengajuan DO": item.droId || "-",
            "Tanggal Pengajuan": item.tanggalPengajuan || "-",
            "Dibuat Oleh": item.createdBy || item.dibuatOleh || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: item.prodi || "-",
            "No. SK DO": item.noSkDo || "-",
            Status: status || "Draft",
            Aksi: actions,
            Alignment: ["center", "center", "center", "left", "left", "left", "center", "center", "center"]
          };
        };

        const mapItemAdminPengajuan = (item, index) => {
          const status = (item.status || "").trim();
          const statusLower = status.toLowerCase();
          const itemId = item.id || item.droId;
          const namaMahasiswa = cleanMahasiswaName(item.namaMahasiswa || "-");
          
          let actions = ["Detail"];
          let cetakSKAction = null;
          
          if (statusLower === "draft") {
            actions = [
              "Detail", 
              "Edit", 
              "Delete", 
              {
                IconName: "send-check",
                Title: "Ajukan",
                Function: () => handleAjukan(itemId)
              }
            ];
          } else if (statusLower.includes("menunggu upload sk")) {
            // Untuk Menunggu Upload SK: Detail dan Upload icon
            actions = [
              "Detail",
              {
                IconName: "cloud-upload",
                Title: "Unggah Berkas",
                Function: () => handleUploadSK(itemId)
              }
            ];
            // Cetak SK sebagai action object untuk kolom terpisah
            cetakSKAction = {
              IconName: "printer",
              Title: "Cetak SK",
              Function: () => handleCetakSK(itemId)
            };
          } else if (statusLower.includes("belum disetujui") || statusLower.includes("menunggu")) {
            actions = ["Detail"];
          }

          return {
            No: index + 1,
            id: itemId || "",
            "No. Pengajuan DO": item.droId || "-",
            "Tanggal Pengajuan": item.tanggalPengajuan || "-",
            "Dibuat Oleh": item.createdBy || item.dibuatOleh || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: item.prodi || "-",
            "No. SK DO": item.noSkDo || "-",
            Status: status || "Draft",
            "Cetak SK": cetakSKAction ? [cetakSKAction] : [],
            Aksi: actions,
            Alignment: ["center", "center", "center", "left", "left", "left", "center", "center", "center", "center"]
          };
        };

        const mapItemAdminRiwayat = (item, index) => {
          const status = item.status || "";
          const actions = ["Detail", "Unduh Berkas"];
          const namaMahasiswa = cleanMahasiswaName(item.namaMahasiswa || "-");

          return {
            No: index + 1,
            id: item.id || item.droId || "",
            "No. Pengajuan DO": item.droId || "-",
            "Tanggal Pengajuan": item.tanggalPengajuan || "-",
            "Dibuat Oleh": item.createdBy || item.dibuatOleh || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: item.prodi || "-",
            "No. SK DO": item.noSkDo || "-",
            Status: status || "Draft",
            Aksi: actions,
            Alignment: ["center", "center", "center", "left", "left", "left", "center", "center", "center"]
          };
        };

        // Process data based on role
        const draftData = [];
        const riwayatData = [];
        const currentUsername = (ssoData?.username || userData?.username || "").toLowerCase().trim();

        if (isAdmin) {
          processDataForAdmin(pengajuanList, riwayatList, currentUsername, draftData, riwayatData, mapItemAdminPengajuan, mapItemAdminRiwayat);
        } else if (isProdi) {
          processDataForProdi(pengajuanList, riwayatList, currentUsername, draftData, riwayatData, mapItemDefault);
        } else if (isMahasiswa) {
          processDataForMahasiswa(pengajuanList, riwayatList, draftData, riwayatData, mapItemDefault);
        } else if (isWadir1) {
          processDataForWadir(pengajuanList, riwayatList, draftData, riwayatData, mapItemDefault, mapItemAdminRiwayat);
        } else {
          processDataForOthers(pengajuanList, riwayatList, draftData, riwayatData, mapItemDefault);
        }

        // Sort untuk Admin
        if (isAdmin) {
          draftData.sort((a, b) => {
            const statusA = (a.Status || "").toUpperCase();
            const statusB = (b.Status || "").toUpperCase();
            if (statusA.includes("MENUNGGU UPLOAD SK") && !statusB.includes("MENUNGGU UPLOAD SK")) return -1;
            if (!statusA.includes("MENUNGGU UPLOAD SK") && statusB.includes("MENUNGGU UPLOAD SK")) return 1;
            return 0;
          });
          draftData.forEach((item, idx) => { item.No = idx + 1; });
        }

        setDataDraft(draftData);
        setDataRiwayat(riwayatData);
        setCurrentPage(page);
      } catch (err) {
        console.error("Error loading data:", err);
        setDataDraft([]);
        setDataRiwayat([]);
      } finally {
        setLoading(false);
      }
    },
    [sortBy, userData, ssoData, canCreate, canApprove, isAdmin, isWadir1]
  );

  // Helper functions untuk process data by role
  const processDataForAdmin = (pengajuanList, riwayatList, currentUsername, draftData, riwayatData, mapPengajuan, mapRiwayat) => {
    // Admin melihat:
    // 1. Semua pengajuan yang dibuat oleh admin sendiri (createdBy = currentUsername)
    // 2. Semua pengajuan dengan status "Menunggu Upload SK" (dari siapa saja)
    pengajuanList.forEach((item) => {
      const status = (item.status || "").toLowerCase().trim();
      // Coba berbagai kemungkinan field name untuk createdBy
      const createdBy = (
        item.createdBy || 
        item.dibuatOleh || 
        item.created_by || 
        item.dibuat_oleh ||
        item.CreatedBy ||
        item.DibuatOleh ||
        ""
      ).toLowerCase().trim();
      
      // Skip jika sudah selesai (ada di riwayat)
      if (status === "disetujui" || status.includes("ditolak")) return;
      
      // Tampilkan jika:
      // 1. Status = "Menunggu Upload SK" (dari siapa saja)
      // 2. ATAU dibuat oleh admin sendiri (semua status lainnya)
      if (status === "menunggu upload sk" || createdBy === currentUsername) {
        draftData.push(mapPengajuan(item, draftData.length));
      }
    });
    
    // Riwayat: tampilkan semua yang sudah disetujui atau ditolak
    riwayatList.forEach((item) => {
      const status = (item.status || "").toLowerCase().trim();
      
      if (status === "disetujui" || status.includes("ditolak")) {
        riwayatData.push(mapRiwayat(item, riwayatData.length));
      }
    });
  };

  const processDataForProdi = (pengajuanList, riwayatList, currentUsername, draftData, riwayatData, mapItem) => {
    pengajuanList.forEach((item) => {
      const status = (item.status || "").toLowerCase().trim();
      const itemCreatedBy = (item.createdBy || item.dibuatOleh || "").toLowerCase().trim();
      
      if (status === "disetujui" || status.includes("ditolak")) return;
      
      if (itemCreatedBy === currentUsername) {
        const mapped = mapItem(item, 0);
        draftData.push({ ...mapped, No: draftData.length + 1 });
      }
    });
    
    riwayatList.forEach((item) => {
      const status = (item.status || "").toLowerCase().trim();
      if (status === "disetujui") {
        const mapped = mapItem(item, 0);
        riwayatData.push({ ...mapped, No: riwayatData.length + 1 });
      }
    });
  };

  const processDataForMahasiswa = (pengajuanList, riwayatList, draftData, riwayatData, mapItem) => {
    const seenIds = new Set();
    const allItems = [...pengajuanList, ...riwayatList];
    
    // Mahasiswa hanya melihat daftar pengajuan (semua status)
    allItems.forEach((item) => {
      const itemId = item.id || item.droId || item.dro_id || "";
      
      if (seenIds.has(itemId)) return;
      
      if (itemId) seenIds.add(itemId);
      
      const mapped = mapItem(item, 0);
      draftData.push({ ...mapped, No: draftData.length + 1 });
    });
    
    // Mahasiswa tidak melihat riwayat (riwayatData tetap kosong)
  };

  const processDataForOthers = (pengajuanList, riwayatList, draftData, riwayatData, mapItem) => {
    const seenDraftIds = new Set();
    const seenRiwayatIds = new Set();
    
    pengajuanList.forEach((item) => {
      const status = (item.status || "").toLowerCase().trim();
      const itemId = item.id || item.droId || item.dro_id || "";
      
      if (status === "disetujui" || status.includes("ditolak") || seenDraftIds.has(itemId)) return;
      
      if (itemId) seenDraftIds.add(itemId);
      
      const mapped = mapItem(item, 0);
      draftData.push({ ...mapped, No: draftData.length + 1 });
    });
    
    riwayatList.forEach((item) => {
      const status = (item.status || "").toLowerCase().trim();
      const itemId = item.id || item.droId || item.dro_id || "";
      
      if ((status === "disetujui" || status.includes("ditolak")) && !seenRiwayatIds.has(itemId)) {
        if (itemId) seenRiwayatIds.add(itemId);
        
        const mapped = mapItem(item, 0);
        riwayatData.push({ ...mapped, No: riwayatData.length + 1 });
      }
    });
  };

  const processDataForWadir = (pengajuanList, riwayatList, draftData, riwayatData, mapItem, mapItemRiwayat) => {
    
    // Data pengajuan - hanya yang Belum Disetujui Wadir 1 (dari siapa saja)
    pengajuanList.forEach((item) => {
      const status = (item.status || "").toLowerCase().trim();
      if (status === "belum disetujui wadir 1") {
        const mapped = mapItem(item, 0);
        draftData.push({ ...mapped, No: draftData.length + 1 });
      }
    });
    
    // Data riwayat - SEMUA data (tampilkan semua riwayat)
    riwayatList.forEach((item) => {
      const mapped = mapItemRiwayat(item, 0);
      riwayatData.push({ ...mapped, No: riwayatData.length + 1 });
    });
    
  };

  /* ================= HANDLER ================= */

  const handleSearch = (q) => {
    setSearch(q);
    // Search hanya di tabel riwayat, tidak reload semua data
    if (!q || q.trim() === "") {
      // Jika search kosong, reload semua data
      loadData(1, sortBy, "");
    }
    // Filter akan diterapkan saat render tabel riwayat
  };

  const handleFilterApply = () => {
    const s = sortRef.current.value;
    const st = statusRef.current.value;

    setSortBy(s);
    setSortStatus(st);
    loadData(1, s, search);
  };

  const handleDetail = (id) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/administrasi-akademik/drop-out/detail/${encodedId}`);
  };

  const handleEdit = (id) => {
    const encodedId = encodeURIComponent(id);
    router.push(`/pages/administrasi-akademik/drop-out/edit/${encodedId}`);
  };

  const handleApprove = async (id) => {
    const confirm = await SweetAlert({
      title: "Setujui Pengajuan",
      text: "Apakah Anda yakin ingin menyetujui pengajuan ini?",
      icon: "info",
      confirmText: "Ya, Setujui!",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    try {
      const username = userData?.username || ssoData?.username || "";
      
      let endpoint = "";
      let requestBody = {};
      
      if (isWadir1) {
        // Endpoint khusus untuk Wadir
        endpoint = `DropOut/wadir/approve?id=${encodeURIComponent(id)}`;
        requestBody = { username: username };
      } else {
        // Endpoint umum untuk role lain
        endpoint = `DropOut/approve/${id}`;
      }
      
      const response = await fetchData(
        API_LINK + endpoint,
        requestBody,
        "PUT"
      );

      if (response) {
        Toast.success("Pengajuan berhasil disetujui");
        loadData(); // Reload data
      }
    } catch (err) {
      Toast.error("Gagal menyetujui pengajuan: " + err.message);
    }
  };

  const handleReject = async (id) => {
    setRejectId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason || rejectReason.trim() === "") {
      Toast.error("Alasan penolakan wajib diisi!");
      return;
    }

    try {
      const username = userData?.username || ssoData?.username || "";
      
      let apiRole = "";
      if (isProdi) {
        apiRole = "Prodi";
      } else if (isWadir1) {
        apiRole = "Wadir1";
      }

      if (!apiRole) {
        Toast.error("Role tidak terdeteksi. Anda tidak memiliki akses untuk menolak pengajuan ini.");
        return;
      }

      if (!username) {
        Toast.error("Username tidak ditemukan. Silakan login ulang.");
        return;
      }

      const requestBody = {
        role: apiRole,
        reason: rejectReason.trim()
      };

      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      const res = await fetch(`${API_LINK}DropOut/reject?id=${encodeURIComponent(rejectId)}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: JSON.stringify(requestBody),
      });

      const text = await res.text();
      let result = null;
      if (text) {
        try { 
          result = JSON.parse(text); 
        } catch (e) {
          console.error("Error parsing JSON response:", e);
        }
      }

      if (res.ok) {
        Toast.success("Pengajuan berhasil ditolak");
        setShowRejectModal(false);
        setRejectReason("");
        setRejectId(null);
        loadData();
      } else {
        Toast.error(result?.message || "Gagal menolak pengajuan");
      }
    } catch (err) {
      console.error("Error rejecting pengajuan:", err);
      Toast.error("Gagal menolak pengajuan: " + (err?.message || "Unknown error"));
    }
  };

  const handleRejectCancel = () => {
    setShowRejectModal(false);
    setRejectReason("");
    setRejectId(null);
  };

  const handleAjukan = async (id) => {
    const confirm = await SweetAlert({
      title: "Ajukan Pengajuan",
      text: "Setelah diajukan, data tidak dapat diedit kembali. Ajukan sekarang?",
      icon: "warning",
      confirmText: "Ya, Ajukan!",
      confirmButtonColor: "#1e88e5",
    });

    if (!confirm) return;

    try {
      const username = userData?.username || ssoData?.username || "";
      
      const response = await fetchData(
        API_LINK + `DropOut/draft/${id}/generate-id`,
        { createdBy: username },
        "PUT"
      );

      if (response) {
        Toast.success("Draft berhasil diajukan dengan ID: " + response.id);
        loadData(); // Reload data
      }
    } catch (err) {
      Toast.error("Gagal mengajukan draft: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    const confirm = await SweetAlert({
      title: "Hapus Pengajuan",
      text: "Yakin ingin menghapus pengajuan ini?",
      icon: "warning",
      confirmText: "Ya, Hapus!",
      confirmButtonColor: "#d33",
    });

    if (!confirm) return;

    try {
      // Endpoint sesuai Swagger: DELETE /api/DropOut/{id}
      const response = await fetchData(
        API_LINK + `DropOut/${encodeURIComponent(id)}`,
        {},
        "DELETE"
      );

      if (response) {
        Toast.success("Draft pengajuan berhasil dihapus");
        loadData(); // Reload data
      }
    } catch (err) {
      Toast.error("Gagal menghapus draft: " + err.message);
    }
  };

  const handleUploadSK = (id) => {
    setUploadId(id);
    setFileSK(null);
    setFileSuratKeterangan(null);
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadId(null);
    setFileSK(null);
    setFileSuratKeterangan(null);
  };

  const handleSubmitUpload = async () => {
    if (!fileSK) {
      Toast.error("File SK Drop Out wajib diunggah");
      return;
    }
    if (!fileSuratKeterangan) {
      Toast.error("File Surat Keterangan Pernah Berkuliah wajib diunggah");
      return;
    }

    try {
      setUploading(true);

      // Create FormData for multipart/form-data
      const formData = new FormData();
      formData.append("DroId", uploadId);
      formData.append("SkFile", fileSK);
      formData.append("SkpbFile", fileSuratKeterangan);

      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      const res = await fetch(`${API_LINK}DropOut/upload-sk-file`, {
        method: "POST",
        headers: {
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: formData,
      });

      const text = await res.text();
      let result = null;
      if (text) {
        try { 
          result = JSON.parse(text); 
        } catch (e) {
          console.error("Error parsing JSON response:", e);
        }
      }

      if (!res.ok) {
        Toast.error(result?.message || result?.errorMessage || `Gagal mengupload berkas (${res.status})`);
        return;
      }

      Toast.success("SK berhasil diunggah");
      handleCloseUploadModal();
      loadData();
    } catch (err) {
      Toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUnduhBerkas = async (id) => {
    try {
      // Gunakan endpoint download-sk untuk download file SK
      window.open(`${API_LINK}DropOut/download-sk/${encodeURIComponent(id)}`, '_blank');
    } catch (err) {
      Toast.error("Gagal mengunduh berkas: " + err.message);
    }
  };

  const handleCetakSK = (id) => {
    // Buka URL template SK di tab baru
    window.open(`${API_LINK}DropOut/template-sk`, '_blank');
  };
  const createHeaderStyle = () => ({
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  });

  const createDataCellStyle = (isFirstColumn, isEvenRow) => {
    const style = {
      alignment: { 
        horizontal: isFirstColumn ? "center" : "left",
        vertical: "center" 
      },
      border: {
        top: { style: "thin", color: { rgb: "D3D3D3" } },
        bottom: { style: "thin", color: { rgb: "D3D3D3" } },
        left: { style: "thin", color: { rgb: "D3D3D3" } },
        right: { style: "thin", color: { rgb: "D3D3D3" } }
      }
    };
    
    if (isEvenRow) {
      style.fill = { fgColor: { rgb: "F2F2F2" } };
    }
    
    return style;
  };

  const styleExcelWorksheet = (worksheet, range) => {
    // Style header row
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (worksheet[address]) {
        worksheet[address].s = createHeaderStyle();
      }
    }
    
    // Style data rows
    for (let R = range.s.r + 1; R <= range.e.r; ++R) {
      const isEvenRow = R % 2 === 0;
      
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + (R + 1);
        if (worksheet[address]) {
          worksheet[address].s = createDataCellStyle(C === 0, isEvenRow);
        }
      }
    }
  };

  const handleExportExcel = () => {
    try {
      const allData = [...dataDraft, ...dataRiwayat];
      
      if (allData.length === 0) {
        Toast.error("Tidak ada data untuk di-export");
        return;
      }
      
      // Prepare data for Excel
      const excelData = allData.map((item, index) => ({
        "No": index + 1,
        "No. Pengajuan DO": item["No. Pengajuan DO"] || "-",
        "Tanggal Pengajuan": item["Tanggal Pengajuan"] || "-",
        "Nama Mahasiswa": item["Nama Mahasiswa"] || "-",
        "Prodi": item["Prodi"] || "-",
        "Status": item["Status"] || "-",
        "No. SK DO": item["No. SK DO"] || "-"
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      worksheet["!cols"] = [
        { wch: 6 },   // No
        { wch: 22 },  // No. Pengajuan DO
        { wch: 18 },  // Tanggal Pengajuan
        { wch: 35 },  // Nama Mahasiswa
        { wch: 30 },  // Prodi
        { wch: 25 },  // Status
        { wch: 22 }   // No. SK DO
      ];
      
      // Apply styling
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      styleExcelWorksheet(worksheet, range);
      
      // Add auto filter
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
      
      // Freeze first row
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Drop Out");
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replaceAll(':', '-');
      const filename = `Data_Drop_Out_${dateStr}_${timeStr}.xlsx`;
      
      // Write file
      XLSX.writeFile(workbook, filename, { cellStyles: true });
      Toast.success("File Excel berhasil diunduh!");
    } catch (err) {
      console.error("Error exporting Excel:", err);
      Toast.error("Gagal membuat file Excel: " + (err?.message || "Unknown error"));
    }
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
    setCurrentPageRiwayat(1);
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    setCurrentPageRiwayat(1);
    loadData(1, sortBy, search);
    Toast.info("Data sedang dimuat ulang...");
  };

  /* ================= INIT ================= */

  useEffect(() => {
    setIsClient(true);
    
    if (!ssoData) {
      Toast.error("Sesi anda habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }
    
    if (!userData) {
      Toast.error("Data pengguna tidak ditemukan. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }
    
    loadData(1, sortBy, "");
  }, []);

  // Re-load data when isAdmin changes
  useEffect(() => {
    if (isClient && isAdmin !== undefined) {
      loadData(1, sortBy, "");
    }
  }, [isAdmin]);

  /* ================= FILTER UI ================= */

  // Filter dataRiwayat berdasarkan search keyword
  const filteredDataRiwayat = useMemo(() => {
    if (!search || search.trim() === "") {
      return dataRiwayat;
    }
    
    const lowerKeyword = search.toLowerCase();
    return dataRiwayat.filter(item => {
      const noPengajuan = (item["No. Pengajuan DO"] || "").toLowerCase();
      const namaMhs = (item["Nama Mahasiswa"] || "").toLowerCase();
      const prodi = (item["Prodi"] || "").toLowerCase();
      const status = (item["Status"] || "").toLowerCase();
      
      return noPengajuan.includes(lowerKeyword) || 
             namaMhs.includes(lowerKeyword) || 
             prodi.includes(lowerKeyword) ||
             status.includes(lowerKeyword);
    });
  }, [dataRiwayat, search]);

  const filterContent = (
    <>
      <DropDown
        ref={sortRef}
        arrData={dataFilterSort}
        label="Urutkan"
        defaultValue={sortBy}
      />
      <DropDown
        ref={statusRef}
        arrData={dataFilterStatus}
        label="Status"
        defaultValue={sortStatus}
      />
      <DropDown
        arrData={pageSizeOptions}
        label="Tampilkan"
        value={pageSize}
        onChange={(e) => handlePageSizeChange(Number.parseInt(e.target.value, 10))}
      />
    </>
  );

  /* ================= RENDER ================= */

  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Pengajuan Drop Out"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Drop Out" }
      ]}
    >
      {/* Check view permission */}
      {!hasViewPermission && userData?.permission && userData.permission.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Anda tidak memiliki akses untuk melihat halaman ini. Silakan hubungi administrator untuk mendapatkan permission <strong>drop_out.view</strong>.
        </div>
      )}

      {/* Show content only if has view permission or permission is empty (fallback to role) */}
      {(hasViewPermission || !userData?.permission || userData.permission.length === 0) && (
        <>
      {/* Tabel untuk Mahasiswa - Hanya menampilkan Daftar Pengajuan */}
      {isMahasiswa && (
        <div className="mb-4">
          <Formsearch
            onSearch={handleSearch}
            onRefresh={handleRefresh}
            showAddButton={false}
            showRefreshButton={true}
            showFilterButton={false}
            showExportButton={false}
            searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
          />
          
          <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
            <h5 className="mb-0">Daftar Pengajuan</h5>
          </div>
          
          <Table
            data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAjukan={handleAjukan}
          />
          
          {dataDraft.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPage}
              totalData={dataDraft.length}
              navigation={(p) => setCurrentPage(p)}
            />
          )}
        </div>
      )}

      {/* Tabel untuk Admin - Menampilkan Daftar Pengajuan dan Riwayat */}
      {isAdmin && !isMahasiswa && (
        <>
          <div className="mb-4">
            {/* Tombol Tambah untuk Admin - tampilkan jika punya create atau approve_reject */}
            {(hasCreatePermission || hasApproveRejectPermission) && (
              <div className="mb-3">
                <button 
                  className="btn btn-primary px-4"
                  onClick={() => router.push("/pages/administrasi-akademik/drop-out/add")}
                >
                  <i className="bi bi-plus-lg me-1"></i>Tambah
                </button>
              </div>
            )}
            
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Daftar Pengajuan</h5>
            </div>
            
            <Table
              data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
              onDetail={handleDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
              onAjukan={handleAjukan}
              onUnggahBerkas={handleUploadSK}
              onUnduhBerkas={handleUnduhBerkas}
            />
            
            {dataDraft.length > pageSize && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPage}
                totalData={dataDraft.length}
                navigation={(p) => setCurrentPage(p)}
              />
            )}
          </div>

          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Riwayat Pengajuan</h5>
            </div>
            
            <Formsearch
              onSearch={handleSearch}
              onFilter={handleFilterApply}
              onRefresh={handleRefresh}
              onExport={canExport ? handleExportExcel : undefined}
              showAddButton={false}
              showRefreshButton={true}
              showExportButton={canExport}
              searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
              filterContent={filterContent}
            />
            
            <Table
              data={filteredDataRiwayat.slice((currentPageRiwayat - 1) * pageSize, currentPageRiwayat * pageSize)}
              onDetail={handleDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
              onAjukan={handleAjukan}
              onUnggahBerkas={handleUploadSK}
              onUnduhBerkas={handleUnduhBerkas}
            />
            
            {filteredDataRiwayat.length > pageSize && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPageRiwayat}
                totalData={filteredDataRiwayat.length}
                navigation={(p) => setCurrentPageRiwayat(p)}
              />
            )}
          </div>
        </>
      )}

      {/* Tabel Draft Pengajuan - Untuk Prodi dan role lain (bukan Admin, bukan Mahasiswa) */}
      {canSeeDraft && !isMahasiswa && !isAdmin && (
        <div className="mb-4">
          <div className="mb-3">
            <button 
              className="btn btn-primary px-4"
              onClick={() => router.push("/pages/administrasi-akademik/drop-out/add")}
            >
              <i className="bi bi-plus-lg me-1"></i>Tambah
            </button>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Daftar Pengajuan</h5>
          </div>
          
          <Table
            data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
            onAjukan={handleAjukan}
            onUnggahBerkas={handleUploadSK}
            onUnduhBerkas={handleUnduhBerkas}
          />
          
          {dataDraft.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPage}
              totalData={dataDraft.length}
              navigation={(p) => setCurrentPage(p)}
            />
          )}
        </div>
      )}

      {/* Tabel Pengajuan untuk Wadir - Menampilkan yang Belum Disetujui Wadir 1 */}
      {isWadir1 && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Daftar Pengajuan (Belum Disetujui Wadir 1)</h5>
          </div>
          
          <Table
            data={dataDraft.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
            onDetail={handleDetail}
            onApprove={handleApprove}
            onReject={handleReject}
          />
          
          {dataDraft.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPage}
              totalData={dataDraft.length}
              navigation={(p) => setCurrentPage(p)}
            />
          )}
        </div>
      )}


      {/* Tabel Riwayat Pengajuan - Untuk Prodi dan role lain (bukan Admin, bukan Mahasiswa, bukan Wadir) */}
      {canSeeDraft && !isMahasiswa && !isAdmin && !isWadir1 && (
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Riwayat Pengajuan</h5>
          </div>
          
          <Formsearch
            onSearch={handleSearch}
            onFilter={handleFilterApply}
            onRefresh={handleRefresh}
            onExport={canExport ? handleExportExcel : undefined}
            showAddButton={false}
            showRefreshButton={true}
            showExportButton={canExport}
            searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
            filterContent={filterContent}
          />
          
          <Table
            data={filteredDataRiwayat.slice((currentPageRiwayat - 1) * pageSize, currentPageRiwayat * pageSize)}
            onDetail={handleDetail}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
            onAjukan={handleAjukan}
            onUnggahBerkas={handleUploadSK}
            onUnduhBerkas={handleUnduhBerkas}
          />
          
          {filteredDataRiwayat.length > pageSize && (
            <Paging
              pageSize={pageSize}
              pageCurrent={currentPageRiwayat}
              totalData={filteredDataRiwayat.length}
              navigation={(p) => setCurrentPageRiwayat(p)}
            />
          )}
        </div>
      )}

      {/* Modal Upload SK */}
      {showUploadModal && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
            onClick={handleCloseUploadModal}
          />
          <div 
            className="position-fixed top-50 start-50 translate-middle"
            style={{ zIndex: 1051, width: '90%', maxWidth: '650px' }}
          >
            <div className="bg-white rounded-4 shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-primary text-white p-4 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-white bg-opacity-25 rounded-circle p-2">
                    <i className="bi bi-cloud-upload fs-4"></i>
                  </div>
                  <div>
                    <h5 className="mb-0 fw-bold">Unggah Berkas SK Drop Out</h5>
                    <small className="opacity-75">Lengkapi dokumen yang diperlukan</small>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={handleCloseUploadModal}
                  aria-label="Close"
                ></button>
              </div>

              {/* Body */}
              <div className="p-4">
                {/* File SK Drop Out */}
                <div className="mb-4">
                  <label htmlFor="fileSK" className="form-label fw-semibold d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-file-earmark-pdf text-danger"></i>
                    Berkas SK Drop Out
                    <span className="text-danger">*</span>
                  </label>
                  <div className="position-relative">
                    <input
                      id="fileSK"
                      type="file"
                      className="form-control form-control-lg"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFileSK(e.target.files[0])}
                      style={{ 
                        paddingLeft: '3rem',
                        border: '2px dashed #dee2e6',
                        backgroundColor: '#f8f9fa'
                      }}
                    />
                    <i 
                      className="bi bi-paperclip position-absolute text-muted" 
                      style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.25rem' }}
                    ></i>
                  </div>
                  {fileSK && (
                    <div className="alert alert-success mt-2 py-2 px-3 d-flex align-items-center gap-2">
                      <i className="bi bi-check-circle-fill"></i>
                      <small className="mb-0">{fileSK.name}</small>
                    </div>
                  )}
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <i className="bi bi-info-circle text-primary"></i>
                    <small className="text-muted">Format: PDF, JPG, PNG • Maksimal: 5MB</small>
                  </div>
                </div>

                {/* File Surat Keterangan */}
                <div className="mb-4">
                  <label htmlFor="fileSuratKeterangan" className="form-label fw-semibold d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-file-earmark-text text-info"></i>
                    Berkas Surat Keterangan Pernah Berkuliah
                    <span className="text-danger">*</span>
                  </label>
                  <div className="position-relative">
                    <input
                      id="fileSuratKeterangan"
                      type="file"
                      className="form-control form-control-lg"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFileSuratKeterangan(e.target.files[0])}
                      style={{ 
                        paddingLeft: '3rem',
                        border: '2px dashed #dee2e6',
                        backgroundColor: '#f8f9fa'
                      }}
                    />
                    <i 
                      className="bi bi-paperclip position-absolute text-muted" 
                      style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.25rem' }}
                    ></i>
                  </div>
                  {fileSuratKeterangan && (
                    <div className="alert alert-success mt-2 py-2 px-3 d-flex align-items-center gap-2">
                      <i className="bi bi-check-circle-fill"></i>
                      <small className="mb-0">{fileSuratKeterangan.name}</small>
                    </div>
                  )}
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <i className="bi bi-info-circle text-primary"></i>
                    <small className="text-muted">Format: PDF, JPG, PNG • Maksimal: 5MB</small>
                  </div>
                </div>

                {/* Info Box */}
                <div className="alert alert-light border-start border-4 border-primary py-3 px-4">
                  <div className="d-flex gap-3">
                    <i className="bi bi-exclamation-circle text-primary fs-5"></i>
                    <div>
                      <strong className="d-block mb-1">Perhatian:</strong>
                      <small className="text-muted">
                        Pastikan semua berkas yang diunggah sudah benar dan sesuai. 
                        Berkas yang sudah diunggah tidak dapat diubah kembali.
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-light p-4 d-flex justify-content-end gap-3">
                <button 
                  type="button" 
                  className="btn btn-light border px-4 py-2"
                  onClick={handleCloseUploadModal}
                  disabled={uploading}
                >
                  <i className="bi bi-x-lg me-2"></i>
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary px-4 py-2 shadow-sm"
                  onClick={handleSubmitUpload}
                  disabled={uploading || !fileSK || !fileSuratKeterangan}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-cloud-upload me-2"></i>
                      Unggah Berkas
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Reject */}
      {showRejectModal && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
                  {' Tolak Pengajuan'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={handleRejectCancel}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p className="mb-3">Masukkan alasan penolakan:</p>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Alasan penolakan wajib diisi..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{
                    color: '#212529',
                    backgroundColor: '#ffffff',
                    fontSize: '14px'
                  }}
                  autoFocus
                  aria-label="Alasan penolakan"
                />
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleRejectCancel}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleRejectSubmit}
                >
                  <i className="bi bi-x-circle me-1" aria-hidden="true"></i>
                  {' Tolak'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </MainContent>
  );
}
