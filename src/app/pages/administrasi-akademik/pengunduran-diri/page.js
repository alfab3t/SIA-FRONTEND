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

export default function Page_Administrasi_Pengajuan_Pengunduran_Diri() {
  const router = useRouter();
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);

  const [dataDraft, setDataDraft] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [totalRiwayat, setTotalRiwayat] = useState(0);
  const [totalDraft, setTotalDraft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [hasActivePengajuan, setHasActivePengajuan] = useState(false);
  const [isBebasTanggungan, setIsBebasTanggungan] = useState(true); // Default true untuk non-mahasiswa
  const [userProdi, setUserProdi] = useState(null); // Menyimpan data prodi user dari endpoint getProdi

  
  // Modal states
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
    { Value: "a.pdi_modif_date desc", Text: "Tanggal Modifikasi [↓]" },
    { Value: "a.pdi_modif_date asc", Text: "Tanggal Modifikasi [↑]" },
    { Value: "a.pdi_created_date desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "a.pdi_created_date asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "a.pdi_id asc", Text: "No Pengajuan [↑]" },
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
  const [userProdiRestriction, setUserProdiRestriction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageRiwayat, setCurrentPageRiwayat] = useState(1);
  const pageSize = 10;
  
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState("");
  const [filterProdi, setFilterProdi] = useState("");

  // ============================================================================
  // PERMISSION CHECKS - Menggunakan permission dari backend
  // ============================================================================
  const hasViewPermission = useMemo(() => {
    return hasPermission(userData, "pengunduran_diri.view");
  }, [userData]);

  const hasCreatePermission = useMemo(() => {
    console.log("=== DEBUG CREATE PERMISSION ===");
    console.log("userData:", userData);
    console.log("userData.permission:", userData?.permission);
    console.log("Checking permission: pengunduran_diri.create");
    
    if (!userData?.permission?.length) {
      console.log("No permissions found, using fallback logic");
      const isAdmin = userData?.roleId === "1" || userData?.role === "admin";
      const isStaff = userData?.roleId === "2" || userData?.role === "staff";
      const fallbackResult = isAdmin || isStaff;
      console.log("Fallback result:", fallbackResult);
      return fallbackResult;
    }
    
    const result = hasPermission(userData, "pengunduran_diri.create");
    console.log("hasCreatePermission result:", result);
    console.log("=== END DEBUG ===");
    return result;
  }, [userData]);

  const hasEditPermission = useMemo(() => {
    return hasPermission(userData, "pengunduran_diri.edit");
  }, [userData]);

  const hasDeletePermission = useMemo(() => {
    return hasPermission(userData, "pengunduran_diri.delete");
  }, [userData]);

  const hasApproveRejectPermission = useMemo(() => {
    return hasPermission(userData, "pengunduran_diri.approve_reject");
  }, [userData]);

  const hasExportPermission = useMemo(() => {
    return hasPermission(userData, "pengunduran_diri.export");
  }, [userData]);

  const hasUploadSKPermission = useMemo(() => {
    const result = hasPermission(userData, "pengunduran_diri.import");
    console.log("=== DEBUG UPLOAD SK PERMISSION ===");
    console.log("userData:", userData);
    console.log("Checking permission: pengunduran_diri.import");
    console.log("hasUploadSKPermission result:", result);
    
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
    const statusLower = (status || "").toLowerCase();
    const noStr = String(noPengajuan || "");
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
  // Helper function untuk determine actions berdasarkan permission
  const getActionsForPengunduranDiri = (statusLower, itemId) => {
    const normalizedStatus = statusLower.trim().toLowerCase();
    const actions = ["Detail"]; // Detail selalu ada di posisi pertama
    
    console.log("=== DEBUG GET ACTIONS PENGUNDURAN DIRI ===");
    console.log("Status:", statusLower);
    console.log("Normalized Status:", normalizedStatus);
    console.log("hasUploadSKPermission:", hasUploadSKPermission);
    console.log("includes 'menunggu upload sk':", normalizedStatus.includes("menunggu upload sk"));
    
    // Upload SK untuk status Menunggu Upload SK - letakkan setelah Detail
    if (normalizedStatus.includes("menunggu upload sk") && hasUploadSKPermission) {
      console.log("Adding 'Upload' action");
      actions.push("Upload"); // Gunakan "Upload" bukan "Unggah Berkas" agar sesuai dengan TableRow.js
    }
    
    // Logic khusus untuk Prodi: hanya bisa approve/reject status "Belum Disetujui Prodi"
    if (userProdi) {
      // Untuk Draft/Revisi, tetap bisa Edit/Delete dan Ajukan
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
        
        console.log("Final actions for Prodi Draft/Revisi:", actions);
        console.log("=== END DEBUG ===");
        return actions;
      }
      
      // Untuk status "Belum Disetujui Prodi", tampilkan Approve/Reject
      if (normalizedStatus.includes("belum disetujui prodi")) {
        if (hasApproveRejectPermission) {
          actions.push("Approve", "Reject");
        }
        console.log("Final actions for Prodi approval:", actions);
        console.log("=== END DEBUG ===");
        return actions;
      }
      
      // Untuk semua status lain, hanya Detail (dan Upload SK jika ada)
      console.log("Final actions for Prodi other status:", actions);
      console.log("=== END DEBUG ===");
      return actions;
    }
    
    // Logic untuk non-Prodi (Wadir, Direktur, Admin, Staff)
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
    
    if (hasApproveRejectPermission) {
      const needsApproval = [
        "belum disetujui prodi",
        "belum disetujui wadir 1",
        "belum disetujui direktur",
        "menunggu persetujuan prodi",
        "menunggu persetujuan wadir",
        "menunggu persetujuan direktur",
        "menunggu prodi",
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
    
    const normalizedStatus = statusLower.trim().toLowerCase();
    if (normalizedStatus.includes("menunggu upload sk")) {
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
    return null;
  };

  const getDownloadTemplateAction = (statusLower, pengunduranDiriId) => {
    // Download Template SK hanya untuk user dengan permission export
    if (!hasExportPermission) return null;
    
    const normalizedStatus = statusLower.trim().toLowerCase();
    if (normalizedStatus.includes("menunggu upload sk") && pengunduranDiriId) {
      return {
        IconName: "download",
        Title: "Download Template SK",
        Function: () => handleDownloadTemplate(pengunduranDiriId)
      };
    }
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

        const prodiFilter = forceProdiFilter || filterProdi || "";
        const finalProdiFilter = userProdiRestriction && !prodiFilter ? userProdiRestriction : prodiFilter;

        const pengajuanParams = {
          p1: username,
          keyword: keyword || "",
          sortBy: sort || "a.pdi_modif_date desc",
          konsentrasi: finalProdiFilter || "",
          status: sortStatus || "",
          page: page,
          pageSize: pageSize
        };

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

        const [pengajuanResponse, riwayatResponse] = await Promise.all([
          fetchData(API_LINK + "PengunduranDiri", pengajuanParams, "GET").catch(() => ({ data: [], pagination: { totalRecords: 0 } })),
          fetchData(API_LINK + "PengunduranDiri/riwayat", riwayatBaseParams, "GET").catch(() => ({ data: [], pagination: { totalRecords: 0 } }))
        ]);

        const pengajuanList = extractArrayFromResponse(pengajuanResponse);
        const totalRecordsPengajuan = pengajuanResponse?.pagination?.totalRecords || 0;
        setTotalDraft(totalRecordsPengajuan);

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

        const mapItemDefault = (item, index) => {
          const status = item.status || "";
          const statusLower = status.toLowerCase();
          const itemId = item.id || item.pdiId;
          
          const actions = getActionsForPengunduranDiri(statusLower, itemId);
          const namaMahasiswa = cleanMahasiswaName(item.mahasiswa || item.namaMahasiswa || "-");
          const noPengajuan = formatNoPengajuan(item.id || item.pdiId, status);
          const cetakSKAction = getCetakSKAction(statusLower, itemId);

          const result = {
            No: index + 1,
            id: itemId || "",
            "No. Pengajuan": noPengajuan,
            "Tanggal Pengajuan": item.tanggal || item.createdDate || item.tanggalPengajuan || "-",
            "Dibuat Oleh": item.createdBy || item.dibuatOleh || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: item.konsentrasi || item.prodi || "-",
            "No. SK": item.suratNo || item.noSk || "-",
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

        const mapItemRiwayat = (item, index) => {
          const status = item.status || "";
          const itemId = item.pdiId || item.id || "";
          const actions = [
            "Detail",
            {
              IconName: "download",
              Title: "Download SK",
              Function: () => handleDownloadSK(itemId)
            }
          ];
          const namaMahasiswa = item.namaMahasiswa || item.mahasiswa || "-";
          const noPengajuan = formatNoPengajuan(item.pdiId || item.id, status);

          return {
            No: index + 1,
            id: itemId || "",
            "No. Pengajuan": noPengajuan,
            "NIM": item.mhsId || "-",
            "Nama Mahasiswa": namaMahasiswa,
            "Prodi": item.prodiNama || item.konsentrasi || item.prodi || "-",
            "Tanggal Disetujui": item.tanggalDisetujui || item.tanggal || "-",
            "No. SK": item.suratNo || item.noSk || "-",
            "Status Pengajuan": <Badge status={status || "Disetujui"} customMap={{ 
              "Revisi": "bg-danger-subtle text-danger",
              "Draft": "bg-secondary-subtle text-secondary",
              "Menunggu Upload SK": "bg-warning-subtle text-warning",
              "Belum Disetujui Wadir 1": "bg-warning-subtle text-warning",
              "Belum Disetujui Prodi": "bg-warning-subtle text-warning",
              "Belum Disetujui Direktur": "bg-warning-subtle text-warning"
            }} />,
            Aksi: actions,
            Alignment: ["center", "center", "left", "left", "left", "center", "center", "center", "center"]
          };
        };

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
        
        // Cek apakah username user yang login ada di kolom "Dibuat Oleh" (createdBy)
        // HANYA untuk mahasiswa (yang menggunakan NIM sebagai username)
        // Staff/Admin/Prodi tidak terpengaruh validasi ini
        const isMahasiswa = nim && nim.length > 0 && /^\d+$/.test(nim); // NIM biasanya angka
        
        if (isMahasiswa) {
          const userHasPengajuan = pengajuanList.some(item => {
            const createdBy = item.createdBy || "";
            const status = (item.status || "").toLowerCase();
            const isActiveStatus = !["disetujui", "ditolak"].includes(status);
            
            // Cek apakah createdBy sama dengan NIM mahasiswa
            const isCreatedByUser = createdBy === nim;
            
            return isCreatedByUser && isActiveStatus;
          });
          
          setHasActivePengajuan(userHasPengajuan);
        } else {
          // Untuk non-mahasiswa (staff/admin/prodi), selalu false
          setHasActivePengajuan(false);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        Toast.error("Gagal memuat data. Silakan coba lagi.");
        setDataDraft([]);
        setDataRiwayat([]);
      } finally {
        setLoading(false);
      }
    },
    [sortBy, filterProdi, pageSize, search, sortStatus, userData, ssoData, hasCreatePermission, hasEditPermission, hasDeletePermission, hasApproveRejectPermission, hasUploadSKPermission, hasExportPermission]
  );

  const loadRiwayatOnly = useCallback(
    async (page = 1, forceProdiFilter = null) => {
      try {
        const username = ssoData?.username || userData?.username || "";
        const nim = userData?.nim || userData?.username || "";
        
        if (!username) return;
        
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

        const riwayatResponse = await fetchData(API_LINK + "PengunduranDiri/riwayat", riwayatBaseParams, "GET").catch(() => ({ data: [], pagination: { totalRecords: 0 } }));
        const riwayatList = extractArrayFromResponse(riwayatResponse);
        const totalRecords = riwayatResponse?.pagination?.totalRecords || 0;
        setTotalRiwayat(totalRecords);

        const mapItemRiwayat = (item, index) => {
          const status = item.status || "";
          const itemId = item.pdiId || item.id || "";
          const actions = [
            "Detail",
            {
              IconName: "download",
              Title: "Download SK",
              Function: () => handleDownloadSK(itemId)
            }
          ];
          const namaMahasiswa = item.namaMahasiswa || item.mahasiswa || "-";
          const noPengajuan = formatNoPengajuan(item.pdiId || item.id, status);

          return {
            No: index + 1,
            id: itemId || "",
            "No. Pengajuan": noPengajuan,
            "NIM": item.mhsId || "-",
            "Nama Mahasiswa": namaMahasiswa,
            "Prodi": item.prodiNama || item.konsentrasi || item.prodi || "-",
            "Tanggal Disetujui": item.tanggalDisetujui || item.tanggal || "-",
            "No. SK": item.suratNo || item.noSk || "-",
            "Status Pengajuan": <Badge status={status || "Disetujui"} customMap={{ 
              "Revisi": "bg-danger-subtle text-danger",
              "Draft": "bg-secondary-subtle text-secondary",
              "Menunggu Upload SK": "bg-warning-subtle text-warning",
              "Belum Disetujui Wadir 1": "bg-warning-subtle text-warning",
              "Belum Disetujui Prodi": "bg-warning-subtle text-warning",
              "Belum Disetujui Direktur": "bg-warning-subtle text-warning"
            }} />,
            Aksi: actions,
            Alignment: ["center", "center", "left", "left", "left", "center", "center", "center", "center"]
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
    router.push(`/pages/administrasi-akademik/pengunduran-diri/detail/${encryptedId}`);
  };

  const handleEdit = (id) => {
    const encryptedId = encryptIdUrl(id);
    router.push(`/pages/administrasi-akademik/pengunduran-diri/edit/${encryptedId}`);
  };

  const handleAddClick = () => {
    // Redirect ke halaman add
    // Validasi sudah dilakukan di showAddButton, jadi tombol hanya muncul jika memenuhi syarat
    router.push("/pages/administrasi-akademik/pengunduran-diri/add");
  };

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

    setSortBy(s);
    setSortStatus(st);
    setFilterProdi(pr);
    setCurrentPageRiwayat(1);
    setLoading(true);
    
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
      
      // Cari data pengajuan untuk mendapatkan status
      const pengajuanItem = dataDraft.find(item => item.id === id);
      const status = pengajuanItem?.Status || "";
      
      // Tentukan role berdasarkan status
      let role = "";
      if (status.toLowerCase().includes("belum disetujui prodi")) {
        role = "Prodi";
      } else if (status.toLowerCase().includes("belum disetujui wadir 1") || status.toLowerCase().includes("belum disetujui wadir")) {
        role = "Wadir 1"; // Dengan spasi, sesuai nama status
      } else if (status.toLowerCase().includes("belum disetujui direktur")) {
        role = "Direktur";
      } else {
        // Fallback ke role user
        role = userData?.role || userData?.roleId || "";
      }
      
      const requestBody = { 
        role: role,
        approvedBy: username 
      };
      
      console.log("=== DEBUG APPROVE ===");
      console.log("ID:", id);
      console.log("Status:", status);
      console.log("Role:", role);
      console.log("ApprovedBy:", username);
      console.log("Request body:", requestBody);
      
      // Menggunakan endpoint dari Swagger: PUT /api/PengunduranDiri/approve?id={id}
      const response = await fetchData(
        API_LINK + `PengunduranDiri/approve?id=${encodeURIComponent(id)}`,
        requestBody,
        "PUT"
      );

      console.log("Response:", response);
      console.log("=== END DEBUG ===");

      if (response && !response.error) {
        Toast.success("Pengajuan berhasil disetujui");
        await loadData(1, sortBy, search);
      } else {
        if (response?.status === 404) {
          Toast.error("Endpoint approve belum tersedia di backend. Silakan hubungi tim backend.");
        } else {
          Toast.error(response?.message || "Gagal menyetujui pengajuan");
        }
      }
    } catch (err) {
      console.error("Error approving:", err);
      Toast.error("Gagal menyetujui pengajuan. Silakan coba lagi.");
    }
  };

  const handleReject = async (id) => {
    const confirm = await SweetAlert({
      title: "Tolak Pengajuan",
      text: "Apakah Anda yakin ingin menolak pengajuan ini?",
      icon: "warning",
      confirmText: "Ya, Tolak!",
      confirmButtonColor: "#dc3545",
    });

    if (!confirm) return;

    try {
      const username = userData?.username || ssoData?.username || "";
      
      // Cari data pengajuan untuk mendapatkan status
      const pengajuanItem = dataDraft.find(item => item.id === id);
      const status = pengajuanItem?.Status || "";
      
      // Tentukan role berdasarkan status
      let role = "";
      if (status.toLowerCase().includes("belum disetujui prodi")) {
        role = "Prodi";
      } else if (status.toLowerCase().includes("belum disetujui wadir 1") || status.toLowerCase().includes("belum disetujui wadir")) {
        role = "Wadir 1"; // Dengan spasi, sesuai nama status
      } else if (status.toLowerCase().includes("belum disetujui direktur")) {
        role = "Direktur";
      } else {
        // Fallback ke role user
        role = userData?.role || userData?.roleId || "";
      }
      
      const requestBody = {
        role: role,
        reason: "Ditolak" // Default reason
      };

      console.log("=== DEBUG REJECT ===");
      console.log("ID:", id);
      console.log("Status:", status);
      console.log("Role:", role);
      console.log("Request body:", requestBody);

      // Menggunakan endpoint dari Swagger: PUT /api/PengunduranDiri/reject?id={id}
      const response = await fetchData(
        API_LINK + `PengunduranDiri/reject?id=${encodeURIComponent(id)}`,
        requestBody,
        "PUT"
      );

      console.log("Response:", response);
      console.log("=== END DEBUG ===");

      if (response && !response.error) {
        Toast.success("Pengajuan berhasil ditolak");
        await loadData(1, sortBy, search);
      } else {
        if (response?.status === 404) {
          Toast.error("Endpoint reject belum tersedia di backend. Silakan hubungi tim backend.");
        } else {
          Toast.error(response?.message || "Gagal menolak pengajuan");
        }
      }
    } catch (err) {
      console.error("Error rejecting pengajuan:", err);
      Toast.error("Gagal menolak pengajuan. Silakan coba lagi.");
    }
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
      
      // Gunakan endpoint /api/PengunduranDiri/submit/{draftId}
      const response = await fetchData(
        API_LINK + `PengunduranDiri/submit/${encodeURIComponent(id)}`,
        { createdBy: username },
        "PUT"
      );

      if (response?.error) {
        Toast.error(response.message || "Gagal mengajukan. Silakan coba lagi.");
      } else if (response) {
        Toast.success("Pengajuan berhasil diajukan");
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
      const response = await fetchData(
        API_LINK + `PengunduranDiri/${encodeURIComponent(id)}`,
        {},
        "DELETE"
      );

      if (response) {
        Toast.success("Draft pengajuan berhasil dihapus");
        await loadData(1, sortBy, search);
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
      Toast.error("File SK Pengunduran Diri wajib diunggah");
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

      const formData = new FormData();
      formData.append("PdiId", uploadId);
      formData.append("SkFile", fileSK);
      formData.append("SkpbFile", fileSuratKeterangan);

      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      console.log("Step 1: Uploading files to:", `${API_LINK}PengunduranDiri/upload-sk-file`);

      const uploadRes = await fetch(`${API_LINK}PengunduranDiri/upload-sk-file`, {
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
      
      console.log("Step 2: Updating status to:", `${API_LINK}PengunduranDiri/upload-sk`);
      
      const updateResponse = await fetchData(
        API_LINK + "PengunduranDiri/upload-sk",
        {
          pdiId: uploadId,
          sk: fileSK.name,
          skpb: fileSuratKeterangan.name,
          modifiedBy: userData?.username || userData?.displayName || ""
        },
        "PUT"
      );
      
      console.log("Update status response:", updateResponse);
      
      if (updateResponse && !updateResponse.error) {
        Toast.success("Berkas SK berhasil diunggah dan status berhasil diupdate");
        handleCloseUploadModal();
        
        console.log("Reloading data...");
        await loadData(1, sortBy, search);
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
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      const response = await fetch(`${API_LINK}PengunduranDiri/download-sk/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: {
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `SK_Pengunduran_Diri_${id}.pdf`;
      
      if (contentDisposition) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const filenameMatch = filenameRegex.exec(contentDisposition);
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1].replaceAll(/['"]/g, '');
        }
      }
      
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
    globalThis.open(`${API_LINK}PengunduranDiri/${encodeURIComponent(id)}/generate-pdf-sk`, '_blank');
  };

  const handleDownloadTemplate = async (pengunduranDiriId) => {
    try {
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];

      const response = await fetch(`${API_LINK}PengunduranDiri/DownloadTemplateSK/${encodeURIComponent(pengunduranDiriId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwtToken && { 'Authorization': `Bearer ${jwtToken}` })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = globalThis.URL.createObjectURL(blob);
      globalThis.open(url, '_blank');
      
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
    link.download = file.filename || `${fileType}_Pengunduran_Diri.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    return link;
  };

  const triggerDownloads = (downloadLinks) => {
    console.log(`Triggering ${downloadLinks.length} downloads...`);
    
    downloadLinks[0].click();
    
    if (downloadLinks.length > 1) {
      requestAnimationFrame(() => {
        downloadLinks[1].click();
      });
    }
    
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
      
      const jwtToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwtToken='))
        ?.split('=')[1];
      
      const response = await fetch(`${API_LINK}PengunduranDiri/download-all-sk?id=${encodeURIComponent(id)}`, {
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
        
        const downloadLinks = [];
        
        if (skFile) {
          downloadLinks.push(createDownloadLink(skFile, "SK"));
        }
        
        if (skpbFile) {
          downloadLinks.push(createDownloadLink(skpbFile, "SKPB"));
        }
        
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
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (worksheet[address]) {
        worksheet[address].s = createHeaderStyle();
      }
    }
    
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
      
      const excelData = allData.map((item, index) => ({
        "No": index + 1,
        "No. Pengajuan": item["No. Pengajuan"] || "-",
        "Tanggal Pengajuan": item["Tanggal Pengajuan"] || "-",
        "Nama Mahasiswa": item["Nama Mahasiswa"] || "-",
        "Prodi": item["Prodi"] || "-",
        "Status": item["Status"] || "-",
        "No. SK": item["No. SK"] || "-"
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 18 },
        { wch: 35 },
        { wch: 30 },
        { wch: 25 },
        { wch: 22 }
      ];
      
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      styleExcelWorksheet(worksheet, range);
      
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pengunduran Diri");
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replaceAll(':', '-');
      const filename = `Data_Pengunduran_Diri_${dateStr}_${timeStr}.xlsx`;
      
      XLSX.writeFile(workbook, filename, { cellStyles: true });
      Toast.success("File Excel berhasil diunduh!");
    } catch (err) {
      console.error("Error exporting Excel:", err);
      Toast.error("Gagal membuat file Excel. Silakan coba lagi.");
    }
  };

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
    
    const initializeData = async () => {
      try {
        console.log("=== INITIALIZING DATA ===");
        
        // Cek apakah user adalah mahasiswa
        const nim = userData?.nim || userData?.username || "";
        const isMahasiswa = nim && nim.length > 0 && /^\d+$/.test(nim);
        
        // Jalankan semua API call secara parallel untuk mempercepat loading
        const promises = [
          loadProdiList(),
          checkUserProdiAccess()
        ];
        
        // Jika mahasiswa, tambahkan pengecekan bebas tanggungan
        if (isMahasiswa) {
          promises.push(checkBebasTanggungan(nim));
        }
        
        const results = await Promise.all(promises);
        const prodiValue = results[1]; // Dari checkUserProdiAccess - langsung ID prodi
        const bebasTanggung = isMahasiswa ? results[2] : true; // Dari checkBebasTanggungan atau default true
        
        setUserProdiRestriction(prodiValue);
        setIsBebasTanggungan(bebasTanggung);
        
        console.log("Is Mahasiswa:", isMahasiswa);
        console.log("Bebas Tanggungan:", bebasTanggung);
        
        if (prodiValue && !filterProdi) {
          console.log("Setting filterProdi to prodi value:", prodiValue);
          setFilterProdi(prodiValue);
          console.log("Loading data with prodi value as filter:", prodiValue);
          loadData(1, sortBy, "", prodiValue);
        } else {
          console.log("Loading data without prodi restriction");
          loadData(1, sortBy, "");
        }
        
        console.log("=== END INITIALIZATION ===");
      } catch (err) {
        console.error("Error initializing data:", err);
        loadProdiList();
        loadData(1, sortBy, "");
      }
    };
    
    initializeData();
  }, []);
  
  const loadProdiList = async () => {
    try {
      const response = await fetchData(API_LINK + "PengunduranDiri/prodi/list", {}, "GET");
      
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

  // Fungsi untuk cek status bebas tanggungan mahasiswa
  const checkBebasTanggungan = async (nim) => {
    try {
      console.log("=== CHECKING BEBAS TANGGUNGAN ===");
      console.log("NIM:", nim);
      
      // Endpoint untuk cek bebas tanggungan
      // Sesuaikan dengan endpoint backend yang tersedia
      const response = await fetchData(
        API_LINK + `Mahasiswa/bebas-tanggungan/${encodeURIComponent(nim)}`,
        {},
        "GET"
      );
      
      console.log("Bebas tanggungan response:", response);
      
      // Handle berbagai format response
      let isBebasTanggung = false;
      
      if (response && !response.error) {
        // Cek berbagai kemungkinan field response
        isBebasTanggung = response.isBebasTanggungan || 
                         response.bebasTanggungan || 
                         response.status === "bebas" ||
                         response.data?.isBebasTanggungan ||
                         response.data?.bebasTanggungan ||
                         false;
      }
      
      console.log("Is Bebas Tanggungan:", isBebasTanggung);
      console.log("=== END CHECKING BEBAS TANGGUNGAN ===");
      
      return isBebasTanggung;
    } catch (err) {
      console.error("Error checking bebas tanggungan:", err);
      // Jika error, default ke false (tidak bebas tanggungan) untuk keamanan
      return false;
    }
  };

  const checkUserProdiAccess = async () => {
    try {
      console.log("=== CHECKING USER PRODI ACCESS ===");
      
      const prodiResponse = await fetchData(API_LINK + "PengunduranDiri/prodi", {}, "GET");
      console.log("Raw response from /PengunduranDiri/prodi:", prodiResponse);
      
      if (!prodiResponse || prodiResponse.error) {
        console.log("No prodi restrictions - user can access all prodi");
        setUserProdi(null);
        return null;
      }
      
      let prodiData = prodiResponse;
      if (prodiResponse.data) {
        prodiData = prodiResponse.data;
      }
      
      if (!Array.isArray(prodiData) || prodiData.length === 0) {
        console.log("No prodi restrictions - user can access all prodi");
        setUserProdi(null);
        return null;
      }
      
      const userProdi = prodiData[0];
      const prodiValue = userProdi.value || userProdi.id;
      
      console.log("User prodi data:", userProdi);
      console.log("Prodi value:", prodiValue);
      
      // Simpan data prodi user ke state
      setUserProdi(userProdi);
      
      if (!prodiValue) {
        console.log("No prodi value found - user can access all prodi");
        return null;
      }
      
      console.log("Final prodi value for filtering:", prodiValue);
      console.log("=== END PRODI ACCESS CHECK ===");
      
      return prodiValue;
      
    } catch (err) {
      console.error("Error checking user prodi access:", err);
      setUserProdi(null);
      return null;
    }
  };

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

  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Pengajuan Pengunduran Diri"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Pengunduran Diri" }
      ]}
    >
      <Loading loading={loading} message="Memuat data..." />
      
      {!hasViewPermission && userData?.permission && userData.permission.length > 0 && (
        <div className="alert alert-warning" role="alert">
          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true"></i>
          {' '}
          Anda tidak memiliki akses untuk melihat halaman ini. Silakan hubungi administrator untuk mendapatkan permission <strong>pengunduran_diri.view</strong>.
        </div>
      )}

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

          <div className="mb-4">
            <h5 className="mb-3">Daftar Pengajuan</h5>
            
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
              <div className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Unggah Berkas SK Pengunduran Diri</h6>
                <button 
                  type="button" 
                  className="btn-close btn-close-white"
                  onClick={handleCloseUploadModal}
                  aria-label="Close"
                ></button>
              </div>

              <div className="p-3">
                <div className="mb-3">
                  <label htmlFor="fileSK" className="form-label">
                    Berkas SK Pengunduran Diri <span className="text-danger">*</span>
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

                <div className="alert alert-info py-2 px-3 mb-0">
                  <small>
                    Pastikan semua berkas yang diunggah sudah benar dan sesuai. Berkas yang sudah diunggah tidak dapat diubah kembali.
                  </small>
                </div>
              </div>

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

    </MainContent>
  );
}
