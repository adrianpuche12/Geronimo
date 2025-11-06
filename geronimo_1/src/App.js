import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

// URL del backend - ajusta según tu configuración
const API_URL = 'http://62.171.160.238:3000/api';

function App() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'explorer', or 'search'
  const [expandedProjects, setExpandedProjects] = useState({});
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    projectId: '',
    dateFrom: '',
    dateTo: '',
    fileType: ''
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(null); // Para menú de exportación
  const [duplicateAlert, setDuplicateAlert] = useState(null); // Para modal de duplicados

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Cargar proyectos al iniciar
  useEffect(() => {
    loadProjects();
  }, []);

  // Auto-scroll en mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects`);
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProject(response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      addSystemMessage('Error al cargar proyectos. Verifica la conexión con el servidor.');
    }
  };

  const addSystemMessage = (content) => {
    setMessages(prev => [...prev, {
      role: 'system',
      content,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      addSystemMessage('Por favor ingresa un nombre para el proyecto.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/projects`, {
        name: newProjectName,
        description: newProjectDescription || undefined
      });

      addSystemMessage(`✓ Proyecto "${newProjectName}" creado correctamente.`);

      // Recargar lista de proyectos
      await loadProjects();

      // Seleccionar el nuevo proyecto
      setSelectedProject(response.data.id);

      // Limpiar formulario y cerrar modal
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateProject(false);
    } catch (error) {
      console.error('Error creating project:', error);
      addSystemMessage(`✗ Error al crear proyecto: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    // Reset input para permitir subir el mismo archivo de nuevo
    e.target.value = '';
  };

  const handleFiles = async (files) => {
    if (!selectedProject) {
      addSystemMessage('Por favor selecciona un proyecto primero.');
      return;
    }

    if (files.length === 0) {
      return;
    }

    setIsLoading(true);

    for (const file of files) {
      try {
        const content = await readFileContent(file);

        const response = await axios.post(`${API_URL}/docs`, {
          projectId: selectedProject,
          path: `docs/${file.name}`,
          title: file.name,
          content: content
        });

        // Verificar si el backend detectó un duplicado
        if (response.data.statusCode === 409) {
          addSystemMessage(`⚠️ "${file.name}" es un duplicado - ${response.data.message}`);
        } else {
          setUploadedFiles(prev => [...prev, {
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString()
          }]);
          addSystemMessage(`✓ Archivo "${file.name}" subido correctamente.`);
        }
      } catch (error) {
        console.error('Error uploading file:', error);

        // Manejar error de duplicado
        if (error.response?.status === 409) {
          const details = error.response.data.details || {};
          const existingDoc = details.existingDocument || {};

          // Mostrar modal de alerta de duplicado
          setDuplicateAlert({
            fileName: file.name,
            duplicateType: details.duplicateType,
            existingPath: existingDoc.path || 'archivo similar',
            existingTitle: existingDoc.title,
            message: error.response.data.message
          });

          addSystemMessage(`⚠️ "${file.name}" es un duplicado. Ya existe: ${existingDoc.path || 'archivo similar'}`);
        } else {
          addSystemMessage(`✗ Error al subir "${file.name}": ${error.response?.data?.message || error.message}`);
        }
      }
    }

    setIsLoading(false);
  };

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedProject) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/query`, {
        projectId: selectedProject,
        question: inputMessage
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.answer || response.data.message || 'Sin respuesta',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      addSystemMessage(`Error al enviar mensaje: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleProjectExpand = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const handleDeleteDocument = async (docId, docTitle) => {
    if (!window.confirm(`¿Eliminar documento "${docTitle}"?`)) return;

    setIsLoading(true);
    try {
      await axios.delete(`${API_URL}/docs/${docId}`);
      addSystemMessage(`✓ Documento "${docTitle}" eliminado.`);
      await loadProjects(); // Recargar para actualizar la lista
    } catch (error) {
      console.error('Error deleting document:', error);
      addSystemMessage(`✗ Error al eliminar documento: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    console.log('🔍 handleViewDocument called with:', doc);

    // Si el documento ya tiene contenido completo, mostrarlo directamente
    if (doc.content) {
      console.log('✅ Document has content, showing preview directly');
      setSelectedDocument(doc);
      setShowDocPreview(true);
      return;
    }

    // Si solo tenemos el ID (desde búsqueda), cargar el documento completo
    console.log('⏳ Document has no content, fetching from API...');
    setIsLoading(true);
    try {
      console.log(`📡 Fetching: ${API_URL}/docs/${doc.id}`);
      const response = await axios.get(`${API_URL}/docs/${doc.id}`);
      console.log('✅ Document fetched:', response.data);
      setSelectedDocument(response.data);
      setShowDocPreview(true);
      console.log('✅ Modal should be showing now');
    } catch (error) {
      console.error('❌ Error loading document:', error);
      addSystemMessage(`✗ Error al cargar documento: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (content) => {
    if (!content) return '0 KB';
    const bytes = new Blob([content]).size;
    const kb = (bytes / 1024).toFixed(1);
    return `${kb} KB`;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('🔍 Searching for:', searchQuery);
    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        ...(searchFilters.projectId && { projectId: searchFilters.projectId }),
        ...(searchFilters.dateFrom && { dateFrom: searchFilters.dateFrom }),
        ...(searchFilters.dateTo && { dateTo: searchFilters.dateTo }),
        ...(searchFilters.fileType && { fileType: searchFilters.fileType }),
      });

      const url = `${API_URL}/docs/search?${params}`;
      console.log('📡 Search URL:', url);

      const response = await axios.get(url);
      console.log('✅ Search response:', response.data);

      setSearchResults(response.data.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      addSystemMessage(`✗ Error en la búsqueda: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const highlightText = (text, query) => {
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

  // Función para exportar un documento individual
  const exportDocument = async (documentId, format = 'txt') => {
    try {
      const response = await axios.get(
        `${API_URL}/docs/${documentId}/export?format=${format}`,
        { responseType: 'blob' }
      );

      // Crear un enlace de descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      addSystemMessage(`✓ Documento exportado como ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting document:', error);
      addSystemMessage(`✗ Error al exportar documento: ${error.message}`);
    }
  };

  // Función para exportar una respuesta de IA
  const exportAIResponse = async (message, format = 'txt') => {
    try {
      // Buscar el mensaje de pregunta anterior
      const messageIndex = messages.findIndex(m => m === message);
      const questionMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;

      const question = questionMessage?.role === 'user' ? questionMessage.content : 'Sin pregunta';
      const answer = message.content;
      const sources = message.sources || [];

      const response = await axios.post(
        `${API_URL}/query/export`,
        {
          question,
          answer,
          sources,
          format,
          title: 'Geronimo AI Response',
          metadata: {
            projectId: selectedProject,
            exportedAt: new Date().toISOString()
          }
        },
        { responseType: 'blob' }
      );

      // Crear un enlace de descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `geronimo_response_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      addSystemMessage(`✓ Respuesta exportada como ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting AI response:', error);
      addSystemMessage(`✗ Error al exportar respuesta: ${error.message}`);
    }
  };

  // Componente para el modal de duplicados
  const DuplicateAlertModal = ({ alert, onClose }) => {
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

  // Componente para el menú de exportación
  const ExportMenu = ({ message, onClose }) => (
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

  return (
    <div className="App">
      <header className="app-header">
        <h1>Geronimo</h1>
        <p>Asistente de documentación inteligente con IA</p>
      </header>

      <div className="main-container">
        {/* Sidebar */}
        <aside className="sidebar">
          <h2>Proyectos</h2>

          <div className="project-selector">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={projects.length === 0}
            >
              {projects.length === 0 ? (
                <option>No hay proyectos</option>
              ) : (
                projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
            <button
              className="create-project-btn"
              onClick={() => setShowCreateProject(!showCreateProject)}
              disabled={isLoading}
            >
              {showCreateProject ? '✕ Cancelar' : '+ Nuevo Proyecto'}
            </button>
          </div>

          {showCreateProject && (
            <div className="create-project-form">
              <h3>Crear Nuevo Proyecto</h3>
              <input
                type="text"
                placeholder="Nombre del proyecto"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                disabled={isLoading}
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                disabled={isLoading}
                rows={3}
              />
              <button
                className="submit-btn"
                onClick={handleCreateProject}
                disabled={isLoading || !newProjectName.trim()}
              >
                {isLoading ? 'Creando...' : 'Crear Proyecto'}
              </button>
            </div>
          )}

          <div className="upload-section">
            <h3>Subir Archivos</h3>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".txt,.md,.json,.js,.py,.java,.cpp,.html,.css"
              style={{ display: 'none' }}
            />
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📁</div>
              <p><strong>Arrastra archivos aquí</strong></p>
              <p>o haz clic para seleccionar</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="file-list">
                {uploadedFiles.slice(-5).reverse().map((file, index) => (
                  <div key={index} className="file-item">
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Content Area */}
        <main className="content-area">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 Chat
            </button>
            <button
              className={`tab ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
            >
              📊 Explorador
            </button>
            <button
              className={`tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              🔍 Búsqueda
            </button>
          </div>

          {/* Chat Section */}
          {activeTab === 'chat' && (
          <section className="chat-section">
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <p>Selecciona un proyecto y comienza a hacer preguntas</p>
                  <p style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>
                    También puedes subir archivos desde el panel lateral
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`message ${message.role}`}
                    >
                      <div className="message-header">
                        {message.role === 'user' ? 'Tú' :
                         message.role === 'assistant' ? 'Geronimo' : 'Sistema'}
                      </div>
                      <div className="message-content">
                        {message.content}
                      </div>
                      {message.role === 'assistant' && (
                        <div className="message-actions">
                          <button
                            className="btn-export-response"
                            onClick={() => setShowExportMenu(showExportMenu === message.timestamp ? null : message.timestamp)}
                            title="Exportar respuesta"
                          >
                            💾 Exportar
                          </button>
                          {showExportMenu === message.timestamp && (
                            <ExportMenu
                              message={message}
                              onClose={() => setShowExportMenu(null)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message assistant">
                      <div className="message-header">Geronimo</div>
                      <div className="message-content">
                        <div className="loading"></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="chat-input-area">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={selectedProject ?
                  "Escribe tu pregunta sobre el proyecto..." :
                  "Selecciona un proyecto primero"
                }
                disabled={!selectedProject || isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || !selectedProject || isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </section>
          )}

          {/* Explorer Section */}
          {activeTab === 'explorer' && (
          <section className="explorer-section">
            <div className="explorer-header">
              <h2>Explorador de Bases de Datos</h2>
              <p>Visualiza y administra documentos de todos los proyectos</p>
            </div>

            <div className="explorer-content">
              {projects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📂</div>
                  <p>No hay proyectos todavía</p>
                  <p style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>
                    Crea un proyecto para empezar
                  </p>
                </div>
              ) : (
                <div className="projects-list">
                  {projects.map(project => (
                    <div key={project.id} className="project-item">
                      <div
                        className="project-header"
                        onClick={() => toggleProjectExpand(project.id)}
                      >
                        <span className="expand-icon">
                          {expandedProjects[project.id] ? '▼' : '▶'}
                        </span>
                        <span className="project-name">{project.name}</span>
                        <span className="doc-count">
                          {project.documents?.length || 0} docs
                        </span>
                      </div>

                      {expandedProjects[project.id] && (
                        <div className="documents-list">
                          {project.documents?.length === 0 ? (
                            <div className="no-documents">
                              <span>📄</span> Sin documentos
                            </div>
                          ) : (
                            project.documents.map(doc => (
                              <div key={doc.id} className="document-item">
                                <div className="doc-main">
                                  <span className="doc-icon">📄</span>
                                  <div className="doc-info">
                                    <div className="doc-path">{doc.path}</div>
                                    <div className="doc-meta">
                                      <span>📅 {formatDate(doc.createdAt)}</span>
                                      <span>💾 {formatFileSize(doc.content)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="doc-actions">
                                  <button
                                    className="btn-view"
                                    onClick={() => handleViewDocument(doc)}
                                    title="Ver contenido"
                                  >
                                    👁️
                                  </button>
                                  <button
                                    className="btn-delete"
                                    onClick={() => handleDeleteDocument(doc.id, doc.path)}
                                    disabled={isLoading}
                                    title="Eliminar documento"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
          )}

          {/* Search Section */}
          {activeTab === 'search' && (
          <section className="search-section">
            <div className="search-hero">
              <div className="search-hero-content">
                <h1 className="search-hero-title">🔍 Busca en todo tu sistema</h1>
                <p className="search-hero-subtitle">
                  Encuentra archivos, documentos y contenido en todos tus proyectos
                </p>

                {/* Enhanced Search Bar */}
                <div className="search-bar-enhanced">
                  <div className="search-input-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Escribe para buscar en documentos, títulos, contenido..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      disabled={isSearching}
                      className="search-input-enhanced"
                    />
                    {searchQuery && (
                      <button
                        className="search-clear-btn"
                        onClick={() => setSearchQuery('')}
                        title="Limpiar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="search-btn-enhanced"
                  >
                    {isSearching ? (
                      <>
                        <span className="search-btn-spinner">⏳</span> Buscando...
                      </>
                    ) : (
                      <>
                        <span>🔍</span> Buscar
                      </>
                    )}
                  </button>
                </div>

                {/* Search stats */}
                {searchResults.length > 0 && (
                  <div className="search-stats">
                    <span className="search-stats-count">
                      {searchResults.length} resultado{searchResults.length > 1 ? 's' : ''} encontrado{searchResults.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="search-container">

              {/* Filters */}
              <div className="search-filters">
                <select
                  value={searchFilters.projectId}
                  onChange={(e) => setSearchFilters({...searchFilters, projectId: e.target.value})}
                >
                  <option value="">Todos los proyectos</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>

                <input
                  type="date"
                  placeholder="Desde"
                  value={searchFilters.dateFrom}
                  onChange={(e) => setSearchFilters({...searchFilters, dateFrom: e.target.value})}
                />

                <input
                  type="date"
                  placeholder="Hasta"
                  value={searchFilters.dateTo}
                  onChange={(e) => setSearchFilters({...searchFilters, dateTo: e.target.value})}
                />

                <select
                  value={searchFilters.fileType}
                  onChange={(e) => setSearchFilters({...searchFilters, fileType: e.target.value})}
                >
                  <option value="">Todos los tipos</option>
                  <option value="md">Markdown (.md)</option>
                  <option value="txt">Texto (.txt)</option>
                  <option value="json">JSON (.json)</option>
                  <option value="js">JavaScript (.js)</option>
                  <option value="ts">TypeScript (.ts)</option>
                  <option value="py">Python (.py)</option>
                </select>
              </div>

              {/* Results */}
              <div className="search-results">
                {searchResults.length === 0 && !isSearching && searchQuery && (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <p>No se encontraron resultados</p>
                    <p style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>
                      Intenta con otros términos de búsqueda
                    </p>
                  </div>
                )}

                {searchResults.length === 0 && !isSearching && !searchQuery && (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <p>Escribe algo para buscar</p>
                    <p style={{fontSize: '0.85rem', marginTop: '0.5rem'}}>
                      Busca en paths, títulos o contenido de documentos
                    </p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="results-list">
                    {searchResults.map(result => (
                      <div key={result.id} className="result-item">
                        <div className="result-header">
                          <span className="result-icon">📄</span>
                          <div className="result-info">
                            <div className="result-path">
                              {highlightText(result.path, searchQuery)}
                            </div>
                            <div className="result-meta">
                              <span className="result-project">📁 {result.projectName}</span>
                              <span className="result-date">📅 {formatDate(result.createdAt)}</span>
                              <span className="result-match">
                                {result.matchType === 'path' && '🎯 Match en ruta'}
                                {result.matchType === 'title' && '🎯 Match en título'}
                                {result.matchType === 'content' && '🎯 Match en contenido'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {result.snippet && (
                          <div className="result-snippet">
                            {highlightText(result.snippet, searchQuery)}
                          </div>
                        )}
                        <div className="result-actions">
                          <button
                            className="btn-view"
                            onClick={() => handleViewDocument(result)}
                          >
                            👁️ Ver
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
          )}
        </main>

        {/* Document Preview Modal - Global (works from any tab) */}
        {showDocPreview && selectedDocument && (
          <div className="modal-overlay" onClick={() => setShowDocPreview(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>📄 {selectedDocument.path}</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowDocPreview(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="doc-metadata">
                  <span><strong>Título:</strong> {selectedDocument.title || 'Sin título'}</span>
                  <span><strong>Creado:</strong> {formatDate(selectedDocument.createdAt)}</span>
                  <span><strong>Tamaño:</strong> {formatFileSize(selectedDocument.content)}</span>
                </div>
                <div className="doc-content-preview">
                  <pre>{selectedDocument.content}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de alerta de duplicados */}
        <DuplicateAlertModal
          alert={duplicateAlert}
          onClose={() => setDuplicateAlert(null)}
        />
      </div>
    </div>
  );
}

export default App;
