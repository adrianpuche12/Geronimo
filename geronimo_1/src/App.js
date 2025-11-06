import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './styles/layout.css';
import { DuplicateAlertModal, DocumentPreviewModal } from './componentes/modal';
import { Sidebar } from './componentes/sidebar';
import { Chat } from './componentes/chat';
import { Explorer } from './componentes/explorer';
import { Search } from './componentes/search';
import { formatDate, formatFileSize } from './componentes/utilities';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Función para exportar un documento individual (comentada por no estar en uso actualmente)
  // const exportDocument = async (documentId, format = 'txt') => {
  //   try {
  //     const response = await axios.get(
  //       `${API_URL}/docs/${documentId}/export?format=${format}`,
  //       { responseType: 'blob' }
  //     );

  //     // Crear un enlace de descarga
  //     const url = window.URL.createObjectURL(new Blob([response.data]));
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.setAttribute('download', `document.${format}`);
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();

  //     addSystemMessage(`✓ Documento exportado como ${format.toUpperCase()}`);
  //   } catch (error) {
  //     console.error('Error exporting document:', error);
  //     addSystemMessage(`✗ Error al exportar documento: ${error.message}`);
  //   }
  // };

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

  return (
    <div className="App">
      <header className="app-header">
        <h1>Geronimo</h1>
        <p>Asistente de documentación inteligente con IA</p>
      </header>

      <div className="main-container">
        {/* Sidebar */}
        <Sidebar
          projects={projects}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          isLoading={isLoading}
          showCreateProject={showCreateProject}
          setShowCreateProject={setShowCreateProject}
          newProjectName={newProjectName}
          setNewProjectName={setNewProjectName}
          newProjectDescription={newProjectDescription}
          setNewProjectDescription={setNewProjectDescription}
          handleCreateProject={handleCreateProject}
          fileInputRef={fileInputRef}
          handleFileSelect={handleFileSelect}
          isDragging={isDragging}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          uploadedFiles={uploadedFiles}
        />

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
            <Chat
              messages={messages}
              messagesEndRef={messagesEndRef}
              isLoading={isLoading}
              selectedProject={selectedProject}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              handleKeyPress={handleKeyPress}
              handleSendMessage={handleSendMessage}
              showExportMenu={showExportMenu}
              setShowExportMenu={setShowExportMenu}
              exportAIResponse={exportAIResponse}
            />
          )}

          {/* Explorer Section */}
          {activeTab === 'explorer' && (
            <Explorer
              projects={projects}
              expandedProjects={expandedProjects}
              toggleProjectExpand={toggleProjectExpand}
              handleViewDocument={handleViewDocument}
              handleDeleteDocument={handleDeleteDocument}
              isLoading={isLoading}
            />
          )}

          {/* Search Section */}
          {activeTab === 'search' && (
            <Search
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearching={isSearching}
              handleSearch={handleSearch}
              searchResults={searchResults}
              searchFilters={searchFilters}
              setSearchFilters={setSearchFilters}
              projects={projects}
              handleViewDocument={handleViewDocument}
            />
          )}
        </main>

        {/* Document Preview Modal - Global (works from any tab) */}
        {showDocPreview && selectedDocument && (
          <DocumentPreviewModal
            document={selectedDocument}
            onClose={() => setShowDocPreview(false)}
            formatDate={formatDate}
            formatFileSize={formatFileSize}
          />
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
