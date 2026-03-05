import { useState, useRef, useCallback, useEffect } from 'react';
import './SourcesPanel.css';

export interface SourceFile {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc' | 'audio' | 'other';
  checked: boolean;
}

interface SourcesPanelProps {
  sources: SourceFile[];
  onSourcesChange: (sources: SourceFile[]) => void;
}

/* ---- Icon components ---- */
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FileIcon = ({ type }: { type: SourceFile['type'] }) => {
  const color =
    type === 'pdf'
      ? 'var(--color-error)'
      : type === 'image'
        ? 'var(--color-accent)'
        : type === 'doc'
          ? 'var(--color-accent)'
          : type === 'audio'
            ? 'var(--color-warning)'
            : 'var(--color-text-secondary)';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      style={{ color }}
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
};

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DropzoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

/* ---- Checkbox sub-component ---- */
function Checkbox({
  checked,
  onChange,
  onClick,
  id,
}: {
  checked: boolean;
  onChange: () => void;
  onClick?: (e: React.MouseEvent) => void;
  id: string;
}) {
  return (
    <label className="checkbox" htmlFor={id} onClick={onClick}>
      <input type="checkbox" id={id} checked={checked} onChange={onChange} />
      <span className="checkbox__box">
        <CheckIcon />
      </span>
    </label>
  );
}

/* ---- Main component ---- */
export default function SourcesPanel({
  sources,
  onSourcesChange,
}: SourcesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addSourcesTriggerRef = useRef<HTMLButtonElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const allChecked = sources.length > 0 && sources.every((s) => s.checked);

  const toggleAll = () => {
    const next = !allChecked;
    onSourcesChange(sources.map((s) => ({ ...s, checked: next })));
  };

  const toggleSource = (id: string) => {
    onSourcesChange(
      sources.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s)),
    );
  };

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newSources: SourceFile[] = Array.from(files).map((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
        let type: SourceFile['type'] = 'other';
        if (ext === 'pdf') type = 'pdf';
        else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext))
          type = 'image';
        else if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext))
          type = 'doc';
        else if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext))
          type = 'audio';
        return {
          id: crypto.randomUUID(),
          name: f.name,
          type,
          checked: true,
        };
      });
      onSourcesChange([...sources, ...newSources]);
      setModalOpen(false);
    },
    [sources, onSourcesChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Reset so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Modal: Escape key + focus trap + focus restore
  useEffect(() => {
    if (!modalOpen) return;

    const dialog = modalContentRef.current;
    if (!dialog) return;

    // Capture ref for cleanup
    const triggerEl = addSourcesTriggerRef.current;

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
        return;
      }

      if (e.key === 'Tab') {
        const focusableItems =
          dialog.querySelectorAll<HTMLElement>(focusableSelector);
        if (focusableItems.length === 0) return;

        const first = focusableItems[0];
        const last = focusableItems[focusableItems.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerEl?.focus();
    };
  }, [modalOpen]);

  return (
    <>
      <aside
        className={`sources-panel${collapsed ? ' collapsed' : ''}`}
        id="sources-panel"
      >
        {/* Header */}
        <div className="sources-header">
          <span className="sources-header__title">Sources</span>
          <button
            className="icon-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sources' : 'Collapse sources'}
            title={collapsed ? 'Expand sources' : 'Collapse sources'}
          >
            {collapsed ? <ArrowRightIcon /> : <ArrowLeftIcon />}
          </button>
        </div>

        {/* Body — visible when expanded */}
        <div className="sources-body">
          <button
            ref={addSourcesTriggerRef}
            className="add-sources-btn"
            onClick={() => setModalOpen(true)}
          >
            <PlusIcon />
            Add sources
          </button>

          {sources.length > 0 && (
            <>
              <div className="select-all-row">
                <span className="select-all-row__label">
                  Select all sources
                </span>
                <Checkbox
                  id="select-all-sources"
                  checked={allChecked}
                  onChange={toggleAll}
                />
              </div>

              <div className="source-list" role="list">
                {sources.map((s) => (
                  <div
                    className="source-item"
                    key={s.id}
                    role="listitem"
                    onClick={() => toggleSource(s.id)}
                  >
                    <span className="source-item__icon">
                      <FileIcon type={s.type} />
                    </span>
                    <span className="source-item__name" title={s.name}>
                      {s.name}
                    </span>
                    <Checkbox
                      id={`source-${s.id}`}
                      checked={s.checked}
                      onChange={() => toggleSource(s.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Collapsed — icon strip */}
        <div className="sources-collapsed-strip">
          <button
            className="sources-collapsed-strip__icon"
            onClick={() => setModalOpen(true)}
            aria-label="Add sources"
            title="Add sources"
          >
            <PlusIcon />
          </button>
          {sources.map((s) => (
            <div
              className="sources-collapsed-strip__icon"
              key={s.id}
              title={s.name}
            >
              <FileIcon type={s.type} />
            </div>
          ))}
        </div>
      </aside>

      {/* Add Sources Modal */}
      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setModalOpen(false)}
        >
          <div
            ref={modalContentRef}
            className="modal-content add-sources-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add sources"
          >
            <div className="add-sources-modal__header">
              <h2 className="add-sources-modal__title">Add sources</h2>
              <button
                className="icon-btn add-sources-modal__close"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            <div
              className={`dropzone${dragging ? ' dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <DropzoneIcon />
              <span className="dropzone__text">or drop your files</span>
              <span className="dropzone__formats">
                pdf, images, docs, audio, and more
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon />
              Upload files
            </button>
          </div>
        </div>
      )}
    </>
  );
}
