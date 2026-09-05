'use client';

import { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onRecordingDelete?: () => void;
  existingVoiceUrl?: string;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onRecordingDelete,
  existingVoiceUrl,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingVoiceUrl || null);
  const [error, setError] = useState<string>('');
  const [isConfirmed, setIsConfirmed] = useState(!!existingVoiceUrl); // Track if recording is confirmed

  // Refs to prevent duplicate recordings
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false); // Prevent duplicate processing

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Cleanup existing recording URL when deleted
  useEffect(() => {
    if (audioUrl && !existingVoiceUrl && !isConfirmed) {
      // Only revoke if it's a new blob URL, not an existing server URL
      return () => {
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
      };
    }
  }, [audioUrl, existingVoiceUrl, isConfirmed]);

  const cleanup = () => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  const startRecording = async () => {
    // Prevent starting if already recording or processing
    if (isRecording || isProcessingRef.current) return;

    try {
      setError('');
      isProcessingRef.current = true;

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder with proper MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available - collect chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop - create blob ONCE
      mediaRecorder.onstop = () => {
        // Prevent duplicate processing
        if (audioChunksRef.current.length === 0 || !isProcessingRef.current) {
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);
        setIsConfirmed(false); // Not confirmed yet

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        isProcessingRef.current = false;
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        cleanup();
        isProcessingRef.current = false;
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Recording error:', err);

      let errorMessage = 'Failed to start recording.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission denied. Please allow access.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Microphone is busy or not readable. Check other apps.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Microphone does not match requirements.';
      } else {
        errorMessage = 'Failed to start recording. Please check permissions and connection.';
      }

      setError(errorMessage);
      cleanup();
      isProcessingRef.current = false;
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsRecording(false);

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop recording - will trigger onstop event
      mediaRecorderRef.current.stop();
    }
  };

  const confirmRecording = () => {
    if (audioBlob && !isConfirmed) {
      setIsConfirmed(true);
      onRecordingComplete(audioBlob);
    }
  };

  const deleteRecording = () => {
    // Revoke blob URL if it exists
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsConfirmed(false);
    isProcessingRef.current = false;

    if (onRecordingDelete) {
      onRecordingDelete();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Voice Note</h3>
        {isRecording && (
          <span className="text-xs text-red-600 font-medium animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            Recording
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Recording Controls - Show when no audio exists */}
        {!audioUrl && !isRecording && (
          <button
            type="button"
            onClick={startRecording}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            Start Recording
          </button>
        )}

        {/* Recording in Progress */}
        {isRecording && (
          <div className="space-y-3">
            <div className="flex items-center justify-center">
              <div className="text-2xl font-mono text-gray-700">
                {formatTime(recordingTime)}
              </div>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
              Stop Recording
            </button>
          </div>
        )}

        {/* Audio Preview - Show after recording stops */}
        {audioUrl && !isRecording && (
          <div className="space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full"
                controlsList="nodownload"
              />
            </div>

            {!isConfirmed && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={deleteRecording}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  🗑️ Delete
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  🔄 Re-record
                </button>
                <button
                  type="button"
                  onClick={confirmRecording}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  ✓ Confirm
                </button>
              </div>
            )}

            {isConfirmed && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 font-medium flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Recording confirmed
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={deleteRecording}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteRecording();
                      // setTimeout to ensure state clears before starting? 
                      // Actually startRecording checks isRecording, so we just need to reset.
                      // But we want to open the recorder controls. deleteRecording does that.
                    }}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-xs font-medium transition-colors"
                  >
                    Replace / Re-record
                  </button>
                </div>
              </div>
            )}

            {!isConfirmed && (
              <p className="text-xs text-gray-500 text-center">
                Preview your recording, then click Confirm to save with order
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}