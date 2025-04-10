import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { assets } from '@/assets/assets';
import toast from 'react-hot-toast';

const VoiceAssistant = ({ onTranscript, isListening, setIsListening, isSpeaking, setIsSpeaking }) => {
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  // Initialize speech recognition on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if the browser supports SpeechRecognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setIsSupported(false);
        toast.error('Speech recognition is not supported in your browser');
        return;
      }

      // Initialize speech recognition
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      // Set up event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const newTranscript = event.results[current][0].transcript;
        setTranscript(newTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        toast.error(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
    }

    return () => {
      // Clean up
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [setIsListening]);

  // Handle voice-to-text conversion
  const startListening = () => {
    if (!isSupported) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }

    try {
      recognitionRef.current.start();
      toast.success('Listening...', { id: 'listening' });
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast.error('Failed to start listening');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        
        // Send the final transcript to parent component
        if (transcript.trim()) {
          onTranscript(transcript);
        }
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }
  };

  // Handle text-to-speech conversion
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported in your browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Set up events
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error', event);
      setIsSpeaking(false);
      toast.error('Error speaking text');
    };

    // Speak the text
    window.speechSynthesis.speak(utterance);
    speechSynthesisRef.current = utterance;
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Voice input button */}
      <button
        type="button"
        className={`p-2 rounded-full ${isListening ? 'bg-red-600' : 'bg-[#404045]'} hover:bg-[#4D4D52] transition-colors`}
        onClick={isListening ? stopListening : startListening}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          fill="currentColor" 
          viewBox="0 0 16 16"
          className={isListening ? 'animate-pulse' : ''}
        >
          <path d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1"/>
          <path d="M3.05 11a.5.5 0 0 1 1 0v.5c0 .666.251 1.582.794 2.014.544.432 1.183.586 1.856.586.673 0 1.312-.154 1.856-.586.543-.432.794-1.348.794-2.014v-.5a.5.5 0 0 1 1 0v.5c0 .666-.251 1.582-.794 2.014-.544.432-1.183.586-1.856.586-.673 0-1.312-.154-1.856-.586-.543-.432-.794-1.348-.794-2.014Z"/>
        </svg>
      </button>

      {/* Text-to-speech button (to be used by parent component) */}
      <button
        type="button"
        className={`p-2 rounded-full ${isSpeaking ? 'bg-blue-600' : 'bg-[#404045]'} hover:bg-[#4D4D52] transition-colors`}
        onClick={isSpeaking ? stopSpeaking : () => {}}
        title={isSpeaking ? 'Stop speaking' : 'Text-to-speech'}
        disabled={!isSpeaking}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          fill="currentColor" 
          viewBox="0 0 16 16"
          className={isSpeaking ? 'animate-pulse' : ''}
        >
          <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
          <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
          <path d="M8.707 11.182A4.5 4.5 0 0 0 10.025 8a4.5 4.5 0 0 0-1.318-3.182L8 5.525A3.5 3.5 0 0 1 9.025 8 3.5 3.5 0 0 1 8 10.475zM6.717 3.55A.5.5 0 0 1 7.22 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.587-1.95a.5.5 0 0 1 .305-.1"/>
        </svg>
      </button>

      {isListening && (
        <span className="text-xs animate-pulse text-red-400">Listening...</span>
      )}
    </div>
  );
};

export default VoiceAssistant; 