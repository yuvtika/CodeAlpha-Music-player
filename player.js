/**
 * SoundScape — Music Player Logic
 *
 * Features:
 *  • Programmatic WAV audio generation (no external files needed)
 *  • Play / Pause / Next / Previous
 *  • Seekable progress bar & volume slider
 *  • Playlist with click-to-play
 *  • Autoplay, Shuffle, Repeat modes
 *  • Keyboard shortcuts
 *  • Ambient background colour-wash from album art
 */

(() => {
  'use strict';

  // ═══════════════════════════════════════════════════════
  //  AUDIO GENERATION — create short melodies as WAV blobs
  // ═══════════════════════════════════════════════════════

  const SAMPLE_RATE = 44100;

  /** Musical note frequencies (octave 3-5) */
  const NOTE = {
    C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
    C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77,
    REST: 0
  };

  /**
   * Generate a PCM Float32 buffer for a melody.
   * Each note = { freq, dur (seconds) }
   * Supports harmonics for richer timbre.
   */
  function generateMelody(notes, { volume = 0.3, harmonics = [1], decay = 3, loopTo = 0, totalDuration = 30 } = {}) {
    const totalSamples = Math.ceil(totalDuration * SAMPLE_RATE);
    const data = new Float32Array(totalSamples);

    let sampleIdx = 0;
    let noteIdx = 0;

    while (sampleIdx < totalSamples) {
      const note = notes[noteIdx % notes.length];
      const noteSamples = Math.ceil(note.dur * SAMPLE_RATE);

      for (let i = 0; i < noteSamples && sampleIdx < totalSamples; i++, sampleIdx++) {
        if (note.freq === 0) continue; // REST
        const t = i / SAMPLE_RATE;
        const envelope = Math.exp(-t * decay) * volume;
        let sample = 0;
        for (let h = 0; h < harmonics.length; h++) {
          sample += Math.sin(2 * Math.PI * note.freq * (h + 1) * t) * harmonics[h];
        }
        data[sampleIdx] = sample * envelope;
      }

      noteIdx++;
      if (noteIdx >= notes.length) {
        noteIdx = loopTo;
      }
    }
    return data;
  }

  /** Encode Float32 PCM → 16-bit WAV Blob */
  function encodeWAV(samples) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);       // chunk size
    view.setUint16(20, 1, true);         // PCM
    view.setUint16(22, 1, true);         // mono
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
    view.setUint16(32, 2, true);         // block align
    view.setUint16(34, 16, true);        // bits per sample
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  // ── Define melodies for each track ──────────────────

  function buildTrackAudio() {
    // 1 — Neon Dreams: bright synth arpeggio in C major
    const neonNotes = [
      { freq: NOTE.C4, dur: 0.2 }, { freq: NOTE.E4, dur: 0.2 },
      { freq: NOTE.G4, dur: 0.2 }, { freq: NOTE.C5, dur: 0.3 },
      { freq: NOTE.G4, dur: 0.2 }, { freq: NOTE.E4, dur: 0.2 },
      { freq: NOTE.C4, dur: 0.2 }, { freq: NOTE.REST, dur: 0.15 },
      { freq: NOTE.D4, dur: 0.2 }, { freq: NOTE.F4, dur: 0.2 },
      { freq: NOTE.A4, dur: 0.2 }, { freq: NOTE.D5, dur: 0.3 },
      { freq: NOTE.A4, dur: 0.2 }, { freq: NOTE.F4, dur: 0.2 },
      { freq: NOTE.D4, dur: 0.2 }, { freq: NOTE.REST, dur: 0.15 },
    ];

    // 2 — Midnight Rain: slow, atmospheric pads
    const midnightNotes = [
      { freq: NOTE.A3, dur: 1.0 }, { freq: NOTE.REST, dur: 0.2 },
      { freq: NOTE.C4, dur: 1.0 }, { freq: NOTE.REST, dur: 0.2 },
      { freq: NOTE.E4, dur: 0.8 }, { freq: NOTE.D4, dur: 0.8 },
      { freq: NOTE.REST, dur: 0.3 },
      { freq: NOTE.G3, dur: 1.0 }, { freq: NOTE.REST, dur: 0.2 },
      { freq: NOTE.B3, dur: 0.8 }, { freq: NOTE.A3, dur: 1.2 },
      { freq: NOTE.REST, dur: 0.4 },
    ];

    // 3 — Solar Flare: energetic ascending pattern
    const solarNotes = [
      { freq: NOTE.E4, dur: 0.12 }, { freq: NOTE.G4, dur: 0.12 },
      { freq: NOTE.A4, dur: 0.12 }, { freq: NOTE.B4, dur: 0.12 },
      { freq: NOTE.D5, dur: 0.15 }, { freq: NOTE.E5, dur: 0.2 },
      { freq: NOTE.REST, dur: 0.1 },
      { freq: NOTE.D5, dur: 0.12 }, { freq: NOTE.B4, dur: 0.12 },
      { freq: NOTE.A4, dur: 0.12 }, { freq: NOTE.G4, dur: 0.12 },
      { freq: NOTE.E4, dur: 0.2 },
      { freq: NOTE.REST, dur: 0.15 },
      { freq: NOTE.A4, dur: 0.15 }, { freq: NOTE.C5, dur: 0.15 },
      { freq: NOTE.E5, dur: 0.3 },
      { freq: NOTE.REST, dur: 0.2 },
    ];

    // 4 — Urban Pulse: rhythmic bass-driven pattern
    const urbanNotes = [
      { freq: NOTE.C3, dur: 0.25 }, { freq: NOTE.REST, dur: 0.1 },
      { freq: NOTE.C3, dur: 0.15 }, { freq: NOTE.E3, dur: 0.3 },
      { freq: NOTE.REST, dur: 0.1 },
      { freq: NOTE.G3, dur: 0.2 }, { freq: NOTE.REST, dur: 0.1 },
      { freq: NOTE.F3, dur: 0.25 }, { freq: NOTE.E3, dur: 0.25 },
      { freq: NOTE.REST, dur: 0.15 },
      { freq: NOTE.C3, dur: 0.3 }, { freq: NOTE.REST, dur: 0.15 },
      { freq: NOTE.D3, dur: 0.2 }, { freq: NOTE.E3, dur: 0.2 },
      { freq: NOTE.G3, dur: 0.35 },
      { freq: NOTE.REST, dur: 0.2 },
    ];

    // 5 — Crystal Waves: ethereal high melody
    const crystalNotes = [
      { freq: NOTE.E5, dur: 0.5 }, { freq: NOTE.D5, dur: 0.35 },
      { freq: NOTE.C5, dur: 0.5 }, { freq: NOTE.REST, dur: 0.2 },
      { freq: NOTE.B4, dur: 0.4 }, { freq: NOTE.A4, dur: 0.6 },
      { freq: NOTE.REST, dur: 0.25 },
      { freq: NOTE.G4, dur: 0.5 }, { freq: NOTE.A4, dur: 0.35 },
      { freq: NOTE.C5, dur: 0.5 }, { freq: NOTE.E5, dur: 0.7 },
      { freq: NOTE.REST, dur: 0.3 },
    ];

    return [
      encodeWAV(generateMelody(neonNotes,     { volume: 0.28, harmonics: [1, 0.4, 0.15], decay: 2.5, totalDuration: 28 })),
      encodeWAV(generateMelody(midnightNotes, { volume: 0.22, harmonics: [1, 0.6, 0.3, 0.1], decay: 1.2, totalDuration: 32 })),
      encodeWAV(generateMelody(solarNotes,    { volume: 0.30, harmonics: [1, 0.3, 0.1], decay: 3.5, totalDuration: 25 })),
      encodeWAV(generateMelody(urbanNotes,    { volume: 0.35, harmonics: [1, 0.7, 0.4, 0.2], decay: 2.0, totalDuration: 30 })),
      encodeWAV(generateMelody(crystalNotes,  { volume: 0.20, harmonics: [1, 0.5, 0.25], decay: 1.0, totalDuration: 35 })),
    ];
  }

  // ═══════════════════════════════════════════════════════
  //  TRACK DATA
  // ═══════════════════════════════════════════════════════

  const audioBlobs = buildTrackAudio();

  const tracks = [
    { title: 'Neon Dreams',    artist: 'Synthwave Collective', cover: 'assets/album_neon_dreams.png',    blob: audioBlobs[0] },
    { title: 'Midnight Rain',  artist: 'Luna Echo',            cover: 'assets/album_midnight_rain.png',  blob: audioBlobs[1] },
    { title: 'Solar Flare',    artist: 'Cosmic Drift',         cover: 'assets/album_solar_flare.png',    blob: audioBlobs[2] },
    { title: 'Urban Pulse',    artist: 'Beat Mechanics',       cover: 'assets/album_urban_pulse.png',    blob: audioBlobs[3] },
    { title: 'Crystal Waves',  artist: 'Aurora Sound',         cover: 'assets/album_crystal_waves.png',  blob: audioBlobs[4] },
  ];

  // ═══════════════════════════════════════════════════════
  //  STATE
  // ═══════════════════════════════════════════════════════

  let currentIndex = 0;
  let isPlaying    = false;
  let isShuffle    = false;
  let repeatMode   = 0; // 0 = off, 1 = all, 2 = one
  let audio        = new Audio();
  let progressRAF  = null;

  // ═══════════════════════════════════════════════════════
  //  DOM REFS
  // ═══════════════════════════════════════════════════════

  const $         = id => document.getElementById(id);
  const albumArt  = $('album-art');
  const albumGlow = $('album-glow');
  const songTitle = $('song-title');
  const songArtist= $('song-artist');
  const timeCur   = $('time-current');
  const timeTotal = $('time-total');
  const progWrap  = $('progress-bar-wrap');
  const progBar   = $('progress-bar');
  const progThumb = $('progress-thumb');
  const volWrap   = $('volume-bar-wrap');
  const volBar    = $('volume-bar');
  const volThumb  = $('volume-thumb');
  const btnPlay   = $('btn-play');
  const btnPrev   = $('btn-prev');
  const btnNext   = $('btn-next');
  const btnShuffle= $('btn-shuffle');
  const btnRepeat = $('btn-repeat');
  const btnMute   = $('btn-mute');
  const chkAuto   = $('chk-autoplay');
  const playlistEl= $('playlist');
  const playerEl  = $('player');
  const ambientBg = $('ambient-bg');
  const plCount   = $('playlist-count');
  const plDuration= $('playlist-duration');
  const iconPlay  = btnPlay.querySelector('.icon-play');
  const iconPause = btnPlay.querySelector('.icon-pause');
  const iconVolOn = btnMute.querySelector('.icon-vol-on');
  const iconVolOff= btnMute.querySelector('.icon-vol-off');

  // ═══════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ═══════════════════════════════════════════════════════
  //  PLAYLIST RENDERING
  // ═══════════════════════════════════════════════════════

  function renderPlaylist() {
    playlistEl.innerHTML = '';
    tracks.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = 'playlist-item' + (i === currentIndex ? ' active' : '');
      li.dataset.index = i;
      li.setAttribute('role', 'listitem');
      li.innerHTML = `
        ${i === currentIndex ? `<div class="eq-bars ${isPlaying ? '' : 'paused'}">
          <span class="eq-bar"></span><span class="eq-bar"></span>
          <span class="eq-bar"></span><span class="eq-bar"></span>
        </div>` : ''}
        <img class="pl-thumb" src="${t.cover}" alt="" loading="lazy" />
        <div class="pl-info">
          <div class="pl-title">${t.title}</div>
          <div class="pl-artist">${t.artist}</div>
        </div>
        <span class="pl-duration" data-idx="${i}">--:--</span>
      `;
      li.addEventListener('click', () => { loadTrack(i); play(); });
      playlistEl.appendChild(li);
    });

    plCount.textContent = `${tracks.length} tracks`;

    // Resolve durations asynchronously
    tracks.forEach((t, i) => {
      const tmp = new Audio(URL.createObjectURL(t.blob));
      tmp.addEventListener('loadedmetadata', () => {
        const span = playlistEl.querySelector(`.pl-duration[data-idx="${i}"]`);
        if (span) span.textContent = fmtTime(tmp.duration);
        updateTotalDuration();
      });
    });
  }

  function updateTotalDuration() {
    const spans = playlistEl.querySelectorAll('.pl-duration');
    let total = 0;
    let allLoaded = true;
    spans.forEach(s => {
      if (s.textContent === '--:--') { allLoaded = false; return; }
      const parts = s.textContent.split(':');
      total += parseInt(parts[0]) * 60 + parseInt(parts[1]);
    });
    if (allLoaded) plDuration.textContent = fmtTime(total) + ' total';
  }

  function highlightActive() {
    playlistEl.querySelectorAll('.playlist-item').forEach((li, i) => {
      li.classList.toggle('active', i === currentIndex);
      // Update EQ bars
      const eq = li.querySelector('.eq-bars');
      if (i === currentIndex && !eq) {
        const eqHtml = `<div class="eq-bars ${isPlaying ? '' : 'paused'}">
          <span class="eq-bar"></span><span class="eq-bar"></span>
          <span class="eq-bar"></span><span class="eq-bar"></span>
        </div>`;
        li.insertAdjacentHTML('afterbegin', eqHtml);
      } else if (i !== currentIndex && eq) {
        eq.remove();
      } else if (i === currentIndex && eq) {
        eq.classList.toggle('paused', !isPlaying);
      }
    });

    // Scroll active into view
    const activeLi = playlistEl.querySelector('.playlist-item.active');
    if (activeLi) activeLi.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // ═══════════════════════════════════════════════════════
  //  TRACK LOADING
  // ═══════════════════════════════════════════════════════

  function loadTrack(index) {
    currentIndex = index;
    const track = tracks[index];

    // Stop & reset
    audio.pause();
    cancelAnimationFrame(progressRAF);
    audio.src = URL.createObjectURL(track.blob);
    audio.load();

    // Update UI
    albumArt.src = track.cover;
    songTitle.textContent = track.title;
    songArtist.textContent = track.artist;
    progBar.style.width = '0%';
    progThumb.style.left = '0%';
    timeCur.textContent = '0:00';

    // Ambient background wash
    ambientBg.style.backgroundImage = `
      radial-gradient(ellipse 60% 50% at 20% 30%, rgba(168,85,247,0.12), transparent 70%),
      radial-gradient(ellipse 50% 60% at 80% 70%, rgba(236,72,153,0.10), transparent 70%)
    `;

    audio.addEventListener('loadedmetadata', () => {
      timeTotal.textContent = fmtTime(audio.duration);
    }, { once: true });

    highlightActive();
    setPlayState(false);
  }

  // ═══════════════════════════════════════════════════════
  //  PLAYBACK CONTROLS
  // ═══════════════════════════════════════════════════════

  function setPlayState(playing) {
    isPlaying = playing;
    iconPlay.style.display  = playing ? 'none' : '';
    iconPause.style.display = playing ? '' : 'none';
    btnPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    playerEl.classList.toggle('playing', playing);
    highlightActive();
  }

  function play() {
    audio.play().then(() => {
      setPlayState(true);
      tickProgress();
    }).catch(() => {});
  }

  function pause() {
    audio.pause();
    setPlayState(false);
    cancelAnimationFrame(progressRAF);
  }

  function togglePlay() {
    isPlaying ? pause() : play();
  }

  function nextTrack() {
    let next;
    if (isShuffle) {
      next = Math.floor(Math.random() * tracks.length);
      if (next === currentIndex && tracks.length > 1) next = (next + 1) % tracks.length;
    } else {
      next = (currentIndex + 1) % tracks.length;
    }
    loadTrack(next);
    play();
  }

  function prevTrack() {
    // If > 3s in, restart; else go previous
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      timeCur.textContent = '0:00';
      progBar.style.width = '0%';
      progThumb.style.left = '0%';
      return;
    }
    let prev = (currentIndex - 1 + tracks.length) % tracks.length;
    loadTrack(prev);
    play();
  }

  // ═══════════════════════════════════════════════════════
  //  PROGRESS
  // ═══════════════════════════════════════════════════════

  function tickProgress() {
    if (!isPlaying) return;
    const pct = (audio.currentTime / audio.duration) * 100 || 0;
    progBar.style.width = pct + '%';
    progThumb.style.left = pct + '%';
    timeCur.textContent = fmtTime(audio.currentTime);
    progWrap.setAttribute('aria-valuenow', Math.round(pct));
    progressRAF = requestAnimationFrame(tickProgress);
  }

  // Seek
  function seekFromEvent(e) {
    const rect = progWrap.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    progBar.style.width = (pct * 100) + '%';
    progThumb.style.left = (pct * 100) + '%';
    timeCur.textContent = fmtTime(audio.currentTime);
  }

  let progDragging = false;
  progWrap.addEventListener('mousedown', e => { progDragging = true; progWrap.classList.add('dragging'); seekFromEvent(e); });
  document.addEventListener('mousemove', e => { if (progDragging) seekFromEvent(e); });
  document.addEventListener('mouseup', () => { if (progDragging) { progDragging = false; progWrap.classList.remove('dragging'); } });
  // Touch
  progWrap.addEventListener('touchstart', e => { progDragging = true; progWrap.classList.add('dragging'); seekFromEvent(e.touches[0]); }, { passive: true });
  document.addEventListener('touchmove', e => { if (progDragging) seekFromEvent(e.touches[0]); }, { passive: true });
  document.addEventListener('touchend', () => { if (progDragging) { progDragging = false; progWrap.classList.remove('dragging'); } });

  // ═══════════════════════════════════════════════════════
  //  VOLUME
  // ═══════════════════════════════════════════════════════

  audio.volume = 0.8;
  let savedVolume = 0.8;

  function setVolume(v) {
    v = Math.max(0, Math.min(1, v));
    audio.volume = v;
    volBar.style.width = (v * 100) + '%';
    volThumb.style.left = (v * 100) + '%';
    volWrap.setAttribute('aria-valuenow', Math.round(v * 100));
    // Icon
    const muted = v === 0;
    iconVolOn.style.display  = muted ? 'none' : '';
    iconVolOff.style.display = muted ? '' : 'none';
  }

  function volFromEvent(e) {
    const rect = volWrap.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(pct);
    savedVolume = pct || savedVolume;
  }

  let volDragging = false;
  volWrap.addEventListener('mousedown', e => { volDragging = true; volWrap.classList.add('dragging'); volFromEvent(e); });
  document.addEventListener('mousemove', e => { if (volDragging) volFromEvent(e); });
  document.addEventListener('mouseup', () => { if (volDragging) { volDragging = false; volWrap.classList.remove('dragging'); } });
  // Touch
  volWrap.addEventListener('touchstart', e => { volDragging = true; volWrap.classList.add('dragging'); volFromEvent(e.touches[0]); }, { passive: true });
  document.addEventListener('touchmove', e => { if (volDragging) volFromEvent(e.touches[0]); }, { passive: true });
  document.addEventListener('touchend', () => { if (volDragging) { volDragging = false; volWrap.classList.remove('dragging'); } });

  setVolume(0.8);

  // Mute toggle
  btnMute.addEventListener('click', () => {
    if (audio.volume > 0) {
      savedVolume = audio.volume;
      setVolume(0);
    } else {
      setVolume(savedVolume || 0.5);
    }
  });

  // ═══════════════════════════════════════════════════════
  //  SHUFFLE & REPEAT
  // ═══════════════════════════════════════════════════════

  btnShuffle.addEventListener('click', () => {
    isShuffle = !isShuffle;
    btnShuffle.classList.toggle('active', isShuffle);
    btnShuffle.title = isShuffle ? 'Shuffle On' : 'Shuffle Off';
  });

  const repeatIcons = ['Repeat Off', 'Repeat All', 'Repeat One'];
  btnRepeat.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    btnRepeat.classList.toggle('active', repeatMode > 0);
    btnRepeat.title = repeatIcons[repeatMode];
    // Show "1" badge for repeat-one
    if (repeatMode === 2) {
      btnRepeat.style.position = 'relative';
      let badge = btnRepeat.querySelector('.repeat-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'repeat-badge';
        badge.textContent = '1';
        Object.assign(badge.style, {
          position: 'absolute', top: '-2px', right: '-2px',
          fontSize: '0.55rem', fontWeight: '700',
          color: 'var(--accent)', lineHeight: '1'
        });
        btnRepeat.appendChild(badge);
      }
    } else {
      const badge = btnRepeat.querySelector('.repeat-badge');
      if (badge) badge.remove();
    }
  });

  // ═══════════════════════════════════════════════════════
  //  TRACK END → AUTOPLAY / REPEAT
  // ═══════════════════════════════════════════════════════

  audio.addEventListener('ended', () => {
    cancelAnimationFrame(progressRAF);

    if (repeatMode === 2) {
      // Repeat one
      audio.currentTime = 0;
      play();
      return;
    }

    const isLast = currentIndex === tracks.length - 1;

    if (repeatMode === 1) {
      // Repeat all — always go next (wraps)
      nextTrack();
    } else if (chkAuto.checked && !isLast) {
      nextTrack();
    } else if (chkAuto.checked && isLast && isShuffle) {
      nextTrack();
    } else {
      setPlayState(false);
      // Reset progress to end
      progBar.style.width = '100%';
      progThumb.style.left = '100%';
    }
  });

  // ═══════════════════════════════════════════════════════
  //  BUTTON EVENT LISTENERS
  // ═══════════════════════════════════════════════════════

  btnPlay.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', nextTrack);
  btnPrev.addEventListener('click', prevTrack);

  // ═══════════════════════════════════════════════════════
  //  KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════════════════════

  document.addEventListener('keydown', e => {
    switch (e.key) {
      case ' ':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        audio.currentTime = Math.max(0, audio.currentTime - 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setVolume(audio.volume + 0.05);
        savedVolume = audio.volume;
        break;
      case 'ArrowDown':
        e.preventDefault();
        setVolume(audio.volume - 0.05);
        savedVolume = audio.volume;
        break;
      case 'n': case 'N':
        if (!e.ctrlKey && !e.metaKey) nextTrack();
        break;
      case 'p': case 'P':
        if (!e.ctrlKey && !e.metaKey) prevTrack();
        break;
      case 'm': case 'M':
        btnMute.click();
        break;
      case 's': case 'S':
        if (!e.ctrlKey && !e.metaKey) btnShuffle.click();
        break;
      case 'r': case 'R':
        if (!e.ctrlKey && !e.metaKey) btnRepeat.click();
        break;
    }
  });

  // ═══════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════

  renderPlaylist();
  loadTrack(0);

})();
