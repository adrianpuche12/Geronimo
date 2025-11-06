import React from 'react';
import '../styles/modal.css';

// Componente para el modal de duplicados
export const DuplicateAlertModal = ({ alert, onClose }) => {
  if (!alert) return null;

  return (
    <div className="duplicate-modal-overlay" onClick={onClose}>
      <div className="duplicate-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="duplicate-modal-header">
          <div className="duplicate-icon">⚠️</div>
        </div>

        <div className="duplicate-modal-body">
          <p className="duplicate-main-message">
            El archivo <strong>"{alert.fileName}"</strong> ya existe en el proyecto.
          </p>
        </div>

        <div className="duplicate-modal-footer">
          <button className="btn-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de vista previa de documentos
export const DocumentPreviewModal = ({ document, onClose, formatDate, formatFileSize }) => {
  if (!document) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📄 {document.path}</h3>
          <button
            className="modal-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="doc-metadata">
            <span><strong>Título:</strong> {document.title || 'Sin título'}</span>
            <span><strong>Creado:</strong> {formatDate(document.createdAt)}</span>
            <span><strong>Tamaño:</strong> {formatFileSize(document.content)}</span>
          </div>
          <div className="doc-content-preview">
            <pre>{document.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

const modals = { DuplicateAlertModal, DocumentPreviewModal };
export default modals;
