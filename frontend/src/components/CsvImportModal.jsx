import React, { useState } from 'react';
import api from '../api/client';
import { X, UploadCloud, FileText, CheckCircle2, AlertTriangle, Download } from 'lucide-react';

export default function CsvImportModal({ isOpen, onClose, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        setError('Please select a valid CSV file (.csv)');
        return;
      }
      setFile(selected);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please choose a CSV file to upload');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/leads/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      onImportComplete();
    } catch (err) {
      setError(err.response?.data?.detail || 'CSV upload failed. Please verify column headers.');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "college_name,contact_name,phone_number,location,designation,preferred_language,email\n" +
      "Vasavi College of Engineering,Prof. S. Ramachandram,9848011223,Hyderabad,Director,te,director@vasavi.ac.in\n" +
      "GMR Institute of Technology,Dr. C.L.V.R.S.V. Prasad,9440122334,Rajam,Principal,te,principal@gmrit.edu.in\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sample_college_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Import College Leads from CSV</h3>
              <p className="text-xs text-slate-400">Batch upload Andhra Pradesh & Telangana colleges</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Zone */}
        {!result ? (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-white/15 hover:border-blue-500/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/30">
              <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
              <span className="text-xs font-semibold text-white">
                {file ? file.name : "Click to browse or drag and drop CSV file"}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Supports .csv files with phone numbers in 10-digit or +91 format
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Required columns: college_name, contact_name, phone_number</span>
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Sample CSV
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!file || uploading}
                onClick={handleUpload}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {uploading ? 'Processing & Validating...' : 'Upload & Deduplicate'}
              </button>
            </div>
          </div>
        ) : (
          /* Result Summary */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Import Finished Successfully</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                <div>Imported New: <strong className="text-white">{result.imported_count}</strong></div>
                <div>Duplicates Skipped: <strong className="text-white">{result.duplicate_count}</strong></div>
                <div>Suppressed (DND): <strong className="text-white">{result.suppressed_count}</strong></div>
                <div>Invalid Format: <strong className="text-rose-400">{result.invalid_count}</strong></div>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-800/50 text-[11px] text-slate-400 border border-white/5">
                <div className="font-semibold text-slate-300 mb-1">Validation Warnings:</div>
                {result.errors.slice(0, 5).map((err, idx) => (
                  <div key={idx} className="text-amber-400/90">• {err}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
