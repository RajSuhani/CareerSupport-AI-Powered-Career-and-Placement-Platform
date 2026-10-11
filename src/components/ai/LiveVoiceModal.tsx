import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  X,
  AlertCircle,
  Radio,
} from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing Live Audio API...');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const scheduledTimeRef = useRef<number>(0);

  // Convert float32 audio buffer to 16-bit PCM base64
  const pcmToBase64 = (channelData: Float32Array): string => {
    const pcm16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Play audio chunk at 24kHz
  const playAudioChunk = (audioCtx: AudioContext, base64Audio: string) => {
    try {
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      if (scheduledTimeRef.current < currentTime) {
        scheduledTimeRef.current = currentTime;
      }

      sourceNode.start(scheduledTimeRef.current);
      scheduledTimeRef.current += audioBuffer.duration;

      setIsModelSpeaking(true);
      sourceNode.onended = () => {
        if (audioCtx.currentTime >= scheduledTimeRef.current - 0.05) {
          setIsModelSpeaking(false);
        }
      };
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  };

  const startLiveConversation = async () => {
    setError(null);
    setIsConnecting(true);
    setStatusMessage('Connecting to Gemini 3.8 Live API...');

    try {
      // 1. Setup audio contexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioCtxRef.current = new AudioCtx({ sampleRate: 16000 });
      outputAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
      scheduledTimeRef.current = outputAudioCtxRef.current.currentTime;

      // 2. Request mic stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 3. Connect to server WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setStatusMessage('Live Conversation Active. Say hello or ask for a mock interview question!');

        // Setup microphone capture pipeline
        if (!inputAudioCtxRef.current) return;
        const source = inputAudioCtxRef.current.createMediaStreamSource(stream);
        const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(inputAudioCtxRef.current.destination);

        processor.onaudioprocess = (e) => {
          if (isMuted) return;
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const base64Audio = pcmToBase64(inputData);
            ws.send(JSON.stringify({ audio: base64Audio }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'audio' && data.audio && outputAudioCtxRef.current) {
            playAudioChunk(outputAudioCtxRef.current, data.audio);
          } else if (data.type === 'interrupted') {
            // User interrupted model; clear audio queue
            if (outputAudioCtxRef.current) {
              scheduledTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            setIsModelSpeaking(false);
          } else if (data.type === 'error') {
            setError(data.error);
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setError('WebSocket error connecting to Live API');
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setStatusMessage('Call ended.');
      };
    } catch (err: any) {
      console.error('Live voice initialization failed:', err);
      setError(err?.message || 'Failed to access microphone or connect to Live API');
      setIsConnecting(false);
      setIsConnected(false);
    }
  };

  const stopConversation = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsModelSpeaking(false);
  };

  useEffect(() => {
    if (isOpen) {
      startLiveConversation();
    } else {
      stopConversation();
    }
    return () => {
      stopConversation();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#131b2e] to-[#0b0f19] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col items-center text-center space-y-6">
        {/* Glow backdrop */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
            isModelSpeaking
              ? 'bg-purple-600/30 scale-125'
              : isConnected
              ? 'bg-indigo-600/20 scale-100'
              : 'bg-slate-700/10'
          }`}
        />

        {/* Top Controls */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="font-semibold text-white">Gemini 3.8 Live API</span>
          </div>

          <button
            onClick={() => {
              stopConversation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Voice Visualizer Orb */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated concentric rings */}
          {isConnected && (
            <>
              <div
                className={`absolute w-44 h-44 rounded-full border border-purple-500/20 transition-all duration-700 ${
                  isModelSpeaking ? 'scale-125 animate-ping opacity-30' : 'scale-100 opacity-20'
                }`}
              />
              <div
                className={`absolute w-36 h-36 rounded-full border border-indigo-500/30 transition-all duration-500 ${
                  isModelSpeaking ? 'scale-110 opacity-40' : 'scale-95 opacity-20'
                }`}
              />
            </>
          )}

          {/* Core Orb */}
          <div
            className={`w-28 h-28 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
              isModelSpeaking
                ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 scale-105 shadow-purple-500/40'
                : isConnected
                ? 'bg-gradient-to-tr from-indigo-700 to-purple-800 scale-100 shadow-indigo-500/20'
                : 'bg-slate-800'
            }`}
          >
            {isModelSpeaking ? (
              <Volume2 className="w-10 h-10 text-white animate-bounce" />
            ) : isConnected ? (
              <Mic className="w-10 h-10 text-white animate-pulse" />
            ) : (
              <MicOff className="w-10 h-10 text-slate-500" />
            )}
          </div>
        </div>

        {/* Title and Status */}
        <div className="space-y-1.5 z-10">
          <h3 className="text-lg font-bold text-white">
            {isModelSpeaking
              ? 'Gemini Live is Speaking...'
              : isConnected
              ? 'Listening to You...'
              : 'Connecting Live Voice...'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {statusMessage}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex items-center justify-center gap-4 pt-2 z-10">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            disabled={!isConnected}
            className={`p-3.5 rounded-full border transition-all ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={() => {
              stopConversation();
              onClose();
            }}
            className="px-6 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Voice Session</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 pt-2">
          Real-time bi-directional audio streamed at 16kHz PCM (input) & 24kHz (output)
        </div>
      </div>
    </div>
  );
};
