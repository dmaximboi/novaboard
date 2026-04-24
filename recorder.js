// recorder.js - Screen and voice recording logic

const recorder = {
  isRecording: false,
  mediaRecorder: null,
  recordedChunks: [],
  stream: null,

  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  },

  async startRecording() {
    const btn = document.getElementById('recordBtn');
    const includeMic = document.getElementById('recordAudioToggle').checked;

    try {
      // 1. Get Screen Stream (the board)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser'
        },
        audio: true // try to capture system/tab audio if possible
      });

      let finalStream = screenStream;

      // 2. If Mic is enabled, get Mic Stream and combine
      if (includeMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Combine audio tracks from mic and screen (if any)
          const audioContext = new AudioContext();
          const dest = audioContext.createMediaStreamDestination();
          
          if (screenStream.getAudioTracks().length > 0) {
            const screenSource = audioContext.createMediaStreamSource(screenStream);
            screenSource.connect(dest);
          }
          
          if (micStream.getAudioTracks().length > 0) {
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(dest);
          }

          // Create a new stream with video from screen and combined audio
          const tracks = [
            ...screenStream.getVideoTracks(),
            ...dest.stream.getAudioTracks()
          ];
          finalStream = new MediaStream(tracks);
          
        } catch (micErr) {
          console.warn("Could not capture microphone:", micErr);
          // Fallback to screen stream only
        }
      }

      this.stream = finalStream;
      
      // Stop recording if user stops sharing via browser UI
      this.stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (this.isRecording) this.stopRecording();
      });

      // 3. Setup MediaRecorder
      const options = { mimeType: 'video/webm; codecs=vp9' };
      // Fallback if vp9 is not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm'; 
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.downloadVideo();
      };

      // 4. Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      
      // Update UI
      btn.classList.add('recording');
      btn.innerHTML = '⏹ Stop Record';
      app.setStatus('writing', 'Recording...');

    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not start recording. " + err.message);
    }
  },

  stopRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') return;
    
    this.mediaRecorder.stop();
    this.stream.getTracks().forEach(track => track.stop());
    
    this.isRecording = false;
    
    // Update UI
    const btn = document.getElementById('recordBtn');
    btn.classList.remove('recording');
    btn.innerHTML = '⏺ Record';
    app.setStatus('idle', 'Recording Saved');
  },

  downloadVideo() {
    const blob = new Blob(this.recordedChunks, {
      type: 'video/webm'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    document.body.appendChild(a);
    a.style.display = 'none';
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `NovaClass-Recording-${timestamp}.webm`;
    
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};
