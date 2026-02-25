(function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  
  // Use logical pixel dimensions for consistency with macOS status bar
  const w = 260; // Further reduced from 320 to 260 (since time moved left)
  const h = 22;  // Standard macOS status bar height
  
  // HiDPI / Retina support
  const dpr = window.devicePixelRatio || 2;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const TASK_NAME_MAX_WIDTH = 180; // Increased from 140 to allow full display of 10 chars + spaces without squishing
  const TIME_X = 170; // Position for time

  function renderTrayImage(taskNamePart, timePart) {
    // Clear with transparent
    ctx.clearRect(0, 0, w, h);
    
    ctx.fillStyle = '#ffffff';
    // Use smaller font size appropriate for 22px height (macOS system font usually ~13-14px)
    ctx.font = '14px -apple-system, "PingFang SC", "Helvetica Neue", sans-serif';
    ctx.textBaseline = 'middle';

    const y = h / 2 + 1; // Slight offset for visual centering

    if (taskNamePart) {
      // Just draw what main.js sends (which is exactly 10 chars, possibly including full-width spaces)
      // We removed the max width constraint on fillText to prevent squishing.
      // 10 full-width chars at 14px font is approx 140px. 180px is safe.
      ctx.fillText(taskNamePart, 0, y); 
    }
    
    if (timePart) {
      ctx.fillText(timePart, TIME_X, y);
    }

    const dataUrl = canvas.toDataURL('image/png');
    if (window.trayAPI) window.trayAPI.sendImage(dataUrl);
  }

  // Web Audio 10 Presets
  const SoundLibrary = {
    // 1. Default (Beep): Classic simple beep
    'default': (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    },
    // 2. Chime: Soft, bell-like
    'chime': (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    },
    // 3. Success: Ascending major triad
    'success': (ctx) => {
      const now = ctx.currentTime;
      [440, 554.37, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
      });
    },
    // 4. Alert: Sharp, attention-grabbing
    'alert': (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    },
    // 5. Drop: Descending slide
    'drop': (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    },
    // 6. Rise: Ascending slide
    'rise': (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    },
    // 7. Electronic: Square wave retro
    'electronic': (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.setValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    },
    // 8. Magic: Twinkle effect
    'magic': (ctx) => {
      const now = ctx.currentTime;
      [880, 1108, 1318, 1760].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.05, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.5);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.5);
      });
    },
    // 9. Doorbell: Ding-Dong
    'doorbell': (ctx) => {
      const now = ctx.currentTime;
      // Ding
      let osc = ctx.createOscillator();
      let gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 660; // E5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
      osc.start(now);
      osc.stop(now + 1.0);
      // Dong
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = 523.25; // C5
      gain.gain.setValueAtTime(0.2, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
      osc.start(now + 0.8);
      osc.stop(now + 2.0);
    },
    // 10. Zap: Laser sound
    'zap': (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }
  };

  function playSound(soundId) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const player = SoundLibrary[soundId] || SoundLibrary['default'];
      player(ctx);
    } catch (e) {
      console.error('Play sound error:', e);
    }
  }

  if (window.trayAPI) {
    window.trayAPI.onRenderRequest((data) => {
      renderTrayImage(
        data.taskNamePart || '',
        data.timePart || '',
      );
    });
    window.trayAPI.onPlaySound((soundId) => {
      playSound(soundId);
    });
  }
})();
