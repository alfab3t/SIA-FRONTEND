"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Paging from "@/components/common/Paging";
import Table from "@/components/common/Table";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import DropDown from "@/components/common/Dropdown";
import MainContent from "@/components/layout/MainContent";
import Formsearch from "@/components/common/Formsearch";
import { useRouter } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { encryptIdUrl } from "@/lib/encryptor";
import SweetAlert from "@/components/common/SweetAlert";
import { getSSOData, getUserData } from "@/context/user";

export default function Page_Administrasi_Pengajuan_Cuti_Akademik() {
  const ssoData = useMemo(() => getSSOData(), []);
  const userData = useMemo(() => getUserData(), []);
  
  
  const [permission, setPermission] = useState(null);

  useEffect(() => {
    const loadPermission = async () => {
      try {
        const payload = {
          username: userData?.username || "",
          appId: "SIA",
          roleId: userData?.roleId || ""
        };

        const res = await fetch(`${API_LINK}Auth/getpermission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log("PERMISSION LOADED =", data);
        setPermission(data);
      } catch (err) {
        console.error("Gagal load permission:", err);
      }
    };

    if (userData?.username) loadPermission();
  }, [userData]);

  const router = useRouter();
  const [dataCutiAkademik, setDataCutiAkademik] = useState([]);
  const [dataRiwayat, setDataRiwayat] = useState([]);
  const [riwayatLoaded, setRiwayatLoaded] = useState(false);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRiwayat, setShowRiwayat] = useState(false);

  const sortRef = useRef();
  const statusRef = useRef();
  const prodiRef = useRef();


  let fixedRole = (userData?.role || "").toUpperCase();
  
  if (permission?.roleName) {
    fixedRole = permission.roleName.toUpperCase();
  }

  
  const isMahasiswa = fixedRole === "ROL23" || fixedRole === "MAHASISWA";
  const isProdi = fixedRole === "ROL22" || fixedRole === "PRODI" || fixedRole === "NDA-PRODI" || fixedRole === "NDA_PRODI";
  const isWadir1 = fixedRole === "ROL01" || fixedRole === "WADIR1";
  const isFinance = fixedRole === "ROL08" || fixedRole === "FINANCE" || fixedRole === "USER-FINANCE" || fixedRole === "USER_FINANCE" || 
                    (userData?.nama && userData.nama.toLowerCase().includes('finance'));
  const isDAAK = fixedRole === "ROL21" || fixedRole === "DAAK";
  
  
  // Admin should NOT include Finance, Wadir1, or Prodi users who have specific workflows
  const isAdmin = (fixedRole === "ADMIN" || fixedRole === "ADMIN SIA" || 
                  (fixedRole === "KARYAWAN" && !isFinance && !isWadir1 && !isProdi) ||
                  isDAAK);


  const dataFilterSort = [
    { Value: "tanggal_desc", Text: "Tanggal Pengajuan [↓]" },
    { Value: "tanggal_asc", Text: "Tanggal Pengajuan [↑]" },
    { Value: "id_asc", Text: "No Pengajuan [↑]" },
    { Value: "id_desc", Text: "No Pengajuan [↓]" },
  ];

  const dataFilterStatus = [
    { Value: "", Text: "Semua Status" },
    { Value: "Draft", Text: "Draft" },
    { Value: "Belum Disetujui Prodi", Text: "Belum Disetujui Prodi" },
    { Value: "Belum Disetujui Wadir 1", Text: "Belum Disetujui Wadir 1" },
    { Value: "Belum Disetujui Finance", Text: "Belum Disetujui Finance" },
    { Value: "Menunggu Upload SK", Text: "Menunggu Upload SK" },
    { Value: "Disetujui", Text: "Disetujui" },
    { Value: "Ditolak", Text: "Ditolak" },
  ];

  const dataFilterProdi = [
    { Value: "", Text: "— Semua Prodi —" },
    { Value: "Manajemen Informatika", Text: "Manajemen Informatika" },
    { Value: "Mekatronika", Text: "Mekatronika" },
    { Value: "Teknik Alat Berat", Text: "Teknik Alat Berat" },
    { Value: "Teknik Otomotif", Text: "Teknik Otomotif" },
    { Value: "Teknik Pengolahan Hasil Perkebunan", Text: "Teknik Pengolahan Hasil Perkebunan" },
    { Value: "Teknik Produksi dan Proses Manufaktur", Text: "Teknik Produksi dan Proses Manufaktur" },
    { Value: "Teknologi Konstruksi Bangunan Gedung", Text: "Teknologi Konstruksi Bangunan Gedung" },
    { Value: "Teknologi Rekayasa Logistik", Text: "Teknologi Rekayasa Logistik" },
    { Value: "Teknologi Rekayasa Pemeliharaan Alat Berat", Text: "Teknologi Rekayasa Pemeliharaan Alat Berat" },
    { Value: "Teknologi Rekayasa Perangkat Lunak", Text: "Teknologi Rekayasa Perangkat Lunak" },
  ];

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageRiwayat, setCurrentPageRiwayat] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [totalDataRiwayat, setTotalDataRiwayat] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchRiwayat, setSearchRiwayat] = useState("");
  const [sortBy, setSortBy] = useState(dataFilterSort[0].Value);
  const [sortStatus, setSortStatus] = useState(dataFilterStatus[0].Value);
  const [filterProdi, setFilterProdi] = useState(dataFilterProdi[0].Value);
  
  const loadData = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        console.log("=== DEBUG LOAD DATA ===");
        console.log("User Data:", userData);
        console.log("Fixed Role:", fixedRole);
        console.log("User Nama:", userData?.nama);
        console.log("Is Mahasiswa:", isMahasiswa);
        console.log("Is Prodi:", isProdi);
        console.log("Is Wadir1:", isWadir1);
        console.log("Is Finance:", isFinance);
        console.log("Is DAAK:", isDAAK);
        console.log("Is Admin:", isAdmin);

        
        
        let mhsId = "%"; 
        let statusFilter = "";
        let userId = "";
        
        if (isMahasiswa) {
          // Try multiple possible fields for mahasiswa ID
          mhsId = userData?.mhsId || userData?.nama || userData?.username || userData?.userid || "";
          
          console.log("=== MAHASISWA ID MAPPING ===");
          console.log("userData.mhsId:", userData?.mhsId);
          console.log("userData.nama:", userData?.nama);
          console.log("userData.username:", userData?.username);
          console.log("userData.userid:", userData?.userid);
          console.log("Final mhsId used:", mhsId);
          
          if (!mhsId) {
            console.error("Mahasiswa ID not found in userData");
            setDataCutiAkademik([]);
            setTotalData(0);
            return;
          }
          statusFilter = ""; 
        } else if (isProdi) {
          // For Prodi users, show:
          // 1. Draft applications created by Prodi
          // 2. Applications waiting for Prodi approval
          statusFilter = ""; // Don't filter by status at API level, we'll filter in frontend
          userId = userData?.username || "";
          mhsId = "%";
          console.log("PRODI - will show drafts created by Prodi and applications needing Prodi approval");
        } else if (isWadir1) {
          
          statusFilter = "Belum Disetujui Wadir 1";
          mhsId = "%";
        } else if (isFinance) {
          
          statusFilter = "Belum Disetujui Finance";
          mhsId = "%";
        } else if (isDAAK) {
          
          statusFilter = "Menunggu Upload SK";
          mhsId = "%";
        } else if (isAdmin) {
          
          
          statusFilter = ""; 
          mhsId = "%";
          userId = "";
        }

        // Map frontend role to backend role codes
        let backendRole = fixedRole;
        if (fixedRole === "ADMIN SIA" || fixedRole === "ADMIN") {
          backendRole = "ROL21"; // 
        }

        console.log("API Parameters:", { mhsId, statusFilter, userId, role: backendRole, search });
        console.log("Workflow Path:", 
          isMahasiswa ? "MAHASISWA" : 
          isProdi ? "PRODI" : 
          isWadir1 ? "WADIR1" : 
          isFinance ? "FINANCE" : 
          isDAAK ? "DAAK" : 
          isAdmin ? "ADMIN" : "UNKNOWN");

        
        const params = new URLSearchParams();
        
        
        if (isMahasiswa) {
          // For mahasiswa, ALWAYS filter by their mhsId - never use wildcard
          params.append('mhsId', mhsId);
          console.log("MAHASISWA FILTER - Using exact mhsId:", mhsId);
        } else {
          // For other roles, use wildcard or specific filter
          params.append('mhsId', mhsId || '%');
        }
        
        
        if (statusFilter) params.append('status', statusFilter);
        if (userId) params.append('userId', userId);
        if (backendRole) params.append('role', backendRole);
        if (search) params.append('search', search);

        const url = `${API_LINK}CutiAkademik?${params}`;
        console.log("API URL:", url);

        // Add minimum loading time for better UX (but keep it fast - 250ms)
        const [response] = await Promise.all([
          fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }),
          new Promise(resolve => setTimeout(resolve, 250))
        ]);
        
        console.log("Response Status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error Response:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log("Raw Response:", responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          throw new Error("Invalid JSON response from server");
        }

        console.log("Parsed API Response Data:", data);

        
        let actualData = data;
        if (data && typeof data === 'object') {
          
          if (data.data && Array.isArray(data.data)) {
            actualData = data.data;
          }
          
          else if (data.items && Array.isArray(data.items)) {
            actualData = data.items;
          }
          
          else if (data.result && Array.isArray(data.result)) {
            actualData = data.result;
          }
          
          else if (!Array.isArray(data)) {
            console.log("Response is object but not array, checking properties...");
            const arrayProps = Object.keys(data).filter(key => Array.isArray(data[key]));
            if (arrayProps.length > 0) {
              actualData = data[arrayProps[0]];
              console.log(`Using array property: ${arrayProps[0]}`);
            }
          }
        }

        if (!Array.isArray(actualData)) {
          console.log("Data is not array after processing, setting empty array");
          console.log("Actual data type:", typeof actualData);
          console.log("Actual data:", actualData);
          setDataCutiAkademik([]);
          setTotalData(0);
          return;
        }

        console.log("Processing array data:", actualData);

        
        const pendingData = actualData.filter(item => {
          const currentStatus = item.status || item.cak_status || "";
          
          if (isMahasiswa) {
            
            if (currentStatus === "Draft") {
              return true; 
            }
            return false; 
          } else if (isProdi) {
            // For Prodi users, show only:
            // 1. Draft applications created by Prodi (not by Mahasiswa)
            // 2. Applications waiting for Prodi approval ("Belum Disetujui Prodi")
            // 3. Applications waiting for Wadir 1 approval ("Belum Disetujui Wadir 1")
            
            if (currentStatus === "Draft") {
              // Check if this draft was created by Prodi
              const createdByProdi = item.cak_created_by && 
                (item.cak_created_by.toLowerCase().includes('prodi') ||
                 item.cak_created_by === userData?.username ||
                 item.cak_created_by === userData?.nama);
              
              // Also check session storage for prodi-created applications
              const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedApps') || '[]');
              const isProdiCreatedFromSession = prodiCreatedApps.includes(item.cak_id || item.id);
              
              // Check if application has prodi-specific fields
              const hasProdiFields = item.menimbang && item.menimbang.trim() !== "";
              
              const isCreatedByProdi = createdByProdi || isProdiCreatedFromSession || hasProdiFields;
              
              // Only show Draft if it was created by Prodi
              return isCreatedByProdi;
            } else if (currentStatus === "Belum Disetujui Prodi" || 
                       currentStatus === "Belum Disetujui Wadir 1") {
              return true;
            }
            
            return false;
          } else {
            // For other roles (Wadir1, Finance, DAAK, Admin)
            if (isDAAK || isAdmin) {
              // For Admin/DAAK users, show specific statuses:
              // 1. Belum Disetujui Prodi
              // 2. Belum Disetujui Wadir 1  
              // 3. Menunggu Upload SK
              if (currentStatus === "Belum Disetujui Prodi" ||
                  currentStatus === "Belum Disetujui Wadir 1" ||
                  currentStatus === "Menunggu Upload SK") {
                return true;
              }
              return false;
            } else {
              // For Wadir1 and Finance, exclude completed applications
              if (currentStatus === "Disetujui") {
                return false;
              }
              return true;
            }
          }
        });

        console.log("Filtered pending data:", pendingData);
        console.log("=== PRODI FILTERING DEBUG ===");
        if (isProdi) {
          console.log("Total items from API:", actualData.length);
          console.log("Items after Prodi filtering:", pendingData.length);
          console.log("Sample filtered items:", pendingData.slice(0, 3).map(item => ({
            id: item.id || item.cak_id,
            status: item.status || item.cak_status,
            createdBy: item.cak_created_by,
            menimbang: item.menimbang ? "has menimbang" : "no menimbang"
          })));
        }

        
        const totalPendingItems = pendingData.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedPendingData = pendingData.slice(startIndex, endIndex);

        const formattedData = paginatedPendingData.map((item, index) => {
          
          const isDraft = item.status === "Draft" || item.id === "DRAFT" || !item.id?.includes("PMA");

          
          let actions = ["Detail"];
          
          const currentStatus = item.status || item.cak_status || "";
          const hasUploadedSK = item.srt_no || item.suratNo || item.cak_srt_no;
          
          if (isMahasiswa) {
            // Check if this application was created by prodi using multiple detection methods
            const createdByProdi = item.cak_created_by && 
              (item.cak_created_by.toLowerCase().includes('prodi') ||
               item.cak_created_by === userData?.username ||
               item.cak_created_by === userData?.nama);
            
            // Also check session storage for prodi-created applications
            const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedApps') || '[]');
            const isProdiCreatedFromSession = prodiCreatedApps.includes(item.cak_id || item.id);
            
            // Check if application has prodi-specific fields (menimbang field presence)
            const hasProdiFields = item.menimbang && item.menimbang.trim() !== "";
            
            const isCreatedByProdi = createdByProdi || isProdiCreatedFromSession || hasProdiFields;
            
            if (isDraft && !isCreatedByProdi) {
              // Mahasiswa can only edit/delete/submit their own applications
              actions = ["Detail", "Edit", "Delete", "Ajukan"];
            } else {
              // Mahasiswa can only view submitted applications or prodi-created applications
              // They CANNOT perform "Ajukan" on prodi-created drafts
              actions = ["Detail"];
            }
          } else if (isProdi) {
            if (currentStatus === "Draft") {
              // Prodi can edit/delete/submit draft applications
              actions = ["Detail", "Edit", "Delete", "Ajukan"];
            } else if (currentStatus === "Belum Disetujui Prodi") {
              // Prodi can approve/reject applications waiting for Prodi approval
              actions = ["Detail", "Approve", "Reject"];
            } else {
              // For other statuses (like "Belum Disetujui Wadir 1"), Prodi can only view
              actions = ["Detail"];
            }
          } else if (isWadir1) {
            if (currentStatus === "Belum Disetujui Wadir 1") {
              actions = ["Detail", "Approve", "Reject"];
            } else {
              actions = ["Detail"];
            }
          } else if (isFinance) {
            if (currentStatus === "Belum Disetujui Finance") {
              actions = ["Detail", "Approve", "Reject"];
            } else {
              actions = ["Detail"];
            }
          } else if (isDAAK || isAdmin) {
            // Check if all three approvals are complete
            const isAllApprovalsComplete = currentStatus && 
              !currentStatus.includes("Belum Disetujui Prodi") && 
              !currentStatus.includes("Belum Disetujui Wadir 1") && 
              !currentStatus.includes("Belum Disetujui Finance") &&
              !currentStatus.includes("Draft") &&
              !currentStatus.includes("Ditolak");
              
            // Additional check for specific approved statuses
            const isReadyForSK = currentStatus === "Menunggu Upload SK" || 
                               currentStatus === "Disetujui" ||
                               isAllApprovalsComplete;
            
            // Debug admin actions logic
            if (index === 0) {
              console.log("=== ADMIN ACTIONS DEBUG ===");
              console.log("Current Status:", currentStatus);
              console.log("All Approvals Complete:", isAllApprovalsComplete);
              console.log("Ready for SK:", isReadyForSK);
              console.log("Has Uploaded SK:", hasUploadedSK);
            }
            
            if (isReadyForSK) {
              // All approvals complete - admin can manage SK
              if (hasUploadedSK) {
                // SK already uploaded, admin can only view (DownloadSK moved to SK column)
                actions = ["Detail"];
              } else {
                // No SK yet, show upload option
                actions = ["Detail", "Upload"];
              }
            } else {
              // Approvals still pending - admin can only view
              actions = ["Detail"];
            }
            
            // Debug final actions
            if (index === 0) {
              console.log("Final Admin Actions:", actions);
            }
          }

          
          // Function to format SK Cuti Akademik column (only for Admin role)
          const formatSKCutiAkademikColumn = (skNo, itemId) => {
            if (isAdmin || isDAAK) {
              // Only Admin can see and download SK
              if (skNo && skNo !== "" && skNo !== "-") {
                // If SK exists, return DownloadSK action
                return "DownloadSK";
              } else {
                // If no SK, return dash
                return "-";
              }
            } else {
              // Other roles cannot access SK download
              return "-";
            }
          };

          // Function to determine Prodi approval status icon
          const getProdiIcon = (status, item) => {
            if (!status) return "⏳";
            
            const statusLower = status.toLowerCase();
            
            // For Draft status, always show X (not approved yet)
            if (statusLower === "draft") {
              return "✗"; // X - Draft not approved yet
            } else if (statusLower === "belum disetujui prodi") {
              return "✗"; // X - waiting for Prodi approval
            } else if (statusLower.includes("ditolak") && statusLower.includes("prodi")) {
              return "✗"; // X - rejected by Prodi
            } else if (statusLower === "menunggu upload sk" || 
                       statusLower.includes("disetujui") || 
                       statusLower.includes("wadir") || 
                       statusLower.includes("finance")) {
              return "✓"; // Checkmark - approved (including Menunggu Upload SK)
            } else {
              return "⏳"; // Default pending
            }
          };

          // Function to determine Wadir 1 approval status icon
          const getWadir1Icon = (status) => {
            if (!status) return "⏳";
            
            const statusLower = status.toLowerCase();
            if (statusLower === "draft" || statusLower === "belum disetujui prodi") {
              return "✗"; // X - not approved yet (Draft or waiting for Prodi)
            } else if (statusLower === "belum disetujui wadir 1") {
              return "✗"; // X - waiting for Wadir 1 approval
            } else if (statusLower.includes("ditolak")) {
              return "✗"; // X - rejected
            } else if (statusLower === "menunggu upload sk" || 
                       statusLower.includes("disetujui") || 
                       statusLower.includes("finance") || 
                       statusLower.includes("upload sk")) {
              return "✓"; // Checkmark - approved (including Menunggu Upload SK)
            } else {
              return "⏳"; // Default pending
            }
          };

          
          
          if (index === 0) {
            console.log("Sample item structure:", item);
            console.log("Available keys:", Object.keys(item));
          }

          
          const noSK = item.SuratNo || item.suratNo || item.srt_no || item.cak_srt_no || "";
          
          // Debug SK number reading
          if (index === 0) {
            console.log("=== SK DEBUG ===");
            console.log("item.srt_no:", item.srt_no);
            console.log("item.suratNo:", item.suratNo);
            console.log("item.cak_srt_no:", item.cak_srt_no);
            console.log("Final noSK:", noSK);
          }

          // Extract nama mahasiswa and prodi from backend data
          let namaMahasiswa = item.NamaMahasiswa ||  // Primary field from backend DTO
                             item.namaMahasiswa || 
                             item.mhs_nama || 
                             item.nama_mahasiswa || 
                             "";

          let prodi = item.Prodi ||  // Primary field from backend DTO
                     item.prodi ||
                     item.kon_nama ||  // This is what your SQL returns
                     item.kon_singkatan || 
                     "";

          // Set defaults if empty
          if (!namaMahasiswa || namaMahasiswa === "") namaMahasiswa = "-";
          if (!prodi || prodi === "") prodi = "-";

          // Debug backend data for first item
          if (index === 0) {
            console.log("=== MAIN TABLE BACKEND DATA DEBUG ===");
            console.log("Backend NamaMahasiswa:", item.NamaMahasiswa);
            console.log("Backend Prodi:", item.Prodi);
            console.log("Backend SuratNo:", item.SuratNo);
            console.log("Final namaMahasiswa:", namaMahasiswa);
            console.log("Final prodi:", prodi);
            console.log("Available fields:", Object.keys(item));
          }

          // Base row data
          const rowData = {
            No: startIndex + index + 1, 
            id: item.cak_id || item.id || item.idDisplay, 
            "No Pengajuan": item.id || item.idDisplay || item.cak_id || "-", 
            "Tanggal Pengajuan": item.tanggal || item.cak_created_date || "-",
            "No SK": noSK || "-", 
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: prodi,
            "Disetujui Prodi": getProdiIcon(currentStatus, item),
            "Disetujui Wadir 1": getWadir1Icon(currentStatus),
            Status: currentStatus || "-",
          };

          // Add SK Cuti Akademik column ONLY for Admin role (positioned before Aksi)
          if (isAdmin || isDAAK) {
            rowData["SK Cuti Akademik"] = formatSKCutiAkademikColumn(noSK, item.cak_id || item.id);
            rowData.Aksi = actions; // Aksi comes after SK Cuti Akademik
            rowData.Alignment = Array(11).fill("center"); // 11 columns for Admin (added Nama Mahasiswa + Prodi)
          } else {
            rowData.Aksi = actions; // Aksi comes directly after Status for other roles
            rowData.Alignment = Array(10).fill("center"); // 10 columns for other roles (added Nama Mahasiswa + Prodi)
          }

          return rowData;
        });

        console.log("Formatted data:", formattedData);
        console.log(`Showing ${formattedData.length} items of ${totalPendingItems} total (page ${page})`);

        setDataCutiAkademik(formattedData);
        setTotalData(totalPendingItems); 
        setCurrentPage(page);
      } catch (err) {
        console.error("Error loading data:", err);
        Toast.error(`Gagal memuat data pengajuan: ${err.message}`);
        
        
        setDataCutiAkademik([]);
        setTotalData(0);
      } finally {
        setLoading(false);
      }
    },
    [fixedRole, isMahasiswa, isProdi, isWadir1, isFinance, isDAAK, isAdmin, userData, search]
  );

  const loadDataRiwayat = useCallback(
    async (page = 1) => {
      try {
        setLoadingRiwayat(true);
        console.log("=== LOADING RIWAYAT DATA ===");

        console.log("=== DEBUG LOAD RIWAYAT ===");
        console.log("Search Riwayat:", searchRiwayat);

        
        
        let statusForRiwayat = ""; 
        
        
        if (isProdi) {
          
          statusForRiwayat = "";
        } else if (isWadir1 || isFinance || isDAAK || isAdmin) {
          
          statusForRiwayat = "";
        }

        const params = new URLSearchParams();
        
        
        if (!isAdmin && userData?.username) {
          // For mahasiswa, use their ID from nama field (which contains NIM)
          const userIdentifier = isMahasiswa ? 
            (userData?.mhsId || userData?.nama || userData?.username) : 
            userData?.username;
          
          console.log("=== RIWAYAT USER IDENTIFIER ===");
          console.log("Is Mahasiswa:", isMahasiswa);
          console.log("userData.nama:", userData?.nama);
          console.log("userData.mhsId:", userData?.mhsId);
          console.log("userData.username:", userData?.username);
          console.log("Final userIdentifier:", userIdentifier);
          
          params.append('userId', userIdentifier);
        }
        if (statusForRiwayat) params.append('status', statusForRiwayat);
        // DON'T send search to backend - we'll filter in frontend
        // if (searchRiwayat) params.append('search', searchRiwayat);

        
        const url = `${API_LINK}CutiAkademik/riwayat?${params}`;
        console.log("Riwayat API URL:", url);

        // Add minimum loading time for better UX (but keep it fast - 200ms)
        const [response] = await Promise.all([
          fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }),
          new Promise(resolve => setTimeout(resolve, 250))
        ]);
        
        console.log("Riwayat Response Status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Riwayat API Error Response:", errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseText = await response.text();
        console.log("Riwayat Raw Response:", responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Riwayat JSON Parse Error:", parseError);
          throw new Error("Invalid JSON response from server");
        }

        console.log("Riwayat Parsed API Response:", data);

        
        let actualData = data;
        if (data && typeof data === 'object') {
          if (data.data && Array.isArray(data.data)) {
            actualData = data.data;
          } else if (data.items && Array.isArray(data.items)) {
            actualData = data.items;
          } else if (data.result && Array.isArray(data.result)) {
            actualData = data.result;
          } else if (!Array.isArray(data)) {
            const arrayProps = Object.keys(data).filter(key => Array.isArray(data[key]));
            if (arrayProps.length > 0) {
              actualData = data[arrayProps[0]];
            }
          }
        }

        if (!Array.isArray(actualData)) {
          console.log("Riwayat data is not array after processing");
          setDataRiwayat([]);
          setTotalDataRiwayat(0);
          return;
        }

        console.log("Processing riwayat array data:", actualData);

        
        
        const completedData = actualData.filter(item => {
          const currentStatus = item.status || item.cak_status || "";
          
          // For all roles (Prodi, Wadir1, Finance, DAAK, Admin), show only "Disetujui" status in Riwayat
          return currentStatus === "Disetujui";
        });

        console.log("Filtered completed data for riwayat:", completedData);

        
        // Process ALL data first (no pagination yet) - Optimized with fallback API calls
        const formattedDataPromises = completedData.map(async (item, index) => {
          // Debug: Log the first item to see available fields
          if (index === 0) {
            console.log("=== RIWAYAT ITEM STRUCTURE DEBUG ===");
            console.log("Available fields:", Object.keys(item));
            console.log("Sample item:", item);
          }

          // Use backend DTO field names (NamaMahasiswa and Prodi from your DTO)
          let namaMahasiswa = item.NamaMahasiswa ||  // Primary field from backend DTO
                             item.namaMahasiswa || 
                             item.mhs_nama || 
                             item.nama_mahasiswa || 
                             item.mahasiswaNama ||
                             item.mahasiswa ||
                             item.nama ||
                             item.name ||
                             "";

          // Use backend DTO field names (Prodi from your DTO)  
          let prodi = item.Prodi ||  // Primary field from backend DTO
                     item.prodi ||
                     item.kon_nama ||  // This is what your SQL returns
                     item.kon_singkatan || 
                     item.konsentrasi || 
                     item.konsentrasiSingkatan ||
                     item.programStudi || 
                     item.program_studi ||
                     item.prodiNama ||
                     "";

          // If nama mahasiswa or prodi is missing, fetch from detail API
          if (!namaMahasiswa || !prodi || namaMahasiswa === "" || prodi === "") {
            try {
              const detailUrl = `${API_LINK}CutiAkademik/detail?id=${item.id || item.cak_id}`;
              
              const detailResponse = await fetch(detailUrl, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              });
              
              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                
                // Extract nama mahasiswa if not found in main data
                if (!namaMahasiswa || namaMahasiswa === "") {
                  namaMahasiswa = detailData.mahasiswa ||           
                                 detailData.mhs_nama || 
                                 detailData.namaMahasiswa || 
                                 detailData.nama_mahasiswa || 
                                 detailData.mahasiswaNama ||
                                 detailData.nama ||
                                 detailData.name || "-";
                }
                
                // Extract prodi if not found in main data
                if (!prodi || prodi === "") {
                  prodi = detailData.konsentrasi ||                 
                         detailData.prodiNama ||                    
                         detailData.konsentrasiSingkatan ||         
                         detailData.kon_singkatan || 
                         detailData.prodi || 
                         detailData.programStudi || 
                         detailData.program_studi || 
                         detailData.jurusan || "-";
                }
              }
            } catch (error) {
              console.warn("Failed to fetch detail for", item.id, ":", error.message);
            }
          }

          // Set defaults if still empty
          if (!namaMahasiswa || namaMahasiswa === "") namaMahasiswa = "-";
          if (!prodi || prodi === "") prodi = "-";

          return {
            No: index + 1, // Temporary number, will be updated after pagination
            id: item.cak_id || item.id,
            "No Cuti Akademik": item.id || item.cak_id || "-",
            "Tanggal Pengajuan": item.tanggal || item.cak_created_date || "-",
            "Nomor SK": item.SuratNo || item.suratNo || item.srt_no || item.cak_srt_no || "-",
            NIM: item.mhsId || item.mhs_id || item.cak_mhs_id || "-",
            "Nama Mahasiswa": namaMahasiswa,
            Prodi: prodi,
            Aksi: ["Detail"],
            Alignment: Array(8).fill("center"),
          };
        });

        
        console.log("Processing data with fallback API calls if needed...");
        let allFormattedData = await Promise.all(formattedDataPromises);

        console.log("All formatted data ready:", allFormattedData.length);

        // FRONTEND SEARCH FILTERING - Search in ALL fields
        if (searchRiwayat && searchRiwayat.trim() !== "") {
          const searchTerm = searchRiwayat.toLowerCase().trim();
          console.log("=== FRONTEND SEARCH FILTERING ===");
          console.log("Search term:", searchTerm);
          console.log("Total data before search:", allFormattedData.length);
          
          allFormattedData = allFormattedData.filter(item => {
            // Search in all text fields - convert to string and handle null/undefined values
            const searchableFields = [
              String(item["No Cuti Akademik"] || ""),
              String(item["Tanggal Pengajuan"] || ""),
              String(item["Nomor SK"] || ""),
              String(item.NIM || ""),
              String(item["Nama Mahasiswa"] || ""),
              String(item.Prodi || "")
            ];
            
            // Join all fields and normalize for search
            const searchableText = searchableFields
              .join(" ")
              .toLowerCase()
              .replace(/\s+/g, " ") // Replace multiple spaces with single space
              .trim();
            
            // Check if search term exists in the combined text
            const isMatch = searchableText.includes(searchTerm);
            
            // Also check individual fields for exact matches
            const exactFieldMatch = searchableFields.some(field => 
              String(field).toLowerCase().includes(searchTerm)
            );
            
            const finalMatch = isMatch || exactFieldMatch;
            
            if (finalMatch) {
              console.log("Match found:", {
                noCuti: item["No Cuti Akademik"],
                nim: item.NIM,
                nama: item["Nama Mahasiswa"],
                prodi: item.Prodi,
                nomorSK: item["Nomor SK"],
                searchableText: searchableText.substring(0, 100) + "...",
                matchType: isMatch ? "combined" : "individual"
              });
            }
            
            return finalMatch;
          });
          
          console.log(`Search results: ${allFormattedData.length} items found out of original data`);
        }

        // FRONTEND PRODI FILTERING - Filter by selected prodi
        if (filterProdi && filterProdi.trim() !== "") {
          console.log("=== FRONTEND PRODI FILTERING ===");
          console.log("Filter prodi:", filterProdi);
          console.log("Total data before prodi filter:", allFormattedData.length);
          
          allFormattedData = allFormattedData.filter(item => {
            const itemProdi = String(item.Prodi || "").trim();
            const isMatch = itemProdi === filterProdi;
            
            if (isMatch) {
              console.log("Prodi match found:", {
                noCuti: item["No Cuti Akademik"],
                nama: item["Nama Mahasiswa"],
                prodi: itemProdi
              });
            }
            
            return isMatch;
          });
          
          console.log(`Prodi filter results: ${allFormattedData.length} items found`);
        }

        // FRONTEND SORTING - Apply sorting to filtered data
        if (sortBy && sortBy !== "") {
          console.log("=== FRONTEND SORTING ===");
          console.log("Sort by:", sortBy);
          
          allFormattedData.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
              case "tanggal_desc":
                valueA = new Date(a["Tanggal Pengajuan"] || "1900-01-01");
                valueB = new Date(b["Tanggal Pengajuan"] || "1900-01-01");
                return valueB - valueA; // Descending
                
              case "tanggal_asc":
                valueA = new Date(a["Tanggal Pengajuan"] || "1900-01-01");
                valueB = new Date(b["Tanggal Pengajuan"] || "1900-01-01");
                return valueA - valueB; // Ascending
                
              case "id_asc":
                valueA = String(a["No Cuti Akademik"] || "");
                valueB = String(b["No Cuti Akademik"] || "");
                return valueA.localeCompare(valueB); // Ascending
                
              case "id_desc":
                valueA = String(a["No Cuti Akademik"] || "");
                valueB = String(b["No Cuti Akademik"] || "");
                return valueB.localeCompare(valueA); // Descending
                
              default:
                return 0;
            }
          });
          
          console.log("Data sorted successfully");
        }

        // Apply pagination to filtered data
        const totalFilteredItems = allFormattedData.length;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedData = allFormattedData.slice(startIndex, endIndex);

        // Update row numbers for paginated data
        const finalData = paginatedData.map((item, index) => ({
          ...item,
          No: startIndex + index + 1
        }));

        console.log("Final paginated data:", finalData.length);
        console.log(`Showing ${finalData.length} items of ${totalFilteredItems} total (page ${page})`);

        setDataRiwayat(finalData);
        setTotalDataRiwayat(totalFilteredItems); 
        setCurrentPageRiwayat(page);
        setRiwayatLoaded(true); // Mark as loaded
      } catch (err) {
        console.error("Error loading riwayat:", err);
        Toast.error(`Gagal memuat data riwayat: ${err.message}`);
        
        
        setDataRiwayat([]);
        setTotalDataRiwayat(0);
      } finally {
        setLoadingRiwayat(false);
      }
    },
    [userData, searchRiwayat, sortBy, filterProdi, isProdi, isWadir1, isFinance, isDAAK, isAdmin, isMahasiswa, pageSize]
  );
  
  const handleAjukan = async (id) => {
    const confirm = await SweetAlert({
      title: "Ajukan Pengajuan",
      text: "Setelah diajukan, data tidak dapat diedit kembali. Ajukan sekarang?",
      icon: "warning",
      confirmText: "Ya, Ajukan!",
      confirmButtonColor: "#1e88e5",
    });

    if (!confirm) return;

    setLoading(true);

    try {
      
      const modifiedBy = userData?.nama || userData?.mhsId || userData?.userid || userData?.username || "";
      
      console.log("=== MODIFIED BY MAPPING ===");
      console.log("userData.nama:", userData?.nama);
      console.log("userData.mhsId:", userData?.mhsId);
      console.log("userData.username:", userData?.username);
      console.log("userData.userid:", userData?.userid);
      console.log("Final modifiedBy:", modifiedBy);
      
      if (!modifiedBy) {
        Toast.error("Data user tidak lengkap. Silakan login ulang.");
        return;
      }

      let payload, url;

      // Check if this is a prodi submission
      if (isProdi) {
        payload = {
          DraftId: id,
          ModifiedBy: modifiedBy,
          // Add timestamp to prevent duplicate key issues
          Timestamp: new Date().getTime()
        };
        url = `${API_LINK}CutiAkademik/prodi/generate-id`;
      } else {
        // Regular mahasiswa submission
        payload = {
          DraftId: id,
          ModifiedBy: modifiedBy,
          // Add timestamp to prevent duplicate key issues
          Timestamp: new Date().getTime()
        };
        url = `${API_LINK}CutiAkademik/generate-id`;
      }

      console.log("=== AJUKAN CUTI AKADEMIK ===");
      console.log("Is Prodi:", isProdi);
      console.log("Payload:", payload);
      console.log("URL:", url);
      console.log("UserData:", userData);

      const res = await fetch(url, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));

      const raw = await res.text();
      console.log("Raw response:", raw);
      
      if (!res.ok) {
        console.error("HTTP Error:", res.status, res.statusText);
        
        try {
          const errorData = JSON.parse(raw);
          let errorMsg = errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
          
          // Handle specific duplicate key error
          if (raw.includes("PRIMARY KEY constraint") || raw.includes("duplicate key")) {
            errorMsg = "ID pengajuan sudah ada. Sistem akan mencoba generate ID baru. Silakan coba lagi.";
            // Wait a moment and retry once
            setTimeout(() => {
              Toast.info("Mencoba generate ID baru...");
            }, 1000);
          } else if (raw.includes("SqlException")) {
            errorMsg = "Terjadi kesalahan database. Silakan coba lagi atau hubungi admin.";
          }
          
          Toast.error(`Gagal mengajukan: ${errorMsg}`);
        } catch {
          if (raw.includes("PRIMARY KEY constraint")) {
            Toast.error("ID pengajuan sudah ada. Silakan coba lagi dalam beberapa detik.");
          } else if (raw.includes("SqlException")) {
            Toast.error("Terjadi kesalahan database. Silakan coba lagi atau hubungi admin.");
          } else {
            Toast.error(`HTTP ${res.status}: ${res.statusText}`);
          }
        }
        return;
      }

      let result;
      try {
        result = JSON.parse(raw);
        console.log("Parsed result:", result);
      } catch (parseError) {
        console.error("JSON Parse error:", parseError);
        Toast.error("Response server tidak valid. Periksa console untuk detail.");
        return;
      }

      
      if (result?.finalId) {
        Toast.success(`Pengajuan berhasil diajukan dengan ID: ${result.finalId}`);
        // Clear session storage for prodi created apps
        if (isProdi) {
          const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedApps') || '[]');
          const updatedApps = prodiCreatedApps.filter(appId => appId !== id);
          sessionStorage.setItem('prodiCreatedApps', JSON.stringify(updatedApps));
        }
        loadData(1);
      } else {
        const errorMsg = result?.message || result?.error || "Gagal mengajukan pengajuan.";
        Toast.error(errorMsg);
      }
    } catch (err) {
      console.error("Ajukan catch error:", err);
      Toast.error(`Gagal mengajukan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  
  const handleSearch = useCallback(
    (query) => {
      console.log("Search query:", query);
      setSearch(query);
      setCurrentPage(1); 
      loadData(1);
    },
    [loadData]
  );

  const handleSearchRiwayat = useCallback(
    (query) => {
      setSearchRiwayat(query);
      setCurrentPageRiwayat(1); 
      loadDataRiwayat(1);
    },
    [loadDataRiwayat]
  );

  const handleFilterApply = useCallback(() => {
    setSortBy(sortRef.current.value);
    setSortStatus(statusRef.current.value);
    loadData(1);
    // Also reload riwayat data if it's visible to apply sorting
    if (showRiwayat) {
      loadDataRiwayat(1);
    }
  }, [loadData, loadDataRiwayat, showRiwayat]);

  const handleFilterApplyRiwayat = useCallback(() => {
    setSortBy(sortRef.current.value);
    setFilterProdi(prodiRef.current.value);
    loadDataRiwayat(1);
  }, [loadDataRiwayat]);

  const handleNavigation = useCallback(
    (page) => loadData(page),
    [loadData]
  );

  const handleNavigationRiwayat = useCallback(
    (page) => loadDataRiwayat(page),
    [loadDataRiwayat]
  );

  const handleAdd = () => {
    router.push("/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/add");
  };

  const handleDetail = (id) =>
    router.push(
      `/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/detail/${encryptIdUrl(
        id
      )}`
    );

  const handleEdit = (id) => {
    router.push(
      `/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/edit/${encryptIdUrl(id)}`
    );
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

    setLoading(true);

    try {
      
      const url = `${API_LINK}CutiAkademik/${id}`;

      const res = await fetch(url, { method: "DELETE" });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      
      if (data.message && data.message.includes("berhasil")) {
        Toast.success(data.message);
        loadData(1);
      } else {
        throw new Error(data.message || "Gagal menghapus pengajuan");
      }
    } catch (err) {
      console.error("Delete error:", err);
      Toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  
  const handleApprove = async (itemId) => {
    const confirm = await SweetAlert({
      title: "Setujui Pengajuan Cuti Akademik",
      text: "Yakin ingin menyetujui pengajuan cuti akademik ini?",
      icon: "question",
      showCancelButton: true,
      confirmText: "Ya, Setujui!",
      cancelText: "Batal",
      confirmButtonColor: "#28a745",
    });

    if (!confirm) return;

    setLoading(true);

    try {
      console.log("=== APPROVE PRODI ===");
      console.log("ID:", itemId);

      
      const menimbang = "Pengajuan cuti akademik telah memenuhi persyaratan dan disetujui oleh program studi.";
      const approvedBy = userData?.nama || userData?.username || userData?.userid || "";

      console.log("Menimbang:", menimbang);
      console.log("ApprovedBy:", approvedBy);

      
      const url = `${API_LINK}CutiAkademik/approve/prodi`;
      
      const payload = {
        id: itemId,
        menimbang: menimbang,
        approvedBy: approvedBy
      };

      console.log("Approve payload:", payload);

      const res = await fetch(url, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log("Approve response status:", res.status);

      const raw = await res.text();
      console.log("Approve raw response:", raw);

      if (!res.ok) {
        
        try {
          const errorData = JSON.parse(raw);
          const errorMsg = errorData.message || errorData.error || `HTTP ${res.status}`;
          Toast.error(`Gagal menyetujui: ${errorMsg}`);
        } catch {
          Toast.error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return;
      }

      
      let result;
      try {
        result = JSON.parse(raw);
        console.log("Approve result:", result);
      } catch {
        
        result = { message: "Pengajuan berhasil disetujui" };
      }

      
      Toast.success("Pengajuan cuti akademik berhasil disetujui!");
      loadData(1); 
      
    } catch (err) {
      console.error("Approve error:", err);
      Toast.error(`Gagal menyetujui: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (itemId) => {
    const confirm = await SweetAlert({
      title: "Tolak Pengajuan Cuti Akademik",
      text: "Yakin ingin menolak pengajuan cuti akademik ini?",
      icon: "warning",
      showCancelButton: true,
      confirmText: "Ya, Tolak!",
      cancelText: "Batal",
      confirmButtonColor: "#dc3545",
    });

    if (!confirm) return;

    setLoading(true);

    try {
      console.log("=== REJECT CUTI AKADEMIK ===");
      console.log("Item ID:", itemId);
      console.log("User Role:", fixedRole);

      // Auto-generate rejection reason based on role
      let autoReason = "";
      let backendRole = "";
      
      if (isProdi) {
        autoReason = "Ditolak oleh Program Studi";
        backendRole = "prodi";
      } else if (isWadir1) {
        autoReason = "Ditolak oleh Wakil Direktur 1";
        backendRole = "wadir1";
      } else if (isFinance) {
        autoReason = "Ditolak oleh Bagian Keuangan";
        backendRole = "finance";
      } else {
        autoReason = "Pengajuan ditolak";
        backendRole = "prodi"; // default
      }

      console.log("Auto Reason:", autoReason);
      console.log("Backend Role:", backendRole);

      const payload = {
        id: itemId,
        role: backendRole,
        keterangan: autoReason
      };

      console.log("Reject payload:", payload);

      const url = `${API_LINK}CutiAkademik/reject`;
      console.log("API URL:", url);

      const res = await fetch(url, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log("Reject response status:", res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error Response:", errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          const errorMsg = errorData.message || errorData.error || errorData.details || `HTTP ${res.status}: ${res.statusText}`;
          Toast.error(`Gagal menolak pengajuan: ${errorMsg}`);
        } catch (parseError) {
          Toast.error(`Gagal menolak pengajuan: HTTP ${res.status}\n\n${errorText}`);
        }
        return;
      }

      // Read response as text first, then parse as JSON
      const raw = await res.text();
      console.log("Reject raw response:", raw);

      let result;
      try {
        result = JSON.parse(raw);
        console.log("Reject Result:", result);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        Toast.error("Response server tidak valid:\n\n" + raw);
        return;
      }

      if (result?.message && result.message.includes("berhasil")) {
        Toast.success(result.message);
        loadData(1); // Reload data
        if (showRiwayat) loadDataRiwayat(1); // Reload riwayat if visible
      } else {
        throw new Error(result?.message || "Gagal menolak pengajuan");
      } 
      
    } catch (err) {
      console.error("Reject error:", err);
      Toast.error(`Gagal menolak: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (id) => {
    router.push(
      `/pages/Page_Administrasi_Pengajuan_Cuti_Akademik/upload/${encryptIdUrl(
        id
      )}`
    );
  };

  const handlePrint = (id) => {
    
    window.open(`${API_LINK}CutiAkademik/file/${id}`, "_blank");
  };

  const handleDownloadSK = (id) => {
    // Download SK file using the file endpoint
    window.open(`${API_LINK}CutiAkademik/file/${id}`, "_blank");
  };

  
  useEffect(() => {
    if (!ssoData) {
      Toast.error("Sesi habis. Silakan login kembali.");
      router.push("/auth/login");
      return;
    }

    if (!userData) return;



    
    loadData(1);
    
    // Load Riwayat data immediately for eligible roles (optimized for faster loading)
    if (isProdi || isWadir1 || isFinance || isDAAK || isAdmin) {
      setShowRiwayat(true);
      // Load Riwayat data in parallel for faster performance
      setTimeout(() => loadDataRiwayat(1), 50); // Small delay to prevent blocking main data
    }
  }, [ssoData, userData, loadData, loadDataRiwayat, isProdi, isWadir1, isFinance, isDAAK, isAdmin, router]);

  const filterContent = (
    <>
      <DropDown
        ref={sortRef}
        arrData={dataFilterSort}
        type="pilih"
        label="Urutkan"
        forInput="sortBy"
        defaultValue={sortBy}
      />
      <DropDown
        ref={statusRef}
        arrData={dataFilterStatus}
        type="pilih"
        label="Status"
        forInput="sortStatus"
        defaultValue={sortStatus}
      />
    </>
  );

  const filterContentRiwayat = (
    <>
      <DropDown
        ref={sortRef}
        arrData={dataFilterSort}
        type="pilih"
        label="Urutkan"
        forInput="sortBy"
        defaultValue={sortBy}
      />
      <DropDown
        ref={prodiRef}
        arrData={dataFilterProdi}
        type="pilih"
        label="Prodi"
        forInput="filterProdi"
        defaultValue={filterProdi}
      />
    </>
  );

  return (
    <MainContent
      layout="Admin"
      loading={loading}
      title="Daftar Pengajuan Cuti Akademik"
      breadcrumb={[
        { label: "Sistem Informasi Akademik" },
        { label: "Administrasi Akademik" },
        { label: "Cuti Akademik" },
      ]}
    >




      
      <div className="mb-4">
        <h5>Daftar Pengajuan Cuti Akademik</h5>
        
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div></div>
          {(isMahasiswa || isProdi) && (
            <Button
              classType="primary"
              label={isProdi ? "Ajukan Cuti untuk Mahasiswa" : "Ajukan Cuti Akademik"}
              onClick={handleAdd}
            />
          )}
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Memuat data pengajuan...</p>
          </div>
        ) : dataCutiAkademik.length > 0 ? (
          <>
            <Table
              data={dataCutiAkademik}
              onDetail={handleDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAjukan={handleAjukan}
              onApprove={handleApprove}
              onReject={handleReject}
              onUpload={handleUpload}
              onPrint={handlePrint}
              onDownloadSK={handleDownloadSK}
            />

            {totalData > 0 && (
              <Paging
                pageSize={pageSize}
                pageCurrent={currentPage}
                totalData={totalData}
                navigation={handleNavigation}
              />
            )}
          </>
        ) : (
          <div className="text-center py-5">
            <div className="mb-3">
              <i className="fas fa-inbox fa-3x text-muted"></i>
            </div>
            <h5 className="text-muted">Tidak ada data pengajuan</h5>
            <p className="text-muted">
              {isMahasiswa 
                ? "Anda belum memiliki pengajuan cuti akademik. Klik tombol 'Ajukan Cuti Akademik' untuk membuat pengajuan baru."
                : isProdi
                ? "Tidak ada pengajuan cuti akademik. Anda dapat membuat pengajuan untuk mahasiswa dengan klik tombol 'Ajukan Cuti untuk Mahasiswa'."
                : "Tidak ada pengajuan cuti akademik yang perlu ditinjau saat ini."
              }
            </p>
          </div>
        )}
      </div>

      
      {showRiwayat && (
        <div className="mt-5">
          <h5>Daftar Riwayat Cuti Akademik</h5>
          
          <Formsearch
            onSearch={handleSearchRiwayat}
            onFilter={handleFilterApplyRiwayat}
            onExport={() => {
              // Build export URL with current search parameter
              const params = new URLSearchParams();
              if (searchRiwayat && searchRiwayat.trim() !== "") {
                params.append('search', searchRiwayat.trim());
              }
              if (!isAdmin && userData?.username) {
                const userIdentifier = isMahasiswa ? 
                  (userData?.mhsId || userData?.nama || userData?.username) : 
                  userData?.username;
                params.append('userId', userIdentifier);
              }
              
              const exportUrl = `${API_LINK}CutiAkademik/riwayat/excel${params.toString() ? '?' + params.toString() : ''}`;
              console.log("Export URL:", exportUrl);
              window.open(exportUrl, "_blank");
            }}
            searchPlaceholder="Cari No. Pengajuan, NIM, Nama, atau Prodi"
            showAddButton={false}
            showFilterButton={true}
            showExportButton={true}
            exportButtonText="Unduh Excel"
            filterContent={filterContentRiwayat}
          />

          {loadingRiwayat ? (
            <div className="text-center py-4">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Memuat data riwayat...</p>
            </div>
          ) : dataRiwayat.length > 0 ? (
            <>
              <Table
                data={dataRiwayat}
                onDetail={handleDetail}
                onPrint={handlePrint}
              />

              {totalDataRiwayat > 0 && (
                <Paging
                  pageSize={pageSize}
                  pageCurrent={currentPageRiwayat}
                  totalData={totalDataRiwayat}
                  navigation={handleNavigationRiwayat}
                />
              )}
            </>
          ) : (
            <div className="text-center py-5">
              <div className="mb-3">
                <i className="fas fa-history fa-3x text-muted"></i>
              </div>
              <h5 className="text-muted">Tidak ada data riwayat</h5>
              <p className="text-muted">Belum ada riwayat cuti akademik yang tersedia.</p>
            </div>
          )}
        </div>
      )}
    </MainContent>
  );
}
