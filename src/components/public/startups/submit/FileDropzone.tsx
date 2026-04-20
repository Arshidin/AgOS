import { useCallback, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, X } from 'lucide-react';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/x-iwork-keynote-sfdkey',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.pptx', '.ppt', '.key'];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface Props {
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
}

export default function FileDropzone({ file, onFileChange, error }: Props) {
  const { t } = useTranslation();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext) && !ACCEPTED_TYPES.includes(f.type)) {
      return t('startups.submit.fileInvalidType');
    }
    if (f.size > MAX_SIZE) {
      return t('startups.submit.fileTooBig');
    }
    return null;
  }, [t]);

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) {
      onFileChange(null);
      return;
    }
    onFileChange(f);
  }, [validateFile, onFileChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (file) {
    return (
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: 'rgba(107,158,107,0.06)', border: '1px solid rgba(107,158,107,0.15)' }}
      >
        <FileText size={20} style={{ color: '#5A8A5A' }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: '#2B180A' }}>
            {file.name}
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(43,24,10,0.45)' }}>
            {formatSize(file.size)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFileChange(null)}
          className="p-1 rounded-lg hover:bg-black/5 transition-colors"
        >
          <X size={16} style={{ color: 'rgba(43,24,10,0.4)' }} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-8 cursor-pointer transition-colors ${
          dragActive ? 'ring-2 ring-[#E8730C]' : ''
        }`}
        style={{
          background: dragActive ? 'rgba(232,115,12,0.04)' : 'rgba(43,24,10,0.03)',
          border: `1.5px dashed ${error ? '#993333' : dragActive ? '#E8730C' : 'rgba(43,24,10,0.15)'}`,
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={24} style={{ color: 'rgba(43,24,10,0.3)' }} />
        <p className="text-sm text-center" style={{ color: 'rgba(43,24,10,0.5)' }}>
          {t('startups.submit.dropzoneText')}
        </p>
        <p className="text-[11px]" style={{ color: 'rgba(43,24,10,0.3)' }}>
          PDF, PPTX, Keynote · {t('startups.submit.maxSize', { size: '50MB' })}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.pptx,.ppt,.key"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
      {error && (
        <p className="text-[12px] mt-1.5 font-medium" style={{ color: '#993333' }}>{error}</p>
      )}
    </div>
  );
}
