"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import MainContent from "@/components/layout/MainContent";
import Formsearch from "@/components/common/Formsearch";
import Table from "@/components/common/Table";
import Paging from "@/components/common/Paging";
import DropDown from "@/components/common/Dropdown";
import Toast from "@/components/common/Toast";
import Button from "@/components/common/Button";
import { getUserData, getSSOData } from "@/context/user";
import { useRouter } from "next/navigation";
import { API_LINK } from "@/lib/constant";
import { encryptIdUrl } from "@/lib/encryptor";
import SweetAlert from "@/components/common/SweetAlert";

export default function Page_MeninggalDunia() {
    const ssoData = useMemo(() => getSSOData(), []);
    const userData = useMemo(() => getUserData(), []);
    const router = useRouter();
    
    const [permission, setPermission] = useState(null);

    useEffect(() => {
        const loadPermission = async () => {
            try {
                console.log("=== LOADING PERMISSION DEBUG ===");
                console.log("userData:", userData);
                console.log("userData?.username:", userData?.username);
                console.log("userData?.roleId:", userData?.roleId);
                
                const payload = {
                    username: userData?.username || "",
                    appId: "SIA",
                    roleId: userData?.roleId || ""
                };

                console.log("Permission payload:", payload);

                const res = await fetch(`${API_LINK}Auth/getpermission`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                console.log("Permission response status:", res.status);
                
                const data = await res.json();
                console.log("PERMISSION LOADED =", data);
                
                if (data?.errorMessage === "") {
                    console.log("Permission loaded successfully");
                    setPermission(data);
                } else {
                    console.error("Permission loading failed:", data.errorMessage || data.message);
                    setPermission(null);
                }
            } catch (err) {
                console.error("Gagal load permission:", err);
                setPermission(null);
            }
        };

        if (userData?.username) {
            console.log("Loading permission for user:", userData.username);
            loadPermission();
        } else {
            console.log("No username found, skipping permission load");
        }
    }, [userData]);

    // ============= ROLE DETECTION =============
    let fixedRole = (userData?.role || "").toUpperCase();
    
    if (permission?.roleName) {
        fixedRole = permission.roleName.toUpperCase();
    }
    
    // Additional role detection for specific cases
    if (userData?.nama && userData.nama.toLowerCase().includes('prodi')) {
        fixedRole = "NDA_PRODI";
    }
    
    // Use roleId for accurate role detection
    if (userData?.roleId) {
        console.log("Checking roleId:", userData.roleId);
        if (userData.roleId === "ROL01") {
            fixedRole = "ROL01"; // Wadir1
            console.log("ROL01 detected - Wadir1 role");
        }
        else if (userData.roleId === "ROL08") {
            fixedRole = "ROL08"; // Finance
            console.log("ROL08 detected - Finance role");
        }
        else if (userData.roleId === "ROL21") {
            fixedRole = "ROL21"; // DAAK
            console.log("ROL21 detected - DAAK role");
        }
        else if (userData.roleId === "ROL22") {
            fixedRole = "ROL22"; // Prodi
            console.log("ROL22 detected - Prodi role");
        }
        else if (userData.roleId === "ROL23") {
            fixedRole = "ROL23"; // Mahasiswa
            console.log("ROL23 detected - Mahasiswa role");
        }
    }
    
    const isMahasiswa = fixedRole === "ROL23" || fixedRole === "MAHASISWA";
    const isProdi = fixedRole === "ROL22" || fixedRole === "PRODI" || fixedRole === "NDA-PRODI" || fixedRole === "NDA_PRODI" || 
                    fixedRole === "KARYAWAN" && (userData?.nama && userData.nama.toLowerCase().includes('prodi'));
    const isWadir1 = fixedRole === "ROL01" || fixedRole === "WADIR1";
    const isFinance = fixedRole === "ROL08" || fixedRole === "FINANCE" || fixedRole === "USER-FINANCE" || fixedRole === "USER_FINANCE" || 
                      (userData?.nama && userData.nama.toLowerCase().includes('finance'));
    const isDAAK = fixedRole === "ROL21" || fixedRole === "DAAK";
    
    // Debug role detection
    console.log("=== MENINGGAL DUNIA ROLE DETECTION DEBUG ===");
    console.log("userData?.role:", userData?.role);
    console.log("userData?.roleId:", userData?.roleId);
    console.log("userData?.nama:", userData?.nama);
    console.log("permission?.roleName:", permission?.roleName);
    console.log("fixedRole:", fixedRole);
    console.log("Is Mahasiswa:", isMahasiswa);
    console.log("Is Prodi:", isProdi);
    console.log("Is Wadir1:", isWadir1);
    console.log("Is Finance:", isFinance);
    console.log("Is DAAK:", isDAAK);
    
    // Admin should NOT include Finance, Wadir1, or Prodi users who have specific workflows
    const isAdmin = (fixedRole === "ADMIN" || fixedRole === "ADMIN SIA" || 
                    (fixedRole === "KARYAWAN" && !isFinance && !isWadir1 && !isProdi) ||
                    isDAAK);

    console.log("Is Admin:", isAdmin);


    // ============================================================
    // ================      TABLE 1 : PENGAJUAN      =============
    // ============================================================

    const [dataPengajuan, setDataPengajuan] = useState([]);
    const [loadingPengajuan, setLoadingPengajuan] = useState(true);
    const [pengajuanPage, setPengajuanPage] = useState(1);
    const [pengajuanTotalData, setPengajuanTotalData] = useState(0);
    const pengajuanPageSize = 10;
    const [search, setSearch] = useState("");

    const loadPengajuan = useCallback(
        async (page = 1) => {
            try {
                setLoadingPengajuan(true);

                console.log("=== DEBUG LOAD MENINGGAL DUNIA DATA ===");
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
                        setDataPengajuan([]);
                        setPengajuanTotalData(0);
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
                    backendRole = "ROL21"; // DAAK
                } else if (isProdi) {
                    backendRole = "ROL22"; // Prodi
                } else if (isWadir1) {
                    backendRole = "ROL01"; // Wadir1
                } else if (isFinance) {
                    backendRole = "ROL08"; // Finance
                }

                console.log("API Parameters:", { mhsId, statusFilter, userId, role: backendRole, search });

                const params = new URLSearchParams();
                
                if (isMahasiswa) {
                    params.append('mhsId', mhsId);
                    console.log("MAHASISWA FILTER - Using exact mhsId:", mhsId);
                } else {
                    params.append('mhsId', mhsId || '%');
                }
                
                if (statusFilter) params.append('status', statusFilter);
                if (userId) params.append('userId', userId);
                if (backendRole) params.append('role', backendRole);
                if (search) params.append('search', search);
                params.append('pageNumber', page);
                params.append('pageSize', pengajuanPageSize);

                const url = `${API_LINK}MeninggalDunia/GetAll?${params}`;
                console.log("API URL:", url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
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

                // Handle different response structures
                let actualData = data;
                if (data && typeof data === 'object') {
                    if (data.data && Array.isArray(data.data)) {
                        actualData = data.data;
                    } else if (data.items && Array.isArray(data.items)) {
                        actualData = data.items;
                    } else if (data.result && Array.isArray(data.result)) {
                        actualData = data.result;
                    } else if (!Array.isArray(data)) {
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
                    setDataPengajuan([]);
                    setPengajuanTotalData(0);
                    return;
                }

                console.log("Processing array data:", actualData);

                // Frontend filtering for role-specific data
                const filteredData = actualData.filter((item, filterIndex) => {
                    const currentStatus = item.status || item.mdu_status || "";
                    
                    // Debug logging for first item
                    if (filterIndex === 0) {
                        console.log("=== SAMPLE ITEM DEBUG ===");
                        console.log("Item keys:", Object.keys(item));
                        console.log("tanggalPengajuan:", item.tanggalPengajuan);
                        console.log("noPengajuan:", item.noPengajuan);
                        console.log("nomorSK:", item.nomorSK);
                        console.log("status:", item.status);
                        console.log("currentStatus:", currentStatus);
                    }
                    
                    if (isMahasiswa) {
                        if (currentStatus === "Draft") {
                            return true; 
                        }
                        return false; 
                    } else if (isProdi) {
                        // For Prodi users, show:
                        // 1. Draft applications created by Prodi
                        // 2. Applications waiting for Prodi approval ("Belum Disetujui Prodi")
                        
                        const createdByProdi = item.mdu_created_by && 
                            (item.mdu_created_by.toLowerCase().includes('prodi') ||
                             item.mdu_created_by === userData?.username ||
                             item.mdu_created_by === userData?.nama);
                        
                        // Also check session storage for prodi-created applications
                        const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedMeninggalApps') || '[]');
                        const isProdiCreatedFromSession = prodiCreatedApps.includes(item.mdu_id || item.id);
                        
                        const isCreatedByProdi = createdByProdi || isProdiCreatedFromSession;
                        
                        // Show if:
                        // 1. Draft created by Prodi, OR
                        // 2. Status is "Belum Disetujui Prodi"
                        if ((currentStatus === "Draft" && isCreatedByProdi) || 
                            currentStatus === "Belum Disetujui Prodi") {
                            return true;
                        }
                        
                        return false;
                    } else {
                        // For other roles, exclude completed applications
                        if (currentStatus === "Disetujui") {
                            return false;
                        }
                        return true;
                    }
                });

                console.log("Filtered data:", filteredData);

                // Apply pagination to filtered data
                const totalFilteredItems = filteredData.length;
                const startIndex = (page - 1) * pengajuanPageSize;
                const endIndex = startIndex + pengajuanPageSize;
                const paginatedData = filteredData.slice(startIndex, endIndex);

                const formattedData = paginatedData.map((item, index) => {
                    const isDraft = item.status === "Draft" || item.id === "DRAFT" || !item.id?.includes("MDU");

                    let actions = ["Detail"];
                    
                    const currentStatus = item.status || item.mdu_status || "";
                    const hasUploadedSK = item.srt_no || item.suratNo || item.mdu_srt_no;
                    
                    if (isMahasiswa) {
                        const createdByProdi = item.mdu_created_by && 
                            (item.mdu_created_by.toLowerCase().includes('prodi') ||
                             item.mdu_created_by === userData?.username ||
                             item.mdu_created_by === userData?.nama);
                        
                        const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedMeninggalApps') || '[]');
                        const isProdiCreatedFromSession = prodiCreatedApps.includes(item.mdu_id || item.id);
                        
                        const isCreatedByProdi = createdByProdi || isProdiCreatedFromSession;
                        
                        if (isDraft && !isCreatedByProdi) {
                            actions = ["Detail", "Edit", "Delete", "Ajukan"];
                        } else {
                            actions = ["Detail"];
                        }
                    } else if (isProdi) {
                        const createdByProdi = item.mdu_created_by && 
                            (item.mdu_created_by.toLowerCase().includes('prodi') || 
                             item.mdu_created_by === userData?.username ||
                             item.mdu_created_by === userData?.nama);
                        
                        const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedMeninggalApps') || '[]');
                        const isProdiCreatedFromSession = prodiCreatedApps.includes(item.mdu_id || item.id);
                        
                        const isCreatedByProdi = createdByProdi || isProdiCreatedFromSession;
                        
                        if (isDraft && isCreatedByProdi) {
                            actions = ["Detail", "Edit", "Delete", "Ajukan"];
                        } else if (currentStatus === "Belum Disetujui Prodi" && !isCreatedByProdi) {
                            actions = ["Detail", "Approve", "Reject"];
                        } else {
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
                        const isAllApprovalsComplete = currentStatus && 
                            !currentStatus.includes("Belum Disetujui Prodi") && 
                            !currentStatus.includes("Belum Disetujui Wadir 1") && 
                            !currentStatus.includes("Belum Disetujui Finance") &&
                            !currentStatus.includes("Draft") &&
                            !currentStatus.includes("Ditolak");
                            
                        const isReadyForSK = currentStatus === "Menunggu Upload SK" || 
                                           currentStatus === "Disetujui" ||
                                           isAllApprovalsComplete;
                        
                        if (isReadyForSK) {
                            if (hasUploadedSK) {
                                actions = ["Detail", "DownloadSK"];
                            } else {
                                actions = ["Detail", "UploadSK"];
                            }
                        } else {
                            actions = ["Detail"];
                        }
                    }

                    return {
                        No: startIndex + index + 1,
                        id: item.mdu_id || item.id || item.idDisplay,
                        "No Pengajuan": item.noPengajuan || item.id || item.idDisplay || item.mdu_id || "-",
                        "Tanggal Pengajuan": item.tanggalPengajuan || item.tanggal || item.mdu_created_date || "-",
                        "No SK": item.nomorSK || item.srt_no || item.suratNo || item.mdu_srt_no || "-",
                        Status: currentStatus || "-",
                        Aksi: actions,
                        Alignment: Array(6).fill("center"),
                    };
                });

                console.log("Formatted data:", formattedData);
                console.log(`Showing ${formattedData.length} items of ${totalFilteredItems} total (page ${page})`);

                setDataPengajuan(formattedData);
                setPengajuanTotalData(totalFilteredItems);
                setPengajuanPage(page);
            } catch (err) {
                console.error("Error loading data:", err);
                Toast.error(`Gagal memuat data pengajuan: ${err.message}`);
                setDataPengajuan([]);
                setPengajuanTotalData(0);
            } finally {
                setLoadingPengajuan(false);
            }
        },
        [fixedRole, isMahasiswa, isProdi, isWadir1, isFinance, isDAAK, isAdmin, userData, search]
    );

    // ============================================================
    // =================== TABLE 2 : RIWAYAT =======================
    // ============================================================

    const [dataRiwayat, setDataRiwayat] = useState([]);
    const [loadingRiwayat, setLoadingRiwayat] = useState(true);
    const [riwayatPage, setRiwayatPage] = useState(1);
    const [riwayatTotal, setRiwayatTotal] = useState(0);
    const riwayatPageSize = 10;
    const [riwayatSearch, setRiwayatSearch] = useState("");
    const [filterSort, setFilterSort] = useState("mdu_created_date desc");
    const [filterProdi, setFilterProdi] = useState("");

    const sortRef = useRef();
    const prodiRef = useRef();

    const dataFilterProdi = [
        { Value: "", Text: "— Semua —" },
        { Value: "MI", Text: "MI" },
        { Value: "SI", Text: "SI" },
        { Value: "TPM", Text: "TPM" },
        { Value: "TRPAB", Text: "TRPAB" },
        { Value: "MK", Text: "MK" },
    ];

    const loadRiwayat = useCallback(
        async (page = 1, keyword = riwayatSearch, sort = filterSort, prodi = filterProdi) => {
            try {
                setLoadingRiwayat(true);
                console.log("=== LOADING RIWAYAT MENINGGAL DUNIA ===");

                let statusForRiwayat = ""; 
                
                if (isProdi) {
                    statusForRiwayat = "";
                } else if (isWadir1 || isFinance || isDAAK || isAdmin) {
                    statusForRiwayat = "";
                }

                const params = new URLSearchParams();
                
                if (!isAdmin && userData?.username) {
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
                if (keyword && keyword.trim() !== "") params.append('keyword', keyword.trim());
                if (prodi && prodi.trim() !== "") params.append('konsentrasi', prodi.trim());
                if (sort) params.append('sort', sort);
                params.append('pageNumber', page);
                params.append('pageSize', riwayatPageSize);

                const url = `${API_LINK}MeninggalDunia/Riwayat?${params}`;
                console.log("Riwayat API URL:", url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
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
                    setRiwayatTotal(0);
                    return;
                }

                console.log("Processing riwayat array data:", actualData);

                // Filter completed data for riwayat
                const completedData = actualData.filter(item => {
                    const currentStatus = item.status || item.mdu_status || "";
                    
                    const pendingStatuses = [
                        "Draft",
                        "Belum Disetujui Prodi", 
                        "Belum Disetujui Wadir 1",
                        "Belum Disetujui Finance",
                        "Menunggu Upload SK"
                    ];
                    
                    return !pendingStatuses.includes(currentStatus) && currentStatus !== "";
                });

                console.log("Filtered completed data for riwayat:", completedData);

                // Apply pagination to filtered data
                const totalCompletedItems = completedData.length;
                const startIndex = (page - 1) * riwayatPageSize;
                const endIndex = startIndex + riwayatPageSize;
                const paginatedData = completedData.slice(startIndex, endIndex);

                const formattedData = paginatedData.map((item, index) => ({
                    No: startIndex + index + 1,
                    id: item.mdu_id || item.id,
                    "No Pengajuan": item.noPengajuan || item.id || item.mdu_id || "-",
                    "Tanggal Pengajuan": item.tanggalPengajuan || item.tanggal || item.mdu_created_date || "-",
                    "Nama Mahasiswa": item.namaMahasiswa || item.mhs_nama || "-",
                    Prodi: item.prodi || item.konsentrasi || "-",
                    "Nomor SK": item.nomorSK || item.srt_no || item.mdu_srt_no || "-",
                    Status: item.status || item.mdu_status || "-",
                    Aksi: ["Detail"],
                    Alignment: Array(8).fill("center"),
                }));

                console.log("Final riwayat data:", formattedData);
                console.log(`Showing ${formattedData.length} items of ${totalCompletedItems} total (page ${page})`);

                setDataRiwayat(formattedData);
                setRiwayatTotal(totalCompletedItems);
                setRiwayatPage(page);

            } catch (err) {
                console.error("Error loading riwayat:", err);
                Toast.error(`Gagal memuat data riwayat: ${err.message}`);
                setDataRiwayat([]);
                setRiwayatTotal(0);
            } finally {
                setLoadingRiwayat(false);
            }
        },
        [userData, riwayatSearch, filterSort, filterProdi, isProdi, isWadir1, isFinance, isDAAK, isAdmin, isMahasiswa, riwayatPageSize]
    );


    // State for SK upload modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedMeninggalId, setSelectedMeninggalId] = useState(null);
    const [selectedSKFile, setSelectedSKFile] = useState(null);
    const [selectedSPKBFile, setSelectedSPKBFile] = useState(null);
    const [skFilePreview, setSKFilePreview] = useState(null);
    const [spkbFilePreview, setSPKBFilePreview] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);

    // SK Upload handlers
    const handleUploadSK = (id) => {
        console.log("Opening upload modal for ID:", id);
        setSelectedMeninggalId(id);
        setShowUploadModal(true);
        setSelectedSKFile(null);
        setSelectedSPKBFile(null);
        setSKFilePreview(null);
        setSPKBFilePreview(null);
    };

    const handleSKFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            Toast.error("Format file tidak didukung. Gunakan PDF, DOC, DOCX, JPG, JPEG, atau PNG.");
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            Toast.error("Ukuran file maksimal 10MB.");
            return;
        }

        setSelectedSKFile(file);
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setSKFilePreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setSKFilePreview(null);
        }
    };

    const handleSPKBFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            Toast.error("Format file tidak didukung. Gunakan PDF, DOC, DOCX, JPG, JPEG, atau PNG.");
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            Toast.error("Ukuran file maksimal 10MB.");
            return;
        }

        setSelectedSPKBFile(file);
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setSPKBFilePreview(e.target.result);
            reader.readAsDataURL(file);
        } else {
            setSPKBFilePreview(null);
        }
    };

    const handleUploadConfirm = async () => {
        if (!selectedSKFile || !selectedMeninggalId) {
            Toast.error("Pilih file SK terlebih dahulu.");
            return;
        }

        setUploadLoading(true);

        try {
            const formData = new FormData();
            formData.append('SkFile', selectedSKFile);
            if (selectedSPKBFile) {
                formData.append('SpkbFile', selectedSPKBFile);
            }

            console.log("=== SK UPLOAD MENINGGAL DUNIA ===");
            console.log("ID:", selectedMeninggalId);
            console.log("SK File:", selectedSKFile.name);
            console.log("SPKB File:", selectedSPKBFile?.name || "None");

            const response = await fetch(`${API_LINK}MeninggalDunia/${selectedMeninggalId}/upload-sk`, {
                method: 'POST',
                body: formData
            });

            console.log("Upload response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Upload error:", errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Upload result:", result);

            Toast.success("SK berhasil diupload!");
            setShowUploadModal(false);
            setSelectedSKFile(null);
            setSelectedSPKBFile(null);
            setSKFilePreview(null);
            setSPKBFilePreview(null);
            setSelectedMeninggalId(null);
            
            // Reload data to reflect changes
            loadPengajuan(pengajuanPage);
            if (isProdi || isWadir1 || isFinance || isDAAK || isAdmin) {
                loadRiwayat(riwayatPage);
            }

        } catch (error) {
            console.error("Upload error:", error);
            Toast.error(`Gagal upload SK: ${error.message}`);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleUploadCancel = () => {
        setShowUploadModal(false);
        setSelectedSKFile(null);
        setSelectedSPKBFile(null);
        setSKFilePreview(null);
        setSPKBFilePreview(null);
        setSelectedMeninggalId(null);
    };

    const handleDownloadSK = (id) => {
        // Download SK file using the file endpoint
        window.open(`${API_LINK}MeninggalDunia/report/${id}`, "_blank");
    };

    const handleAjukan = async (id) => {
        const confirm = await SweetAlert({
            title: "Ajukan Pengajuan Meninggal Dunia",
            text: "Setelah diajukan, data tidak dapat diedit kembali. Ajukan sekarang?",
            icon: "warning",
            confirmText: "Ya, Ajukan!",
            confirmButtonColor: "#1e88e5",
        });

        if (!confirm) return;

        setLoadingPengajuan(true);

        try {
            console.log("=== AJUKAN MENINGGAL DUNIA ===");
            console.log("Draft ID:", id);

            const url = `${API_LINK}MeninggalDunia/finalize/${id}`;
            console.log("Finalize URL:", url);

            const res = await fetch(url, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });

            console.log("Finalize response status:", res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error("API Error Response:", errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    const errorMsg = errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
                    Toast.error(`Gagal mengajukan: ${errorMsg}`);
                } catch {
                    Toast.error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return;
            }

            const raw = await res.text();
            console.log("Finalize raw response:", raw);

            let result;
            try {
                result = JSON.parse(raw);
                console.log("Finalize result:", result);
            } catch (parseError) {
                console.error("JSON Parse error:", parseError);
                Toast.error("Response server tidak valid. Periksa console untuk detail.");
                return;
            }

            if (result?.officialId) {
                Toast.success(`Pengajuan berhasil diajukan dengan ID: ${result.officialId}`);
                
                // Clear session storage for prodi created apps
                if (isProdi) {
                    const prodiCreatedApps = JSON.parse(sessionStorage.getItem('prodiCreatedMeninggalApps') || '[]');
                    const updatedApps = prodiCreatedApps.filter(appId => appId !== id);
                    sessionStorage.setItem('prodiCreatedMeninggalApps', JSON.stringify(updatedApps));
                }
                
                loadPengajuan(1);
            } else {
                const errorMsg = result?.message || result?.error || "Gagal mengajukan pengajuan.";
                Toast.error(errorMsg);
            }
        } catch (err) {
            console.error("Ajukan error:", err);
            Toast.error(`Gagal mengajukan: ${err.message}`);
        } finally {
            setLoadingPengajuan(false);
        }
    };

    const handleSearch = useCallback(
        (query) => {
            console.log("Search query:", query);
            setSearch(query);
            setPengajuanPage(1); 
            loadPengajuan(1);
        },
        [loadPengajuan]
    );

    const handleAdd = () => {
        router.push("/pages/Page_Administrasi_Pengajuan_Meninggal_Dunia/add");
    };

    const handleDetail = (id) =>
        router.push(
            `/pages/Page_Administrasi_Pengajuan_Meninggal_Dunia/detail/${encryptIdUrl(id)}`
        );

    const handleEdit = (id) => {
        router.push(
            `/pages/Page_Administrasi_Pengajuan_Meninggal_Dunia/edit/${encryptIdUrl(id)}`
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

        setLoadingPengajuan(true);

        try {
            const url = `${API_LINK}MeninggalDunia/${id}`;
            const res = await fetch(url, { method: "DELETE" });
            
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();

            if (data.message && data.message.includes("berhasil")) {
                Toast.success(data.message);
                loadPengajuan(1);
            } else {
                throw new Error(data.message || "Gagal menghapus pengajuan");
            }
        } catch (err) {
            console.error("Delete error:", err);
            Toast.error(err.message);
        } finally {
            setLoadingPengajuan(false);
        }
    };

    const handleApprove = async (itemId) => {
        const confirm = await SweetAlert({
            title: "Setujui Pengajuan Meninggal Dunia",
            text: "Yakin ingin menyetujui pengajuan meninggal dunia ini?",
            icon: "question",
            showCancelButton: true,
            confirmText: "Ya, Setujui!",
            cancelText: "Batal",
            confirmButtonColor: "#28a745",
        });

        if (!confirm) return;

        setLoadingPengajuan(true);

        try {
            console.log("=== APPROVE MENINGGAL DUNIA ===");
            console.log("ID:", itemId);

            const approvedBy = userData?.nama || userData?.username || userData?.userid || "";
            
            let url, payload;
            
            if (isProdi) {
                url = `${API_LINK}MeninggalDunia/approve/${itemId}`;
                payload = {
                    approvedBy: approvedBy,
                    role: "prodi"
                };
            } else if (isWadir1) {
                url = `${API_LINK}MeninggalDunia/approve/${itemId}`;
                payload = {
                    approvedBy: approvedBy,
                    role: "wadir1"
                };
            } else if (isFinance) {
                url = `${API_LINK}MeninggalDunia/approve/${itemId}`;
                payload = {
                    approvedBy: approvedBy,
                    role: "finance"
                };
            }

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

            if (!res.ok) {
                const errorText = await res.text();
                console.error("API Error Response:", errorText);
                
                try {
                    const errorData = JSON.parse(errorText);
                    const errorMsg = errorData.message || errorData.error || `HTTP ${res.status}`;
                    Toast.error(`Gagal menyetujui: ${errorMsg}`);
                } catch {
                    Toast.error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return;
            }

            const raw = await res.text();
            console.log("Approve raw response:", raw);

            let result;
            try {
                result = JSON.parse(raw);
                console.log("Approve result:", result);
            } catch {
                result = { message: "Pengajuan berhasil disetujui" };
            }

            Toast.success("Pengajuan meninggal dunia berhasil disetujui!");
            loadPengajuan(1); 
            
        } catch (err) {
            console.error("Approve error:", err);
            Toast.error(`Gagal menyetujui: ${err.message}`);
        } finally {
            setLoadingPengajuan(false);
        }
    };

    const handleReject = async (itemId) => {
        const confirm = await SweetAlert({
            title: "Tolak Pengajuan Meninggal Dunia",
            text: "Yakin ingin menolak pengajuan meninggal dunia ini?",
            icon: "warning",
            showCancelButton: true,
            confirmText: "Ya, Tolak!",
            cancelText: "Batal",
            confirmButtonColor: "#dc3545",
        });

        if (!confirm) return;

        setLoadingPengajuan(true);

        try {
            console.log("=== REJECT MENINGGAL DUNIA ===");
            console.log("Item ID:", itemId);
            console.log("User Role:", fixedRole);

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
                backendRole = "prodi";
            }

            console.log("Auto Reason:", autoReason);
            console.log("Backend Role:", backendRole);

            const payload = {
                keterangan: autoReason,
                role: backendRole
            };

            console.log("Reject payload:", payload);

            const url = `${API_LINK}MeninggalDunia/reject/${itemId}`;
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
                loadPengajuan(1);
                loadRiwayat(1);
            } else {
                throw new Error(result?.message || "Gagal menolak pengajuan");
            } 
            
        } catch (err) {
            console.error("Reject error:", err);
            Toast.error(`Gagal menolak: ${err.message}`);
        } finally {
            setLoadingPengajuan(false);
        }
    };
    const handleRiwayatFilter = () => {
        const newSort = sortRef.current.value;
        const newProdi = prodiRef.current.value;

        setFilterSort(newSort);
        setFilterProdi(newProdi);

        loadRiwayat(1, riwayatSearch, newSort, newProdi);
    };

    const handleSearchRiwayat = useCallback(
        (query) => {
            setRiwayatSearch(query);
            setRiwayatPage(1); 
            loadRiwayat(1, query);
        },
        [loadRiwayat]
    );

    const filterContentRiwayat = (
        <>
            <DropDown
                ref={sortRef}
                arrData={[
                    { Value: "mdu_created_date asc", Text: "Tanggal Pengajuan [↑]" },
                    { Value: "mdu_created_date desc", Text: "Tanggal Pengajuan [↓]" },
                    { Value: "mdu_id asc", Text: "Nomor Pengajuan [↑]" },
                    { Value: "mdu_id desc", Text: "Nomor Pengajuan [↓]" },
                ]}
                type="pilih"
                label="Urut Berdasarkan"
                forInput="urutRiwayat"
                defaultValue={filterSort}
            />

            <DropDown
                ref={prodiRef}
                arrData={dataFilterProdi}
                type="pilih"
                label="Program Studi"
                forInput="filterProdi"
                defaultValue={filterProdi}
            />
        </>
    );

    // ============================================================
    // ======================= USE EFFECT ==========================
    // ============================================================

    useEffect(() => {
        if (!ssoData) {
            Toast.error("Sesi habis. Silakan login kembali.");
            router.push("/auth/login");
            return;
        }

        if (!userData) return;

        loadPengajuan(1);
        
        if (isProdi || isWadir1 || isFinance || isDAAK || isAdmin) {
            loadRiwayat(1);
        }
    }, [ssoData, userData, loadPengajuan, loadRiwayat, isProdi, isWadir1, isFinance, isDAAK, isAdmin, router]);

    return (
        <MainContent
            layout="Admin"
            loading={loadingPengajuan || loadingRiwayat}
            title="Pengajuan Meninggal Dunia"
            breadcrumb={[
                { label: "Sistem Informasi Akademik" },
                { label: "Administrasi Akademik" },
                { label: "Meninggal Dunia" },
            ]}
        >
            {/* ======================== TABEL PENGAJUAN =========================== */}
            <div className="mb-4">
                <h5>Daftar Pengajuan Meninggal Dunia</h5>
                
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div></div>
                    {(isMahasiswa || isProdi) && (
                        <Button
                            classType="primary"
                            label={isProdi ? "Ajukan Meninggal Dunia untuk Mahasiswa" : "Ajukan Meninggal Dunia"}
                            onClick={handleAdd}
                        />
                    )}
                </div>

                {loadingPengajuan ? (
                    <div className="text-center py-4">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Memuat data pengajuan...</p>
                    </div>
                ) : dataPengajuan.length > 0 ? (
                    <>
                        <Table
                            data={dataPengajuan}
                            onDetail={handleDetail}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAjukan={handleAjukan}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onUploadSK={handleUploadSK}
                            onDownloadSK={handleDownloadSK}
                        />

                        {pengajuanTotalData > 0 && (
                            <Paging
                                pageSize={pengajuanPageSize}
                                pageCurrent={pengajuanPage}
                                totalData={pengajuanTotalData}
                                navigation={loadPengajuan}
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
                                ? "Anda belum memiliki pengajuan meninggal dunia. Klik tombol 'Ajukan Meninggal Dunia' untuk membuat pengajuan baru."
                                : isProdi
                                ? "Tidak ada pengajuan meninggal dunia. Anda dapat membuat pengajuan untuk mahasiswa dengan klik tombol 'Ajukan Meninggal Dunia untuk Mahasiswa'."
                                : "Tidak ada pengajuan meninggal dunia yang perlu ditinjau saat ini."
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* ======================== TABEL RIWAYAT =========================== */}
            {(isProdi || isWadir1 || isFinance || isDAAK || isAdmin) && (
                <div className="mt-5">
                    <h5>Daftar Riwayat Meninggal Dunia</h5>
                    
                    <Formsearch
                        onSearch={handleSearchRiwayat}
                        onFilter={handleRiwayatFilter}
                        onExport={() => {
                            const params = new URLSearchParams();
                            if (riwayatSearch && riwayatSearch.trim() !== "") {
                                params.append('search', riwayatSearch.trim());
                            }
                            if (!isAdmin && userData?.username) {
                                const userIdentifier = isMahasiswa ? 
                                    (userData?.mhsId || userData?.nama || userData?.username) : 
                                    userData?.username;
                                params.append('userId', userIdentifier);
                            }
                            
                            const exportUrl = `${API_LINK}MeninggalDunia/riwayat/excel${params.toString() ? '?' + params.toString() : ''}`;
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
                            />

                            {riwayatTotal > 0 && (
                                <Paging
                                    pageSize={riwayatPageSize}
                                    pageCurrent={riwayatPage}
                                    totalData={riwayatTotal}
                                    navigation={(page) => loadRiwayat(page)}
                                />
                            )}
                        </>
                    ) : (
                        <div className="text-center py-5">
                            <div className="mb-3">
                                <i className="fas fa-history fa-3x text-muted"></i>
                            </div>
                            <h5 className="text-muted">Tidak ada data riwayat</h5>
                            <p className="text-muted">Belum ada riwayat meninggal dunia yang tersedia.</p>
                        </div>
                    )}
                </div>
            )}

            {/* SK Upload Modal */}
            {showUploadModal && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Upload SK Meninggal Dunia</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={handleUploadCancel}
                                    disabled={uploadLoading}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Pilih File SK *</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleSKFileSelect}
                                        disabled={uploadLoading}
                                    />
                                    <div className="form-text">
                                        Format yang didukung: PDF, DOC, DOCX, JPG, JPEG, PNG (Maksimal 10MB)
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Pilih File SPKB (Opsional)</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={handleSPKBFileSelect}
                                        disabled={uploadLoading}
                                    />
                                    <div className="form-text">
                                        Format yang didukung: PDF, DOC, DOCX, JPG, JPEG, PNG (Maksimal 10MB)
                                    </div>
                                </div>

                                {selectedSKFile && (
                                    <div className="mb-3">
                                        <div className="alert alert-info">
                                            <strong>File SK dipilih:</strong> {selectedSKFile.name} ({(selectedSKFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </div>
                                    </div>
                                )}

                                {selectedSPKBFile && (
                                    <div className="mb-3">
                                        <div className="alert alert-info">
                                            <strong>File SPKB dipilih:</strong> {selectedSPKBFile.name} ({(selectedSPKBFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </div>
                                    </div>
                                )}

                                {skFilePreview && (
                                    <div className="mb-3">
                                        <label className="form-label">Preview SK:</label>
                                        <div className="text-center">
                                            <img 
                                                src={skFilePreview} 
                                                alt="Preview SK" 
                                                className="img-fluid" 
                                                style={{ maxHeight: '300px', border: '1px solid #ddd', borderRadius: '4px' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {spkbFilePreview && (
                                    <div className="mb-3">
                                        <label className="form-label">Preview SPKB:</label>
                                        <div className="text-center">
                                            <img 
                                                src={spkbFilePreview} 
                                                alt="Preview SPKB" 
                                                className="img-fluid" 
                                                style={{ maxHeight: '300px', border: '1px solid #ddd', borderRadius: '4px' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary" 
                                    onClick={handleUploadCancel}
                                    disabled={uploadLoading}
                                >
                                    Batal
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary" 
                                    onClick={handleUploadConfirm}
                                    disabled={!selectedSKFile || uploadLoading}
                                >
                                    {uploadLoading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Mengupload...
                                        </>
                                    ) : (
                                        'Upload SK'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MainContent>
    );
}




