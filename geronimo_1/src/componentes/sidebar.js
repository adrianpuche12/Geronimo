import React from 'react';
import '../styles/sidebar.css';

export const Sidebar = ({
  projects,
  selectedProject,
  setSelectedProject,
  isLoading,
  showCreateProject,
  setShowCreateProject,
  newProjectName,
  setNewProjectName,
  newProjectDescription,
  setNewProjectDescription,
  handleCreateProject,
  fileInputRef,
  handleFileSelect,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  uploadedFiles
}) => {
  return (
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
            <>
              <option value="all">🌐 Todos los proyectos</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </>
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
        {selectedProject === 'all' ? (
          <div className="upload-area disabled">
            <div className="upload-icon">⚠️</div>
            <p><strong>Selecciona un proyecto específico</strong></p>
            <p>para subir archivos</p>
          </div>
        ) : (
          <>
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
          </>
        )}

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
  );
};

export default Sidebar;
