import React, { useState } from 'react';

export default function CSVUploadModal({ onClose, onUploadSuccess }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`https://mm-event-api.up.railway.app/api/validate-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      if (data.valid) {
        onUploadSuccess(file.name, data);
        onClose();
      } else {
        setError(data.reason || 'Invalid CSV format');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--surface)] border border-[var(--navy-border)] rounded-[3px] p-5 w-[400px]">
        <h2 className="text-[12px] font-bold tracking-[0.08em] uppercase text-[var(--white-dim)] mb-4">Upload Custom Price Data</h2>
        
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange}
          className="block w-full text-[11px] text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-[3px] file:border-0 file:text-[11px] file:font-bold file:bg-[var(--navy-light)] file:text-[var(--white)] hover:file:bg-[var(--navy-border)] mb-4"
        />

        {error && <div className="text-[10px] text-[var(--neg)] mb-4">{error}</div>}

        <div className="flex justify-end gap-2">
          <button 
            className="py-1.5 px-3 text-[11px] bg-[var(--navy-light)] text-[var(--white)] rounded-[3px] border border-[var(--navy-border)] cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="py-1.5 px-3 text-[11px] bg-[var(--accent)] text-[var(--navy)] font-bold rounded-[3px] border-none cursor-pointer disabled:opacity-50"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
