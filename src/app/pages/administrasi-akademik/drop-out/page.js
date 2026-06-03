"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Paging from "@/components/common/Paging";
import Table from "@/components/common/Table";
import Toast from "@/components/common/Toast";
import DropDown from "@/components/common/Dropdown";
import MainContent from "@/components/layout/MainContent";
import Formsearch from "@/components/common/Formsearch";
import Loading from "@/components/common/Loading";
import Badge from "@/components/common/Badge";
import Icon from "@/components/common/Icon";
import { useRouter } from "next/navigation";
import fetchData from "@/lib/fetch";
import { API_LINK } from "@/lib/constant";
import { getSSOData, getUserData } from "@/context/user";
import SweetAlert from "@/components/common/SweetAlert";
import * as XLSX from "xlsx";
import { encryptIdUrl } from "@/lib/encryptor";

// Helper function untuk check permission (inline, tidak dari external file)
const hasPermission = (userData, permissionName) => {
  if (!userData || !userData.permission) return false;
  
  // Permission adalah array of strings, bukan array of objects
  if (Array.isArray(userData.permission)) {
    return userData.permission.includes(permissionName);
  }
  
  return false;
};

export default function Page_Administrasi_Pengajuan_Drop_Out() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [dataDraft, setDataDraft] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [totalRiwayat, setTotalRiwayat] = useState(0);
  const [totalDraft, setTotalDraft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  
  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [fileSK, setFileSK] = useState(null);
  const [fileSuratKeterangan, setFileSuratKeterangan] = useState(null);
  const [uploading, setUploading] = useState(false);

  const sortRef = useRef();
  const statusRef = useRef();
  const prodiRef = useRef();

  // Filter options
  const dataFilterSort = [
    { Value: "a.dro_modif_date desc", Text: "Tanggal Modifikasi [↓]" },
    { Value: "a.dro_modif_date asc", Text: "Tanggal Modifikasi [↑]" },
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

  const [prodiList, setProdiList] = useState([]);
  const [userProdiRestriction, setUserProdiRestriction] = useState(null); // null = no restriction, string = restricted to specific prodi
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageRiwayat, setCurrentPageRiwayat] = useState(1);
  const pageSize = 10; // Ubah dari useState ke const karena tidak pernah diubah
  
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState("");
  const [filterProdi, setFilterProdi] = useState("");

  // ============================================================================
  // PERMISSION CHECKS - Menggunakan permission dari backend
  // ============================================================================
  const hasViewPermission = useMemo(() => {
    console.log("=== DEBUG VIEW PERMISSION ===");
    console.log("userData:", userData);
    console.log("userData.permission:", userData?.permission);
    
    // Jika tidak ada permission array, berikan akses default
    if (!userData?.permission || !Array.isArray(userData.permission)) {
      console.log("No permission array found, granting default access");
      return true;
    }
    
    const result = hasPermission(userData, "drop_out.view");
    console.log("hasViewPermission result:", result);
    console.log("=== END DEBUG ===");
    return result;
  }, [userData]);

  const hasCreatePermission = useMemo(() => {
    console.log("=== DEBUG CREATE PERMISSION ===");
    console.log("userData:", userData);
    console.log("userData.permission:", userData?.permission);
    console.log("Checking permission: drop_out.create");
    
    // Jika tidak ada permission array, fallback ke role-based (untuk backward compatibility)
    if (!userData?.permission?.length) {
      console.log("No permissions found, using fallback logic");
      // Fallback: admin dan staff bisa create
      const isAdmin = userData?.roleId === "1" || userData?.role === "admin";
      const isStaff = userData?.roleId === "2" || userData?.role === "staff";
      const fallbackResult = isAdmin || isStaff;
      console.log("Fallback result:", fallbackResult);
      return fallbackResult;
    }
    
    const result = hasPermission(userData, "drop_out.create");
    console.log("hasCreatePermission result:", result);
    console.log("=== END DEBUG ===");
    return result;
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
    const result = hasPermission(userData, "drop_out.export");
    console.log("=== DEBUG EXPORT PERMISSION ===");
    console.log("Checking permission: drop_out.export");
    console.log("hasExportPermission result:", result);
    console.log("=== END DEBUG ===");
    return result;
  }, [userData]);

  const hasUploadSKPermission = useMemo(() => {
    // Backend menggunakan permission "drop_out.import" untuk upload SK
    const result = hasPermission(userData, "drop_out.import");
    console.log("=== DEBUG UPLOAD SK PERMISSION ===");
    console.log("userData:", userData);
    console.log("Checking permission: drop_out.import");
    console.log("hasUploadSKPermission result:", result);
    
    // Fallback: jika tidak ada permission array, berikan akses ke admin/staff
    if (!userData?.permission?.length) {
      const isAdmin = userData?.roleId === "1" || userData?.role === "admin";
      const isStaff = userData?.roleId === "2" || userData?.role === "staff";
      const fallbackResult = isAdmin || isStaff;
      console.log("Using fallback permission:", fallbackResult);
      console.log("=== END DEBUG ===");
      return fallbackResult;
    }
    
    console.log("=== END DEBUG ===");
    return result;
  }, [userData]);

  const hasCetakSKPermission = useMemo(() => {
    // Cetak SK dan Download Template SK menggunakan permission export (sama dengan hasExportPermission)
    const result = hasPermission(userData, "drop_out.export");
    console.log("=== DEBUG CETAK SK PERMISSION ===");
    console.log("Checking permission: drop_out.export");
    console.log("hasCetakSKPermission result:", result);
    
    // Fallback: jika tidak ada permission array, berikan akses ke admin/staff
    if (!userData?.permission?.length) {
      const isAdmin = userData?.roleId === "1" || userData?.role === "admin";
      const isStaff = userData?.roleId === "2" || userData?.role === "staff";
      const fallbackResult = isAdmin || isStaff;
      console.log("Using fallback permission:", fallbackResult);
      console.log("=== END DEBUG ===");
      return fallbackResult;
    }
    
    console.log("=== END DEBUG ===");
    return result;
  }, [userData]);

  // Helper function untuk format nomor pengajuan
  const formatNoPengajuan = (noPengajuan, status) => {
    // Jika status adalah Draft atau nomor pengajuan hanya angka, tampilkan "DRAFT"
    const statusLower = (status || "").toLowerCase();
    const noStr = String(noPengajuan || "");
    
    // Cek apakah nomor pengajuan hanya berisi angka (tanpa huruf/karakter khusus)
    const isOnlyNumber = /^\d+$/.test(noStr);
    
    if (statusLower === "draft" || isOnlyNumber) {
      return "DRAFT";
    }
    
    return noPengajuan || "-";
  };

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

  // Helper function untuk determine actions berdasarkan permission
  const getActionsForDropOut = (statusLower, itemId) => {
    const normalizedStatus = statusLower.trim().toLowerCase();
    const actions = ["Detail"]; // Detail selalu ada di posisi pertama
    
    console.log("=== DEBUG GET ACTIONS ===");
    console.log("Status:", statusLower);
    console.log("Normalized Status:", normalizedStatus);
    console.log("hasUploadSKPermission:", hasUploadSKPermission);
    console.log("includes 'menunggu upload sk':", normalizedStatus.includes("menunggu upload sk"));
    
    // Upload SK untuk status Menunggu Upload SK - letakkan setelah Detail
    if (normalizedStatus.includes("menunggu upload sk") && hasUploadSKPermission) {
      console.log("Adding 'Upload' action");
      actions.push("Upload"); // Gunakan "Upload" bukan "Unggah Berkas" agar sesuai dengan TableRow.js
    }
    
    // Edit, Delete, dan Ajukan untuk status Draft/Revisi
    if (normalizedStatus === "draft" || normalizedStatus === "revisi") {
      // Urutan: Detail → Edit → Delete → Ajukan (Sent di paling kanan)
      if (hasEditPermission) {
        actions.push("Edit");
      }
      if (hasDeletePermission) {
        actions.push("Delete");
      }
      // Ajukan (Sent) - untuk submit draft - di paling kanan
      actions.push("Sent");
      
      console.log("Final actions for Draft/Revisi:", actions);
      console.log("=== END DEBUG ===");
      return actions;
    }
    
    // Approve/Reject untuk status yang membutuhkan persetujuan
    if (hasApproveRejectPermission) {
      const needsApproval = [
        "belum disetujui wadir 1",
        "belum disetujui direktur",
        "menunggu persetujuan wadir",
        "menunggu persetujuan direktur",
        "menunggu wadir 1",
        "menunggu direktur"
      ].some(status => normalizedStatus.includes(status));
      
      if (needsApproval) {
        actions.push("Approve", "Reject");
      }
    }
    
    console.log("Final actions:", actions);
    console.log("=== END DEBUG ===");
    return actions;
  };

  const getCetakSKAction = (statusLower, itemId) => {
    // Cetak SK (Download Template SK) hanya untuk user dengan permission export
    console.log("=== DEBUG GET CETAK SK ACTION ===");
    console.log("statusLower:", statusLower);
    console.log("hasExportPermission:", hasExportPermission);
    
    if (!hasExportPermission) {
      console.log("No export permission - returning null");
      console.log("=== END DEBUG ===");
      return null;
    }
    
    const normalizedStatus = statusLower.trim().toLowerCase();
    console.log("normalizedStatus:", normalizedStatus);
    console.log("includes 'menunggu upload sk':", normalizedStatus.includes("menunggu upload sk"));
    
    if (normalizedStatus.includes("menunggu upload sk")) {
      console.log("Returning Cetak SK icon");
      console.log("=== END DEBUG ===");
      // Return Icon component langsung, bukan object
      return (
        <Icon
          name="printer"
          type="Bold"
          cssClass="btn px-1 py-0 text-primary"
          title="Cetak SK"
          onClick={() => handleDownloadTemplate(itemId)}
        />
      );
    }
    console.log("Status not 'menunggu upload sk' - returning null");
    console.log("=== END DEBUG ===");
    return null;
  };

  // Fungsi untuk load data dengan permission-based logic
  const loadData = useCallback(
    async (page = 1, sort = sortBy, keyword = "", forceProdiFilter = null) => {
      try {
        setLoading(true);

        const username = ssoData?.username || userData?.username || "";
        const nim = userData?.nim || userData?.username || "";

        if (!username) {
          setDataDraft([]);
          setDataRiwayat([]);
          return;
        }

        // Gunakan parameter forceProdiFilter jika ada, atau fallback ke state
        const prodiFilter = forceProdiFilter || filterProdi || "";
        const finalProdiFilter = userProdiRestriction && !prodiFilter ? userProdiRestriction : prodiFilter;

        const pengajuanParams = {
          page: page,
          pageSize: pageSize,
          keyword: keyword || "",
          sortBy: sort || "a.dro_modif_date desc",
          konsentrasi: finalProdiFilter,
          status: sortStatus || ""
        };

        // Filter berdasarkan user (tidak berdasarkan role lagi)
        if (nim) {
          pengajuanParams.mhsId = nim;
        } else {
          pengajuanParams.username = username;
        }

        // Fetch riwayat (data yang sudah selesai)
        const riwayatBaseParams = {
          username: username,
          page: page,
          pageSize: pageSize,
          keyword: keyword || "",
          konsentrasi: finalProdiFilter,
          role: userData?.roleId || "",
          displayName: userData?.displayName || userData?.fullName || "",
          status: "Disetujui"
        };

        if (nim) {
          riwayatBaseParams.mhsId = nim;
        }

        // Jalankan fetch pengajuan dan riwayat secara parallel untuk mempercepat loading
        const [pengajuanResponse, riwayatResponse] = await Promise.all([
          // Fetch pengajuan (data yang belum selesai)
          fetchData(API_LINK + "DropOut", pengajuanParams, "GET").catch(() => ({ data: [], pagination: { totalRecords: 0 } })),
          
          // Fetch riwayat (data yang sudah selesai)
          fetchData(API_LINK + "DropOut/riwayat", riwayatBaseParams, "GET").catch(() => ({ data: [], pagination: { totalRecords: 0 } }))
        ]);

        // Process pengajuan response
        const pengajuanList = extractArrayFromResponse(pengajuanResponse);
        const totalRecordsPengajuan = pengajuanResponse?.pagination?.totalRecords || 0;
        setTotalDraft(totalRecordsPengajuan);

        // Process riwayat response
        const riwayatList = extractArrayFromResponse(riwayatResponse);
        const totalRecords = riwayatResponse?.pagination?.totalRecords || 0;
        setTotalRiwayat(totalRecords);

        // Cek apakah ada data dengan status "Menunggu Upload SK"
        const hasMenungguUploadSK = pengajuanList.some(item => {
          const status = (item.status || "").toLowerCase();
          return status.includes("menunggu upload sk");
        });
        
        // Tentukan apakah kolom Cetak SK harus ditampilkan
        const showCetakSKColumn = hasExportPermission && hasMenungguUploadSK;
        
        console.log("=== DEBUG CETAK SK COLUMN ===");
        console.log("hasExportPermission:", hasExportPermission);
        console.log("hasMenungguUploadSK:", hasMenungguUploadSK);
        console.log("showCetakSKColumn:", showCetakSKColumn);
        console.log("=== END DEBUG ===");

        // Map pengajuan data
        const mapItemDefault = (item, index) => {
          const status = item.status || "";
          const statusLower = status.toLowerCase();
          const itemId = item.id || item.droId;
          
          const actions = getActionsForDropOut(statusLower, itemId);
          const namaMahasiswa = cleanMahasiswaName(item.mahasiswa || item.namaMahasiswa || "-");
          const noPengajuan = formatNoPengajuan(item.id || item.droId, status);
          const cetakSKAction = getCetakSKAction(statusLower, itemId);

          const result = {
            No: index + 1,
            id: itemId || "",
            "No. Pengajuan DO": noPengajuan,
            "Tanggal Pengajuan": item.createdDate || item.tanggalPengajuan || "-",
            "Dibuat Oleh": item.createdBy || item.dibuatOleh || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: item.konsentrasi || item.prodi || "-",
            "No. SK DO": item.suratNo || item.noSkDo || "-",
            "Status Pengajuan": <Badge status={status || "Draft"} customMap={{ 
              "Revisi": "bg-danger-subtle text-danger",
              "Draft": "bg-secondary-subtle text-secondary",
              "Menunggu Upload SK": "bg-warning-subtle text-warning",
              "Belum Disetujui Wadir 1": "bg-warning-subtle text-warning",
              "Belum Disetujui Prodi": "bg-warning-subtle text-warning",
              "Belum Disetujui Direktur": "bg-warning-subtle text-warning"
            }} />,
            Alignment: ["center", "center", "center", "left", "left", "left", "center", "center", "center"]
          };

          // Tambahkan kolom Cetak SK untuk SEMUA row jika showCetakSKColumn = true
          if (showCetakSKColumn) {
            // Jika row ini berstatus "Menunggu Upload SK", tampilkan icon
            // Jika tidak, tampilkan "-"
            result["Cetak SK"] = cetakSKAction || "-";
            result.Alignment.push("center");
          }

          // Tambahkan kolom Aksi di akhir
          result.Aksi = actions;
          result.Alignment.push("center");

          return result;
        };

        // Map riwayat data
        const mapItemRiwayat = (item, index) => {
          const status = item.status || "";
          const itemId = item.id || item.droId || "";
          const actions = [
            "Detail",
            {
              IconName: "download",
              Title: "Download SK",
              Function: () => handleDownloadSK(itemId)
            }
          ];
          const namaMahasiswa = cleanMahasiswaName(item.mahasiswa || item.namaMahasiswa || "-");
          const noPengajuan = formatNoPengajuan(item.id || item.droId, status);

          return {
            No: index + 1,
            id: itemId || "",
            "No. Pengajuan DO": noPengajuan,
            "Tanggal Pengajuan": item.createdDate || item.tanggalPengajuan || "-",
            "Dibuat Oleh": item.createdBy || item.dibuatOleh || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: item.konsentrasi || item.prodi || "-",
            "No. SK DO": item.suratNo || item.noSkDo || "-",
            "Status Pengajuan": <Badge status={status || "Disetujui"} customMap={{ 
              "Revisi": "bg-danger-subtle text-danger",
              "Draft": "bg-secondary-subtle text-secondary",
              "Menunggu Upload SK": "bg-warning-subtle text-warning",
              "Belum Disetujui Wadir 1": "bg-warning-subtle text-warning",
              "Belum Disetujui Prodi": "bg-warning-subtle text-warning",
              "Belum Disetujui Direktur": "bg-warning-subtle text-warning"
            }} />,
            Aksi: actions,
            Alignment: ["center", "center", "center", "left", "left", "left", "center", "center", "center"]
          };
        };

        // Filter pengajuan: hanya yang belum selesai
        const draftData = pengajuanList
          .filter(item => {
            const status = (item.status || "").toLowerCase();
            return !["disetujui", "ditolak"].includes(status);
          })
          .map(mapItemDefault);

        const riwayatData = riwayatList.map(mapItemRiwayat);

        setDataDraft(draftData);
        setDataRiwayat(riwayatData);
        setCurrentPage(page);
      } catch (err) {
        console.error("Error loading data:", err);
        Toast.error("Gagal memuat data. Silakan coba lagi.");
        setDataDraft([]);
        setDataRiwayat([]);
      } finally {
        setLoading(false);
      }
    },
    [sortBy, filterProdi, pageSize, search, sortStatus, userData, ssoData, hasCreatePermission, hasEditPermission, hasDeletePermission, hasApproveRejectPermission, hasUploadSKPermission, hasCetakSKPermission]
  );

  // Fungsi khusus untuk reload riwayat saja (untuk pagination)
  const loadRiwayatOnly = useCallback(
    async (page = 1, forceProdiFilter = null) => {
      try {
        const username = ssoData?.username || userData?.username || "";
        const nim = userData?.nim || userData?.username || "";
        
        if (!username) return;
        
        // Gunakan parameter forceProdiFilter jika ada, atau fallback ke state
        const prodiFilter = forceProdiFilter || filterProdi || "";
        const finalProdiFilter = userProdiRestriction && !prodiFilter ? userProdiRestriction : prodiFilter;
        
        const riwayatBaseParams = {
          username: username,
          page: page,
          pageSize: pageSize,
          keyword: search || "",
          konsentrasi: finalProdiFilter,
          role: userData?.roleId || "",
          displayName: userData?.displayName || userData?.fullName || "",
          status: "Disetujui"
        };

        if (nim) {
          riwayatBaseParams.mhsId = nim;
        }

        const riwayatResponse = await fetchData(API_LINK + "DropOut/riwayat", riwayatBaseParams, "GET").catch(() => ({ data: [], pagination: { totalRecords: 0 } }));
        const riwayatList = extractArrayFromResponse(riwayatResponse);
        const totalRecords = riwayatResponse?.pagination?.totalRecords || 0;
        setTotalRiwayat(totalRecords);

        // Map riwayat data
        const mapItemRiwayat = (item, index) => {
          const status = item.status || "";
          const itemId = item.id || item.droId || "";
          const actions = [
            "Detail",
            {
              IconName: "download",
              Title: "Download SK",
              Function: () => handleDownloadSK(itemId)
            }
          ];
          const namaMahasiswa = cleanMahasiswaName(item.mahasiswa || item.namaMahasiswa || "-");
          const noPengajuan = formatNoPengajuan(item.id || item.droId, status);

          return {
            No: index + 1,
            id: itemId || "",
            "No. Pengajuan DO": noPengajuan,
            "Tanggal Pengajuan": item.createdDate || item.tanggalPengajuan || "-",
            "Dibuat Oleh": item.createdBy || item.dibuatOleh || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: item.konsentrasi || item.prodi || "-",
            "No. SK DO": item.suratNo || item.noSkDo || "-",
            "Status Pengajuan": <Badge status={status || "Disetujui"} customMap={{ 
              "Revisi": "bg-danger-subtle text-danger",
              "Draft": "bg-secondary-subtle text-secondary",
              "Menunggu Upload SK": "bg-warning-subtle text-warning",
              "Belum Disetujui Wadir 1": "bg-warning-subtle text-warning",
              "Belum Disetujui Prodi": "bg-warning-subtle text-warning",
              "Belum Disetujui Direktur": "bg-warning-subtle text-warning"
            }} />,
            Aksi: actions,
            Alignment: ["center", "center", "center", "left", "left", "left", "center", "center", "center"]
          };
        };
        
        const riwayatData = riwayatList.map(mapItemRiwayat);
        setDataRiwayat(riwayatData);
        
      } catch (err) {
        console.error("Error loading riwayat:", err);
      } finally {
        setLoading(false);
      }
    },
    [ssoData, userData, pageSize, search, filterProdi]
  );

  const handleDetail = (id) => {
    const encryptedId = encryptIdUrl(id);
    router.push(`/pages/administrasi-akademik/drop-out/detail/${encryptedId}`);
  };

  const handleEdit = (id) => {
    const encryptedId = encryptIdUrl(id);
    router.push(`/pages/administrasi-akademik/drop-out/edit/${encryptedId}`);
  };

  const handleAddClick = () => {
    // Redirect ke halaman add
    // Validasi sudah dilakukan di showAddButton, jadi tombol hanya muncul jika memenuhi syarat
    router.push("/pages/administrasi-akademik/drop-out/add");
  };

  /* ================= HANDLER ================= */

  const handleSearch = (q) => {
    setSearch(q);
    setCurrentPage(1);
    setCurrentPageRiwayat(1);
    setLoading(true);
    // Hanya reload Daftar Riwayat
    loadRiwayatOnly(1);
  };

  const handleFilterApply = () => {
    const s = sortRef.current.value;
    const st = statusRef.current.value;
    const pr = prodiRef.current?.value || "";

    // Update state
    setSortBy(s);
    setSortStatus(st);
    setFilterProdi(pr);
    setCurrentPageRiwayat(1);
    setLoading(true);
    
    // Langsung reload dengan nilai baru (tidak menunggu state update)
    loadRiwayatOnly(1);
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
      
      const requestBody = { username: username };
      
      const response = await fetchData(
        API_LINK + `DropOut/wadir/approve?id=${encodeURIComponent(id)}`,
        requestBody,
        "PUT"
      );

      if (response && !response.error) {
        Toast.success("Pengajuan berhasil disetujui");
        await loadData(1, sortBy, search); // Reload data
      } else {
        Toast.error(response?.message || "Gagal menyetujui pengajuan");
      }
    } catch (err) {
      console.error("Error approving:", err);
      Toast.error("Gagal menyetujui pengajuan. Silakan coba lagi.");
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
      
      const requestBody = {
        reason: rejectReason.trim(),
        username: username
      };

      const response = await fetchData(
        API_LINK + `DropOut/wadir/reject?id=${encodeURIComponent(rejectId)}`,
        requestBody,
        "PUT"
      );

      if (response && !response.error) {
        Toast.success("Pengajuan berhasil ditolak");
        setShowRejectModal(false);
        setRejectReason("");
        setRejectId(null);
        await loadData(1, sortBy, search);
      } else {
        Toast.error(response?.message || "Gagal menolak pengajuan");
      }
    } catch (err) {
      console.error("Error rejecting pengajuan:", err);
      Toast.error("Gagal menolak pengajuan. Silakan coba lagi.");
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
      
      // Cek apakah ID sudah dalam format generated (mengandung "/")
      const isGeneratedId = id.includes("/");
      
      let response;
      
      if (isGeneratedId) {
        // Untuk ID yang sudah di-generate, kirim lewat query parameter
        response = await fetchData(
          API_LINK + `DropOut/draft/generate-id?id=${encodeURIComponent(id)}`,
          { createdBy: username },
          "PUT"
        );
      } else {
        // Untuk draft baru (ID tanpa "/"), gunakan path parameter seperti biasa
        response = await fetchData(
          API_LINK + `DropOut/draft/${id}/generate-id`,
          { createdBy: username },
          "PUT"
        );
      }

      if (response?.error) {
        Toast.error(response.message || "Gagal mengajukan. Silakan coba lagi.");
      } else if (response) {
        const newId = response.newId || response.id || "";
        Toast.success("Pengajuan berhasil diajukan" + (newId && !isGeneratedId ? " dengan ID: " + newId : ""));
        await loadData(1, sortBy, search);
      } else {
        Toast.error("Response dari server kosong. Silakan coba lagi.");
      }
    } catch (err) {
      console.error("Error submitting draft:", err);
      Toast.error("Gagal mengajukan. Silakan coba lagi.");
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
        await loadData(1, sortBy, search); // Reload data
      }
    } catch (err) {
      console.error("Error deleting draft:", err);
      Toast.error("Gagal menghapus draft. Silakan coba lagi.");
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

      console.log("=== DEBUG UPLOAD SK ===");
      console.log("Upload ID:", uploadId);
      console.log("SK File:", fileSK?.name);
      console.log("Surat Keterangan File:", fileSuratKeterangan?.name);

      // Step 1: Upload files dengan endpoint upload-sk-file
      const formData = new FormData();
      formData.append("DroId", uploadId);
      formData.append("SkFile", fileSK);
      formData.append("SkpbFile", fileSuratKeterangan);

      // Debug: Log FormData contents
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      console.log("Step 1: Uploading files to:", `${API_LINK}DropOut/upload-sk-file`);

      const uploadRes = await fetch(`${API_LINK}DropOut/upload-sk-file`, {
        method: "POST",
        headers: {
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        },
        body: formData,
      });

      console.log("Upload response status:", uploadRes.status);
      console.log("Upload response ok:", uploadRes.ok);

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("Upload failed:", errorText);
        Toast.error("Gagal mengupload berkas. Silakan coba lagi.");
        return;
      }

      const uploadResponseText = await uploadRes.text();
      console.log("Upload response text:", uploadResponseText);
      
      // Step 2: Update status dengan endpoint upload-sk
      console.log("Step 2: Updating status to:", `${API_LINK}DropOut/upload-sk`);
      
      const updateResponse = await fetchData(
        API_LINK + "DropOut/upload-sk",
        {
          droId: uploadId,
          sk: fileSK.name, // Nama file SK
          skpb: fileSuratKeterangan.name, // Nama file Surat Keterangan
          modifiedBy: userData?.username || userData?.displayName || ""
        },
        "PUT"
      );
      
      console.log("Update status response:", updateResponse);
      
      if (updateResponse && !updateResponse.error) {
        Toast.success("Berkas SK berhasil diunggah dan status berhasil diupdate");
        handleCloseUploadModal();
        
        console.log("Reloading data...");
        await loadData(1, sortBy, search); // Reload data
        console.log("Data reload completed");
      } else {
        Toast.error("File berhasil diupload tapi gagal update status. Silakan hubungi administrator.");
      }

    } catch (err) {
      console.error("Upload error:", err);
      Toast.error("Terjadi kesalahan saat mengupload. Silakan coba lagi.");
    } finally {
      setUploading(false);
      console.log("=== END DEBUG UPLOAD SK ===");
    }
  };

  const handleUnduhBerkas = async (id) => {
    try {
      // Ambil JWT token dari cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      // Fetch dengan authorization header
      const response = await fetch(`${API_LINK}DropOut/download-sk/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: {
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Ambil blob dari response
      const blob = await response.blob();
      
      // Ambil filename dari header Content-Disposition jika ada
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `SK_Drop_Out_${id}.pdf`;
      
      if (contentDisposition) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const filenameMatch = filenameRegex.exec(contentDisposition);
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1].replaceAll(/['"]/g, '');
        }
      }
      
      // Buat URL object dan trigger download
      const blobUrl = globalThis.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(blobUrl);
      
      Toast.success("Berkas SK berhasil diunduh");
    } catch (err) {
      console.error("Download error:", err);
      Toast.error("Gagal mengunduh berkas. Silakan coba lagi.");
    }
  };

  const handleCetakSK = (id) => {
    globalThis.open(`${API_LINK}DropOut/${encodeURIComponent(id)}/generate-pdf-sk`, '_blank');
  };

  const handleDownloadTemplate = async (dropOutId) => {
    try {
      // Ambil JWT token dari cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      const response = await fetch(`${API_LINK}DropOut/DownloadTemplateSK/${encodeURIComponent(dropOutId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Buka file dalam tab baru
      const blob = await response.blob();
      const url = globalThis.URL.createObjectURL(blob);
      globalThis.open(url, '_blank');
      
      // Cleanup URL object setelah delay
      setTimeout(() => {
        globalThis.URL.revokeObjectURL(url);
      }, 1000);

    } catch (err) {
      console.error("Download template error:", err);
      Toast.error("Gagal mendownload template SK. Silakan coba lagi.");
    }
  };
  
  const createDownloadLink = (file, fileType) => {
    const url = `${API_LINK.replace('/api/', '')}${file.url}`;
    console.log(`Preparing ${fileType} download:`, url);
    
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = file.filename || `${fileType}_Drop_Out.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    return link;
  };

  const triggerDownloads = (downloadLinks) => {
    console.log(`Triggering ${downloadLinks.length} downloads...`);
    
    // Download pertama langsung
    downloadLinks[0].click();
    
    // Download kedua dengan requestAnimationFrame
    if (downloadLinks.length > 1) {
      requestAnimationFrame(() => {
        downloadLinks[1].click();
      });
    }
    
    // Cleanup setelah delay
    setTimeout(() => {
      downloadLinks.forEach(link => {
        if (document.body.contains(link)) {
          link.remove();
        }
      });
    }, 1000);
    
    Toast.success(`${downloadLinks.length} file SK berhasil didownload`);
  };

  const handleDownloadSK = async (id) => {
    try {
      console.log("=== DEBUG DOWNLOAD SK ===");
      console.log("Download ID:", id);
      
      // Ambil JWT token dari cookie
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      // Gunakan endpoint download-all-sk sesuai dengan backend
      const response = await fetch(`${API_LINK}DropOut/download-all-sk?id=${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: {
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` }),
          'Accept': 'application/json'
        }
      });
      
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Response data:", data);
      
      if (data.files && Array.isArray(data.files)) {
        const skFile = data.files.find(file => file.type === "SK");
        const skpbFile = data.files.find(file => file.type === "SKPB");
        
        console.log("SK File found:", skFile);
        console.log("SKPB File found:", skpbFile);
        
        // Buat semua link download sekaligus dalam satu user gesture
        const downloadLinks = [];
        
        if (skFile) {
          downloadLinks.push(createDownloadLink(skFile, "SK"));
        }
        
        if (skpbFile) {
          downloadLinks.push(createDownloadLink(skpbFile, "SKPB"));
        }
        
        // Trigger semua download dalam satu event loop
        if (downloadLinks.length > 0) {
          triggerDownloads(downloadLinks);
        } else {
          Toast.error("File SK tidak ditemukan");
        }
      } else {
        Toast.error("Format response tidak sesuai");
      }
      
      console.log("=== END DEBUG DOWNLOAD SK ===");
    } catch (err) {
      console.error("Download error:", err);
      Toast.error("Gagal membuka SK. Silakan coba lagi.");
    }
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
      Toast.error("Gagal membuat file Excel. Silakan coba lagi.");
    }
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
    
    // Initialize data
    const initializeData = async () => {
      try {
        console.log("=== INITIALIZING DATA ===");
        
        // Jalankan semua API call secara parallel untuk mempercepat loading
        const [, konsentrasiValue] = await Promise.all([
          // 1. Load prodi list untuk dropdown
          loadProdiList(),
          // 2. Check user prodi access dan ambil konsentrasi value
          checkUserProdiAccess()
        ]);
        
        setUserProdiRestriction(konsentrasiValue);
        
        // 3. Set filter prodi jika ada pembatasan
        if (konsentrasiValue && !filterProdi) {
          console.log("Setting filterProdi to konsentrasi value:", konsentrasiValue);
          setFilterProdi(konsentrasiValue);
          
          // 4. Load data dengan konsentrasi value sebagai parameter
          console.log("Loading data with konsentrasi value as filter:", konsentrasiValue);
          loadData(1, sortBy, "", konsentrasiValue);
        } else {
          // 4. Load data langsung jika tidak ada pembatasan
          console.log("Loading data without prodi restriction");
          loadData(1, sortBy, "");
        }
        
        console.log("=== END INITIALIZATION ===");
      } catch (err) {
        console.error("Error initializing data:", err);
        // Fallback: load data tanpa pembatasan
        loadProdiList();
        loadData(1, sortBy, "");
      }
    };
    
    initializeData();
  }, []);
  
  // Load data prodi untuk filter
  const loadProdiList = async () => {
    try {
      const response = await fetchData(API_LINK + "DropOut/prodi/list", {}, "GET");
      
      if (response && !response.error) {
        const data = Array.isArray(response) ? response : (response.data || []);
        const prodiOptions = [
          { Value: "", Text: "Semua Prodi" },
          ...data.map(item => ({
            Value: item.value || item.text || item.nama,
            Text: item.text || item.nama || item.value
          }))
        ];
        setProdiList(prodiOptions);
      }
    } catch (err) {
      console.error("Error loading prodi:", err);
      setProdiList([{ Value: "", Text: "Semua Prodi" }]);
    }
  };

  // Check user prodi access dan ambil konsentrasi value untuk filtering
  const checkUserProdiAccess = async () => {
    try {
      console.log("=== CHECKING USER PRODI ACCESS ===");
      
      // Step 1: Ambil prodi user
      const prodiResponse = await fetchData(API_LINK + "DropOut/prodi", {}, "GET");
      console.log("Raw response from /DropOut/prodi:", prodiResponse);
      
      if (!prodiResponse || prodiResponse.error) {
        console.log("No prodi restrictions - user can access all prodi");
        return null;
      }
      
      // Handle berbagai format response
      let prodiData = prodiResponse;
      if (prodiResponse.data) {
        prodiData = prodiResponse.data;
      }
      
      if (!Array.isArray(prodiData) || prodiData.length === 0) {
        console.log("No prodi restrictions - user can access all prodi");
        return null;
      }
      
      // Step 2: Ambil prodi value untuk query konsentrasi
      const userProdi = prodiData[0];
      const prodiValue = userProdi.value || userProdi.id;
      
      console.log("User prodi data:", userProdi);
      console.log("Prodi value:", prodiValue);
      
      if (!prodiValue) {
        console.log("No prodi value found - user can access all prodi");
        return null;
      }
      
      // Step 3: Ambil konsentrasi berdasarkan prodi value
      console.log("Fetching konsentrasi for prodi value:", prodiValue);
      const konsentrasiResponse = await fetchData(
        API_LINK + `DropOut/konsentrasi?prodiId=${prodiValue}`, 
        {}, 
        "GET"
      );
      
      console.log("Konsentrasi response:", konsentrasiResponse);
      
      if (!konsentrasiResponse || konsentrasiResponse.error) {
        console.log("No konsentrasi found for prodi value:", prodiValue);
        return null;
      }
      
      // Handle berbagai format response konsentrasi
      let konsentrasiData = konsentrasiResponse;
      if (konsentrasiResponse.data) {
        konsentrasiData = konsentrasiResponse.data;
      }
      
      if (!Array.isArray(konsentrasiData) || konsentrasiData.length === 0) {
        console.log("No konsentrasi data found");
        return null;
      }
      
      // Step 4: Ambil konsentrasi value untuk filtering
      const konsentrasi = konsentrasiData[0];
      const konsentrasiValue = konsentrasi.value || konsentrasi.id;
      
      console.log("Konsentrasi data:", konsentrasi);
      console.log("Final konsentrasi value for filtering:", konsentrasiValue);
      console.log("=== END PRODI ACCESS CHECK ===");
      
      return konsentrasiValue;
      
    } catch (err) {
      console.error("Error checking user prodi access:", err);
      return null;
    }
  };

  // Re-load data when userData changes
  useEffect(() => {
    if (isClient && userData) {
      loadData(1, sortBy, "");
    }
  }, [userData, isClient]);

  /* ================= FILTER UI ================= */

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
      {/* Dropdown Prodi - hanya untuk user selain mahasiswa dan prodi */}
      {prodiList.length > 0 && !userProdiRestriction && (
        <DropDown
          ref={prodiRef}
          arrData={prodiList}
          label="Prodi"
          defaultValue={filterProdi}
          disabled={false}
        />
      )}
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
      {/* Loading overlay saat fetch data */}
      <Loading loading={loading} message="Memuat data..." />
      
      {/* Check view permission */}
      {!hasViewPermission && userData?.permission && userData.permission.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {' '}
          Anda tidak memiliki akses untuk melihat halaman ini. Silakan hubungi administrator untuk mendapatkan permission <strong>drop_out.view</strong>.
        </div>
      )}

      {/* Show content only if has view permission or permission is empty (fallback to role) */}
      {(hasViewPermission || !userData?.permission?.length) && (
        <>
          {/* Tombol Tambah - di atas Daftar Pengajuan */}
          {(() => {
            if (!hasCreatePermission) return null;
            
            // Cek apakah user adalah mahasiswa
            const nim = userData?.nim || userData?.username || "";
            const isMahasiswa = nim && nim.length > 0 && /^\d+$/.test(nim);
            
            // Jika bukan mahasiswa (prodi/admin), selalu tampilkan tombol
            if (!isMahasiswa) {
              return (
                <div className="mb-3">
                  <button 
                    className="btn btn-primary px-4"
                    onClick={handleAddClick}
                    type="button"
                  >
                    <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
                    {' '}
                    Tambah
                  </button>
                </div>
              );
            }
            
            // Jika mahasiswa, hanya tampilkan jika belum ada pengajuan aktif dan bebas tanggungan
            if (!hasActivePengajuan && isBebasTanggungan) {
              return (
                <div className="mb-3">
                  <button 
                    className="btn btn-primary px-4"
                    onClick={handleAddClick}
                    type="button"
                  >
                    <i className="bi bi-plus-lg me-1" aria-hidden="true"></i>
                    {' '}
                    Tambah
                  </button>
                </div>
              );
            }
            
            return null;
          })()}

          {/* Tabel Pengajuan - Universal untuk semua user */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Daftar Pengajuan</h5>
            </div>
            
            <Table
              data={dataDraft}
              onDetail={handleDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
              onSent={handleAjukan}
              onAjukan={handleAjukan}
              onUpload={handleUploadSK}
              onUnduhBerkas={handleUnduhBerkas}
              onDownloadSK={handleDownloadSK}
              onCetakSK={handleCetakSK}
            />
            
            {totalDraft > pageSize && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPage}
                totalData={totalDraft}
                navigation={(p) => {
                  setCurrentPage(p);
                  loadData(p, sortBy, search);
                }}
              />
            )}
          </div>

          {/* Tabel Riwayat - Universal untuk semua user */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Daftar Riwayat</h5>
            </div>
            
            <Formsearch
              onSearch={handleSearch}
              onFilter={handleFilterApply}
              showAddButton={false}
              showRefreshButton={false}
              searchPlaceholder="Cari No. Pengajuan / Nama Mahasiswa"
              filterContent={filterContent}
            />
            
            <Table
              data={dataRiwayat}
              onDetail={handleDetail}
              onDownloadSK={handleDownloadSK}
            />
            
            {totalRiwayat > pageSize && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPageRiwayat}
                totalData={totalRiwayat}
                navigation={(p) => {
                  setCurrentPageRiwayat(p);
                  loadRiwayatOnly(p);
                }}
              />
            )}
          </div>
        </>
      )}
      
      {/* Modal Upload SK */}
      {showUploadModal && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ 
              backgroundColor: 'rgba(0,0,0,0.5)', 
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              zIndex: 1050 
            }}
            onClick={handleCloseUploadModal}
            onKeyDown={(e) => e.key === 'Escape' && handleCloseUploadModal()}
            role="button"
            tabIndex={0}
            aria-label="Close modal"
          ></div>
          <div 
            className="position-fixed top-50 start-50 translate-middle"
            style={{ zIndex: 1051, width: '90%', maxWidth: '550px' }}
          >
            <div className="bg-white rounded shadow-lg">
              {/* Header */}
              <div className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Unggah Berkas SK Drop Out</h6>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={handleCloseUploadModal}
                  aria-label="Close"
                ></button>
              </div>

              {/* Body */}
              <div className="p-3">
                {/* File SK Drop Out */}
                <div className="mb-3">
                  <label htmlFor="fileSK" className="form-label">
                    Berkas SK Drop Out <span className="text-danger">*</span>
                  </label>
                  <input
                    id="fileSK"
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileSK(e.target.files[0])}
                  />
                  {fileSK && (
                    <small className="text-success d-block mt-1">
                      <i className="bi bi-check-circle me-1" aria-hidden="true"></i>
                      {fileSK.name}
                    </small>
                  )}
                  <small className="text-muted d-block mt-1">Format: PDF, JPG, PNG • Maksimal: 5MB</small>
                </div>

                {/* File Surat Keterangan */}
                <div className="mb-3">
                  <label htmlFor="fileSuratKeterangan" className="form-label">
                    Berkas Surat Keterangan Pernah Berkuliah <span className="text-danger">*</span>
                  </label>
                  <input
                    id="fileSuratKeterangan"
                    type="file"
                    className="form-control"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFileSuratKeterangan(e.target.files[0])}
                  />
                  {fileSuratKeterangan && (
                    <small className="text-success d-block mt-1">
                      <i className="bi bi-check-circle me-1" aria-hidden="true"></i>
                      {fileSuratKeterangan.name}
                    </small>
                  )}
                  <small className="text-muted d-block mt-1">Format: PDF, JPG, PNG • Maksimal: 5MB</small>
                </div>

                {/* Info Box */}
                <div className="alert alert-info py-2 px-3 mb-0">
                  <small>
                    Pastikan semua berkas yang diunggah sudah benar dan sesuai. Berkas yang sudah diunggah tidak dapat diubah kembali.
                  </small>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-top d-flex justify-content-end gap-2">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCloseUploadModal}
                  disabled={uploading}
                >
                  Batal
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSubmitUpload}
                  disabled={uploading || !fileSK || !fileSuratKeterangan}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Mengunggah...
                    </>
                  ) : (
                    'Unggah Berkas'
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
                  {' '}
                  Tolak Pengajuan
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
                  {' '}
                  Tolak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainContent>
  );
}