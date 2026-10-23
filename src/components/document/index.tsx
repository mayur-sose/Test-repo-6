import Button from '@/components/button';

const DownloadIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

// Maps the MIME types the document shape accepts to a short, human label.
const FILE_TYPE_LABELS = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'PPTX',
  'application/rtf': 'RTF',
  'application/vnd.oasis.opendocument.text': 'ODT',
  'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
  'application/vnd.oasis.opendocument.presentation': 'ODP',
};

// Falls back to the filename extension so an unmapped MIME type still reads
// usefully, and so DAM assets that expose no MIME type are not blank.
const fileTypeLabel = ({ mimetype, filename }) => {
  if (mimetype && FILE_TYPE_LABELS[mimetype]) {
    return FILE_TYPE_LABELS[mimetype];
  }
  const extension = filename?.split('.').pop();
  return extension && extension !== filename ? extension.toUpperCase() : null;
};

const formatFileSize = (bytes) => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const size = bytes / 1024 ** exponent;
  // Whole numbers for bytes and KB, one decimal from MB up.
  const rounded = exponent < 2 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[exponent]}`;
};

const Document = ({
  document,
  label = '',
  variant = 'solid',
  showFileDetails = true,
}) => {
  if (!document?.src) {
    return null;
  }

  const buttonText = label || document.title || document.filename || 'Download';
  const typeLabel = fileTypeLabel(document);
  const sizeLabel = formatFileSize(document.filesize);
  const meta = [typeLabel, sizeLabel].filter(Boolean).join(' · ');

  // The accessible name carries the file details so screen reader users get
  // the same context sighted users read from the meta line.
  const accessibleName = meta
    ? `${buttonText} (${meta})`
    : `${buttonText} (download)`;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={variant}
        link={document.src}
        aria-label={accessibleName}
        download=""
      >
        <DownloadIcon />
        {buttonText}
      </Button>
      {showFileDetails && meta && (
        <span className="text-xs text-gray-600">{meta}</span>
      )}
    </div>
  );
};

export default Document;
