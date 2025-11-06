import React from 'react';

// Componente para el menú de exportación
export const ExportMenu = ({ message, onClose, exportAIResponse }) => (
  <div className="export-menu">
    <div className="export-menu-header">
      <span>Exportar como:</span>
      <button onClick={onClose} className="close-btn">×</button>
    </div>
    <div className="export-options">
      <button onClick={() => { exportAIResponse(message, 'txt'); onClose(); }}>
        📄 Texto (.txt)
      </button>
      <button onClick={() => { exportAIResponse(message, 'md'); onClose(); }}>
        📝 Markdown (.md)
      </button>
      <button onClick={() => { exportAIResponse(message, 'html'); onClose(); }}>
        🌐 HTML (.html)
      </button>
      <button onClick={() => { exportAIResponse(message, 'json'); onClose(); }}>
        📊 JSON (.json)
      </button>
    </div>
  </div>
);

// Función para formatear fechas
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Función para formatear tamaño de archivos
export const formatFileSize = (content) => {
  if (!content) return '0 KB';
  const bytes = new Blob([content]).size;
  const kb = (bytes / 1024).toFixed(1);
  return `${kb} KB`;
};

// Función para resaltar texto
export const highlightText = (text, query) => {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.split(regex).map((part, index) =>
    regex.test(part) ? (
      <mark key={index} style={{ backgroundColor: '#4a9eff', color: 'white' }}>
        {part}
      </mark>
    ) : (
      part
    )
  );
};

const utilities = { ExportMenu, formatDate, formatFileSize, highlightText };
export default utilities;
