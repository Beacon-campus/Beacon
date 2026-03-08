import React, { useState, useRef } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

export default function BulkUpload() {
    const [fileData, setFileData] = useState(null);
    const [uploadType, setUploadType] = useState(null); // 'student' or 'teacher'
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 20;

    const studentFileInput = useRef(null);
    const staffFileInput = useRef(null);

    // Upload State
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, failed: 0, currentItem: "" });

    const handleFileUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type !== "text/csv" && file.name.split('.').pop() !== 'csv') {
            toast.error("Please upload a valid CSV file.");
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    const headers = Object.keys(results.data[0]).map(h => h.trim());

                    const expectedStudentHeaders = ["RegisterNo", "Name", "Course"];
                    const expectedStaffHeaders = ["RegisterNo", "Name", "Dept"];

                    const validateHeaders = (expected) => {
                        if (headers.length !== expected.length) return false;
                        return expected.every(h => headers.includes(h));
                    };

                    if (type === 'student' && !validateHeaders(expectedStudentHeaders)) {
                        toast.error("Invalid headers for Student upload. Expected strictly: RegisterNo, Name, Course");
                        e.target.value = null;
                        return;
                    }

                    if (type === 'teacher' && !validateHeaders(expectedStaffHeaders)) {
                        toast.error("Invalid headers for Staff upload. Expected strictly: RegisterNo, Name, Dept");
                        e.target.value = null;
                        return;
                    }

                    setFileData(results.data);
                    setUploadType(type);
                    setCurrentPage(1);
                    e.target.value = null; // reset input
                } else {
                    toast.error("The CSV file is empty or formatted incorrectly.");
                }
            },
            error: (error) => {
                toast.error(`Error parsing CSV: ${error.message}`);
            }
        });
    };

    const handleConfirmUpload = async () => {
        if (!fileData || fileData.length === 0) return;

        setIsUploading(true);
        setProgress({ current: 0, total: fileData.length, failed: 0, currentItem: "" });

        const credentialsData = [];
        let fails = 0;

        try {
            for (let i = 0; i < fileData.length; i++) {
                const row = fileData[i];
                // Validate base fields
                if (!row.Name || !row.RegisterNo) {
                    fails++;
                    setProgress(prev => ({ ...prev, current: i + 1, failed: fails, currentItem: row.RegisterNo || "Unknown" }));
                    continue;
                }

                // Update UI state early
                setProgress(prev => ({ ...prev, currentItem: row.RegisterNo }));

                // Construct backend payload
                const payload = {
                    role: uploadType,
                    name: row.Name,
                    regno: row.RegisterNo,
                };

                if (uploadType === "student") {
                    payload.course = row.Course || "";
                    // Semester and shift are intentionally omitted so the backend auto-calculates them
                } else {
                    payload.department = row.Dept || "";
                }

                try {
                    const { data } = await apiClient.post(`/admin/users`, payload);

                    // Push returned dynamic password
                    credentialsData.push({
                        Name: payload.name,
                        RegisterNo: payload.regno,
                        TemporaryPassword: data.user.temppassword
                    });

                } catch (err) {
                    fails++;
                    console.error(`Row ${i + 1} failed:`, err);
                }

                setProgress(prev => ({ ...prev, current: i + 1, failed: fails }));
            }

            toast.success(`Upload complete! ${fileData.length - fails} created, ${fails} failed.`);

            if (credentialsData.length > 0) {
                downloadCredentialsCSV(credentialsData, uploadType);
            }

        } catch (error) {
            console.error("Critical upload error:", error);
            toast.error("An error occurred during bulk upload.");
        } finally {
            setIsUploading(false);
            setFileData(null);
            setUploadType(null);
        }
    };

    const downloadCredentialsCSV = (dataStrArray, type) => {
        const _csv = Papa.unparse(dataStrArray);
        const blob = new Blob([_csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const prefix = type === 'student' ? 'Student' : 'Teacher';
        a.download = `TempPass_${prefix}_${new Date().getTime()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const triggerStudentDL = () => {
        const _csv = "RegisterNo,Name,Course\n241BCAA01,John Doe,BCA";
        const blob = new Blob([_csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Student_Template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    const triggerStaffDL = () => {
        const _csv = "RegisterNo,Name,Dept\nTCH001,Prof Smith,IT";
        const blob = new Blob([_csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Staff_Template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col p-6 lg:p-8 bg-gray-50/50 overflow-y-auto">
            {/* Header */}
            <div className="mb-6 max-w-[1400px] w-full mx-auto shrink-0">
                <h2 className="text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">Bulk Import Data</h2>
                <p className="text-sm font-medium text-slate-500 mt-2">Accelerate onboarding by uploading CSV batches for students and staff.</p>
            </div>

            {/* Split Panels */}
            <div className="flex flex-col xl:flex-row gap-6 max-w-[1400px] w-full mx-auto">

                {/* Student Panel */}
                <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-8 flex flex-col items-center text-center transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 mt-2">Upload Students</h3>
                    <p className="text-sm font-medium text-slate-500 mb-6 max-w-[280px]">
                        Required configuration: <span className="font-bold text-slate-700">RegisterNo, Name, Course.</span>
                    </p>

                    <div
                        className="w-full max-w-sm border-2 border-dashed border-indigo-100 rounded-2xl p-6 lg:p-8 bg-indigo-50/30 hover:bg-indigo-50/80 hover:border-indigo-300 transition-all cursor-pointer flex flex-col items-center justify-center mb-6 group"
                        onClick={() => studentFileInput.current?.click()}
                    >
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </div>
                        <p className="text-sm font-bold text-slate-600">Click to Browse or Drag File</p>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">.CSV format only</p>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={studentFileInput}
                            onChange={(e) => handleFileUpload(e, 'student')}
                        />
                    </div>

                    <button onClick={triggerStudentDL} className="group relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-all shadow-sm">
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Template
                    </button>
                </div>

                {/* Staff Panel */}
                <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 lg:p-8 flex flex-col items-center text-center transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 mt-2">Upload Staff</h3>
                    <p className="text-sm font-medium text-slate-500 mb-6 max-w-[280px]">
                        Required configuration: <span className="font-bold text-slate-700">RegisterNo, Name, Dept.</span>
                    </p>

                    <div
                        className="w-full max-w-sm border-2 border-dashed border-indigo-100 rounded-2xl p-6 lg:p-8 bg-indigo-50/30 hover:bg-indigo-50/80 hover:border-indigo-300 transition-all cursor-pointer flex flex-col items-center justify-center mb-6 group"
                        onClick={() => staffFileInput.current?.click()}
                    >
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </div>
                        <p className="text-sm font-bold text-slate-600">Click to Browse or Drag File</p>
                        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">.CSV format only</p>
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={staffFileInput}
                            onChange={(e) => handleFileUpload(e, 'teacher')}
                        />
                    </div>

                    <button onClick={triggerStaffDL} className="group relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-all shadow-sm">
                        <svg className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download Template
                    </button>
                </div>

            </div>

            {/* Confirmation & Uploading Modals */}
            {fileData && !isUploading && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-gray-800">Confirm {uploadType === 'student' ? 'Student' : 'Staff'} Import</h2>
                            <button onClick={() => setFileData(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto soft-scrollbar pr-2">
                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl mb-4 flex items-start gap-3">
                                <svg className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <div>
                                    <h4 className="text-sm font-bold text-indigo-800">You are about to process {fileData.length} records.</h4>
                                    <p className="text-xs font-semibold text-indigo-600/80 mt-0.5">Please review a sample of the parsed data below to ensure mapping is correct before generating accounts.</p>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                                        <tr>
                                            {Object.keys(fileData[0]).map((key) => (
                                                <th key={key} className="px-4 py-2 truncate max-w-[150px]">{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {fileData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50">
                                                {Object.values(row).map((val, j) => (
                                                    <td key={j} className="px-4 py-2 font-medium text-gray-700 truncate max-w-[150px]">{val || '-'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {fileData.length > rowsPerPage && (
                                <div className="flex items-center justify-between mt-4 px-2">
                                    <span className="text-xs font-semibold text-gray-500">
                                        Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, fileData.length)} of {fileData.length} entries
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Prev
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(fileData.length / rowsPerPage), p + 1))}
                                            disabled={currentPage === Math.ceil(fileData.length / rowsPerPage)}
                                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end shrink-0">
                            <button onClick={() => setFileData(null)} className="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                            <button onClick={handleConfirmUpload} className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95">
                                Start Import
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isUploading && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">

                        {/* Fake Loading Bar Background */}
                        <div className="absolute top-0 left-0 h-1 bg-gray-100 w-full">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>

                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6 mt-2 relative">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>

                        <h2 className="text-lg font-black text-gray-800 tracking-tight">Processing Upload</h2>
                        {progress.currentItem && (
                            <p className="text-xs font-mono font-bold text-indigo-600 mt-2 bg-indigo-50 px-3 py-1 rounded-full">
                                Creating: {progress.currentItem}
                            </p>
                        )}
                        <p className="text-sm font-bold text-gray-500 mt-3">
                            {progress.current} of {progress.total} Completed
                        </p>
                        {progress.failed > 0 && (
                            <p className="text-xs font-bold text-red-500 mt-1">{progress.failed} failed items</p>
                        )}
                        <p className="text-[10px] font-bold text-gray-400 mt-6 tracking-widest uppercase">Do not close this window</p>

                    </div>
                </div>
            )}

        </div>
    );
}
