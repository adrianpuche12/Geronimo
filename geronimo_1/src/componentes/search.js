import React from 'react';
import '../styles/search.css';
import { formatDate, highlightText } from './utilities';

export const Search = ({
  searchQuery,
  setSearchQuery,
  isSearching,
  handleSearch,
  searchResults,
  searchFilters,
  setSearchFilters,
  projects,
  handleViewDocument
}) => {
  return (
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
  );
};

export default Search;
