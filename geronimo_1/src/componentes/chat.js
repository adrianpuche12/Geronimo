import React from 'react';
import '../styles/chat.css';
import '../styles/utilities.css';
import { ExportMenu } from './utilities';

export const Chat = ({
  messages,
  messagesEndRef,
  isLoading,
  selectedProject,
  inputMessage,
  setInputMessage,
  handleKeyPress,
  handleSendMessage,
  showExportMenu,
  setShowExportMenu,
  exportAIResponse
}) => {
  return (
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
                        exportAIResponse={exportAIResponse}
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
  );
};

export default Chat;
