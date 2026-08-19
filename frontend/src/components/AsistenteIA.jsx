import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export default function AsistenteIA() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: '¡Hola! Soy el asistente virtual de Conecta Oficios. ¿Qué oficio, servicio o emergencia tienes hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Función para limpiar asteriscos y formato de la IA
  const cleanTextForDisplay = (text) => {
    return text.replace(/[*_#`]/g, ''); // Elimina asteriscos, guiones bajos, michis y comillas de código
  };

  // Función de voz con síntesis del navegador
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const cleanSpeech = cleanTextForDisplay(text);
    
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = 'es-AR';
    utterance.rate = 1.05;

    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
      
      const maleVoice = spanishVoices.find(v => 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('pablo') || 
        v.name.toLowerCase().includes('mateo') ||
        v.name.toLowerCase().includes('diego') ||
        v.name.toLowerCase().includes('raul') ||
        v.name.toLowerCase().includes('david')
      );

      if (maleVoice) {
        utterance.voice = maleVoice;
      } else if (spanishVoices.length > 0) {
        const fallbackMale = spanishVoices.find(v => 
          !v.name.toLowerCase().includes('female') && 
          !v.name.toLowerCase().includes('helena') && 
          !v.name.toLowerCase().includes('laura')
        );
        if (fallbackMale) utterance.voice = fallbackMale;
      }

      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
    }
  };

  const handleListen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta voz.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => setInput(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Actúa como el asistente virtual experto de "Conecta Oficios". 
                Cuando un usuario reporte un problema, falla o emergencia (electricidad, plomería, gas, computación, vehículos, cerrajería, refrigeración):
                1. Brinda pautas, consejos de seguridad y pasos de emergencia cortos y ordenados.
                2. Mantén un tono tranquilo, amable, empático y conciso.
                3. NO uses asteriscos ni símbolos de formato complejos en tu respuesta para que sea fácil de leer en pantallas de chat.
                4. Al final, recuerda que para una solución definitiva puede contratar un especialista verificado en la plataforma.
                
                Mensaje del usuario: "${userMessage}"`
              }
            ]
          }
        ]
      });

      const rawReply = response.text || 'Lo siento, no pude procesar tu consulta.';
      const replyText = cleanTextForDisplay(rawReply);

      setMessages((prev) => [...prev, { role: 'model', text: replyText }]);
      speakText(replyText);
      
    } catch (error) {
      console.error("Error en IA:", error);
      setMessages((prev) => [...prev, { role: 'model', text: 'Error de conexión. Intenta más tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000, fontFamily: 'sans-serif' }}>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '50px', padding: '12px 20px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          💬 Asistente IA
        </button>
      )}

      {isOpen && (
        <div style={{ width: '320px', height: '480px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
          <div style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
            <span>Asistente Conecta Oficios</span>
            <button onClick={() => { setIsOpen(false); window.speechSynthesis.cancel(); }} style={{ background: 'none', border: 'none', color: 'white', fontSize: '16px', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f9fafb' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: msg.role === 'user' ? '#2563eb' : '#e5e7eb', color: msg.role === 'user' ? 'white' : '#1f2937', padding: '8px 12px', borderRadius: '8px', maxWidth: '85%', fontSize: '14px', lineHeight: '1.4', whiteSpace: 'pre-line' }}>
                {msg.text}
              </div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-start', backgroundColor: '#e5e7eb', color: '#6b7280', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontStyle: 'italic' }}>Escuchando y procesando...</div>}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '8px', borderTop: '1px solid #e5e7eb', backgroundColor: 'white', alignItems: 'center', gap: '4px' }}>
            <button type="button" onClick={handleListen} style={{ backgroundColor: isListening ? '#dc2626' : '#f3f4f6', color: isListening ? 'white' : '#374151', border: '1px solid #d1d5db', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', fontSize: '14px' }}>
              {isListening ? '🔴' : '🎤'}
            </button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe o habla..." style={{ flex: '1', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', fontSize: '14px' }} />
            <button type="submit" disabled={loading} style={{ backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontWeight: 'bold' }}>Enviar</button>
          </form>
        </div>
      )}
    </div>
  );
}