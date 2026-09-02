/**
 * Native WebRTC Calling Helper & Configuration
 * Provides STUN configuration and stream management for 1-on-1 WhatsApp-style calls.
 */

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};

export async function getLocalMediaStream(isVideo: boolean): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: isVideo
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        }
      : false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (isVideo) {
      console.warn("Camera not found or permission denied, falling back to audio only:", err);
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    throw err;
  }
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}
