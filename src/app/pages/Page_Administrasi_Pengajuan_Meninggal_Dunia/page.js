"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import MainContent from "@/components/layout/MainContent";
import Formsearch from "@/components/common/Formsearch";
import Table from "@/components/common/Table";
import Paging from "@/components/common/Paging";
import DropDown from "@/components/common/Dropdown";
import Toast from "@/components/common/Toast";
import { getUserData, getSSOData } from "@/context/user";
import fetchData from "@/lib/fetch";
import DateFormatter from "@/lib/dateFormater";

export default function Page_MeninggalDunia() {

    const ssoData = useMemo(() => getSSOData(), []);
    const userData = useMemo(() => getUserData(), []);

    const BASE_API = "http://localhost:5234/api/";

    // ============= ROLE DETECTION =============
    const roleId = (() => {
        // Jika user PRODI → pakai kon_npk
        if (userData?.kon_npk && userData.kon_npk !== "") {
            return userData.kon_npk;
        }

        // Jika ADMIN / FINANCE / KARYAWAN → roleId = "" (backend artikan: admin lihat semua)
        const role = (userData?.role || "").toUpperCase();
        if (
            role.includes("ADMIN") ||
            role.includes("FINANCE") ||
            role.includes("KARYAWAN")
        ) {
            return "KRY71";
        }

        return "";
    })();


    // ============================================================
    // ================      TABLE 1 : PENGAJUAN      =============
    // ============================================================

    const [dataPengajuan, setDataPengajuan] = useState([]);
    const [loadingPengajuan, setLoadingPengajuan] = useState(true);



    const [pengajuanPage, setPengajuanPage] = useState(1);
    const [pengajuanTotalData, setPengajuanTotalData] = useState(0);
    const pengajuanPageSize = 10;

    const loadPengajuan = useCallback(
        async (page = 1) => {
            try {
                setLoadingPengajuan(true);

                const res = await fetchData(
                    BASE_API + "MeninggalDunia/GetAll",
                    {
                        UserId: "",
                        SearchKeyword: "",
                        Status: "",
                        Sort: "mdu_created_date desc",
                        RoleId: roleId,
                        PageNumber: page,
                        PageSize: pengajuanPageSize,
                    },
                    "GET"
                );

                if (res.error) throw new Error(res.message);

                const mapped = res.data.map((item, index) => ({
                    No: (page - 1) * pengajuanPageSize + index + 1,
                    id: item.id,
                    "No Pengajuan": item.noPengajuan ?? "-",
                    "Tanggal Pengajuan": DateFormatter.formatDate(item.tanggalPengajuan),
                    "Nomor SK": item.nomorSK ?? "-",
                    Status: item.status ?? "-",
                    Aksi: ["Detail"],

                    // WAJIB → agar TableRow.js tidak error
                    Alignment: [
                        "center", // No
                        "left",   // No Pengajuan
                        "center", // Tanggal Pengajuan
                        "left",   // Nomor SK
                        "center", // Status
                        "center"  // Aksi
                    ]
                }));


                setDataPengajuan(mapped);
                setPengajuanTotalData(res.totalData);
                setPengajuanPage(page);
            } catch (err) {
                Toast.error(err.message);
            } finally {
                setLoadingPengajuan(false);
            }
        },
        [roleId]
    );

    // ============================================================
    // =================== TABLE 2 : RIWAYAT =======================
    // ============================================================

    const [dataRiwayat, setDataRiwayat] = useState([]);
    const [loadingRiwayat, setLoadingRiwayat] = useState(true);

    const [riwayatPage, setRiwayatPage] = useState(1);
    const [riwayatTotal, setRiwayatTotal] = useState(0);
    const riwayatPageSize = 10;

    // FILTER
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
        async (
            page = 1,
            keyword = riwayatSearch,
            sort = filterSort,
            prodi = filterProdi
        ) => {
            try {
                setLoadingRiwayat(true);

                // Build Query String
                const params = {
                    RoleId: roleId,
                    Sort: sort,
                    PageNumber: page,
                    PageSize: riwayatPageSize,
                };

                if (keyword && keyword.trim() !== "") {
                    params.Keyword = keyword.trim();
                }

                if (prodi && prodi.trim() !== "") {
                    params.Konsentrasi = prodi.trim();
                }

                const query = new URLSearchParams(params).toString();
                console.log("RIWAYAT QUERY:", query);

                // Fetch BE
                const res = await fetch(BASE_API + "MeninggalDunia/Riwayat?" + query);
                const json = await res.json();

                console.log("RIWAYAT RESPONSE:", json);

                // -------------- 🔥 MAPPING WAJIB UNTUK TABLE --------------
                const mapped = json.data.map((it, index) => ({
                    No: (page - 1) * riwayatPageSize + index + 1,
                    id: it.id,
                    "No Pengajuan": it.noPengajuan,
                    "Tanggal Pengajuan": DateFormatter.formatDate(it.tanggalPengajuan),
                    "Nama Mahasiswa": it.namaMahasiswa,
                    Prodi: it.prodi,
                    "Nomor SK": it.nomorSK,
                    Status: it.status,
                    Aksi: ["Detail"],

                    Alignment: [
                        "center", // No
                        "left",   // No Pengajuan
                        "center", // Tanggal Pengajuan
                        "left",   // Nama Mahasiswa
                        "left",   // Prodi
                        "left",   // Nomor SK
                        "center", // Status
                        "center"  // Aksi
                    ]
                }));

                // Set ke state table
                setDataRiwayat(mapped);
                setRiwayatTotal(json.totalData);
                setRiwayatPage(page);
                // ----------------------------------------------------------

            } catch (err) {
                Toast.error(err.message);
            } finally {
                setLoadingRiwayat(false);
            }
        },
        [roleId, riwayatSearch, filterSort, filterProdi]
    );



    const handleRiwayatFilter = () => {
        const newSort = sortRef.current.value;
        const newProdi = prodiRef.current.value;

        setFilterSort(newSort);
        setFilterProdi(newProdi);

        loadRiwayat(1, riwayatSearch, newSort, newProdi);
    };

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
        if (!ssoData) return;
        loadPengajuan(1);
        loadRiwayat(1);
    }, [ssoData]);

    return (
        <MainContent
            layout="Admin"
            loading={loadingPengajuan || loadingRiwayat}
            title="Pengajuan Meninggal Dunia"
            breadcrumb={[
                { label: "Administrasi Akademik" },
                { label: "Meninggal Dunia" },
            ]}
        >

            {/* ======================== TABEL PENGAJUAN =========================== */}
            <h5 className="fw-bold mb-3">Daftar Pengajuan Meninggal Dunia</h5>

            <Table data={dataPengajuan} />

            {pengajuanTotalData > 0 && (
                <Paging
                    pageSize={pengajuanPageSize}
                    pageCurrent={pengajuanPage}
                    totalData={pengajuanTotalData}
                    navigation={loadPengajuan}
                />
            )}

            <hr className="my-5" />

            {/* ======================== TABEL RIWAYAT =========================== */}
            <h5 className="fw-bold mb-3">Daftar Riwayat Meninggal Dunia</h5>

            <Formsearch
                onSearch={(q) => {
                    setRiwayatSearch(q);
                    loadRiwayat(1, q);
                }}
                onFilter={handleRiwayatFilter}
                searchPlaceholder="Pencarian"
                filterContent={filterContentRiwayat}
                showAddButton={false}
            />

            <Table data={dataRiwayat} />

            {riwayatTotal > 0 && (
                <Paging
                    pageSize={riwayatPageSize}
                    pageCurrent={riwayatPage}
                    totalData={riwayatTotal}
                    navigation={(page) => loadRiwayat(page)}
                />
            )}

        </MainContent>
    );
}




