"use client";

import { useState, useRef } from "react";

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const activeStream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<NodeJS.Timeout | null>(null);
  const isCanceled = useRef<boolean>(false);

  const startRecording = async () => {
    try {
      // Clear any remaining state blocks before starting
      if (timer.current) clearInterval(timer.current);
      isCanceled.current = false;
      chunks.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      
      activeStream.current = stream;

      // Select supported mimeType
      let selectedMimeType = "audio/webm";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          selectedMimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          selectedMimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          selectedMimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          selectedMimeType = "audio/ogg;codecs=opus";
        }
      }

      mediaRecorder.current = new MediaRecorder(stream, selectedMimeType ? { mimeType: selectedMimeType } : undefined);

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        // Clean up hardware tracks cleanly no matter how the recording stopped
        stream.getTracks().forEach((t) => t.stop());
        activeStream.current = null;

        // If the user cancelled, abandon the collected data chunks
        if (isCanceled.current) {
          chunks.current = [];
          setAudioBlob(null);
          setDuration(0);
        } else {
          const finalMime = selectedMimeType || "audio/webm";
          const blob = new Blob(chunks.current, { type: finalMime });
          setAudioBlob(blob);
        }
      };

      mediaRecorder.current.start();
      setRecording(true);
      setDuration(0);

      timer.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone capture error:", err);
      alert(
        "Microphone access denied. Please allow microphone access to record voice notes."
      );
    }
  };

  const stopRecording = () => {
    if (timer.current) clearInterval(timer.current);
    
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      isCanceled.current = false;
      mediaRecorder.current.stop();
    }
    setRecording(false);
  };

  const cancelRecording = () => {
    if (timer.current) clearInterval(timer.current);
    isCanceled.current = true; // Mark as canceled so the onstop handler discards the chunks
    
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    } else if (activeStream.current) {
      // Fallback clean-up if recorder never spun up fully
      activeStream.current.getTracks().forEach((t) => t.stop());
      activeStream.current = null;
    }

    setRecording(false);
    setAudioBlob(null);
    setDuration(0);
  };

  const resetAudio = () => {
    if (timer.current) clearInterval(timer.current);
    chunks.current = [];
    setAudioBlob(null);
    setDuration(0);
  };

  return {
    recording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    resetAudio,
  };
}