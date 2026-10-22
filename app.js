// Marcador de Tenis Inteligente para Smartwatch Band 5 + iPhone 13
(function () {
  'use strict';

  // 1-second silent audio WAV en Base64 para mantener activo el MediaSession en segundo plano en iOS
  const SILENT_WAV_BASE64 = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

  // Estado del partido
  const state = {
    p1: { name: 'TÚ (Band 5)', points: 0, games: 0, sets: 0 },
    p2: { name: 'Rival', points: 0, games: 0, sets: 0 },
    server: 1, // 1 = P1, 2 = P2
    initialServerInSet: 1,
    currentSet: 1,
    setScores: [], // Array de objetos { p1: number, p2: number }
    isTiebreak: false,
    tiebreakPointsP1: 0,
    tiebreakPointsP2: 0,
    history: [], // Historial de puntos
    undoStack: [],
    matchOver: false,
    config: {
      matchSets: 3, // 1, 3 o 5
      deuceMode: 'advantage', // 'advantage' o 'no-ad'
      tiebreakMode: 'standard', // 'standard' (7) o 'super' (10)
      tapSensitivity: 850, // ms para distinguir 1 toque vs 2 toques
      voiceEnabled: true
    }
  };

  // Variables para la detección de golpes en Band 5
  let tapCount = 0;
  let tapTimer = null;
  let isBandConnected = false;

  // Elementos del DOM
  const dom = {
    audio: document.getElementById('audioLoop'),
    connectionStatus: document.getElementById('connectionStatus'),
    statusLabel: document.getElementById('statusLabel'),
    btnActivateBand: document.getElementById('btnActivateBand'),
    activateBtnIcon: document.getElementById('activateBtnIcon'),
    activateBtnText: document.getElementById('activateBtnText'),
    btnVoiceToggle: document.getElementById('btnVoiceToggle'),
    voiceIcon: document.getElementById('voiceIcon'),
    btnSettings: document.getElementById('btnSettings'),
    breakBanner: document.getElementById('breakBanner'),
    breakDetail: document.getElementById('breakDetail'),
    btnDismissBreak: document.getElementById('btnDismissBreak'),
    nameP1: document.getElementById('nameP1'),
    nameP2: document.getElementById('nameP2'),
    pointsP1: document.getElementById('pointsP1'),
    pointsP2: document.getElementById('pointsP2'),
    gamesP1: document.getElementById('gamesP1'),
    gamesP2: document.getElementById('gamesP2'),
    p1Set1: document.getElementById('p1Set1'),
    p1Set2: document.getElementById('p1Set2'),
    p1Set3: document.getElementById('p1Set3'),
    p2Set1: document.getElementById('p2Set1'),
    p2Set2: document.getElementById('p2Set2'),
    p2Set3: document.getElementById('p2Set3'),
    serveP1: document.getElementById('serveP1'),
    serveP2: document.getElementById('serveP2'),
    matchPhaseText: document.getElementById('matchPhaseText'),
    servingStateText: document.getElementById('servingStateText'),
    bandHint: document.getElementById('bandHint'),
    touchAddP1: document.getElementById('touchAddP1'),
    touchAddP2: document.getElementById('touchAddP2'),
    btnUndo: document.getElementById('btnUndo'),
    btnP1PointMinus: document.getElementById('btnP1PointMinus'),
    btnP1PointPlus: document.getElementById('btnP1PointPlus'),
    btnP1GameMinus: document.getElementById('btnP1GameMinus'),
    btnP1GamePlus: document.getElementById('btnP1GamePlus'),
    btnP2PointMinus: document.getElementById('btnP2PointMinus'),
    btnP2PointPlus: document.getElementById('btnP2PointPlus'),
    btnP2GameMinus: document.getElementById('btnP2GameMinus'),
    btnP2GamePlus: document.getElementById('btnP2GamePlus'),
    btnSwapServe: document.getElementById('btnSwapServe'),
    btnResetPoints: document.getElementById('btnResetPoints'),
    historyList: document.getElementById('historyList'),
    historyCount: document.getElementById('historyCount'),
    btnResetMatch: document.getElementById('btnResetMatch'),
    modalSettings: document.getElementById('modalSettings'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),
    selectSets: document.getElementById('selectSets'),
    selectDeuceMode: document.getElementById('selectDeuceMode'),
    selectTiebreak: document.getElementById('selectTiebreak'),
    tapSensitivity: document.getElementById('tapSensitivity'),
    tapSensitivityVal: document.getElementById('tapSensitivityVal')
  };

  // Convertidor de puntos tradicionales de tenis
  function formatTennisPoints(p1, p2, isTiebreak, tieP1, tieP2) {
    if (isTiebreak) {
      return { p1Text: String(tieP1), p2Text: String(tieP2) };
    }
    const standard = ['0', '15', '30', '40'];
    if (p1 <= 3 && p2 <= 3) {
      if (p1 === 3 && p2 === 3) {
        return { p1Text: '40', p2Text: '40' }; // Deuce
      }
      return { p1Text: standard[p1], p2Text: standard[p2] };
    }
    if (p1 === p2) {
      return { p1Text: '40', p2Text: '40' };
    }
    if (p1 > p2) {
      return { p1Text: 'Ad', p2Text: '40' };
    }
    return { p1Text: '40', p2Text: 'Ad' };
  }

  // Guardar estado en pila de deshacer
  function saveSnapshot() {
    state.undoStack.push(JSON.parse(JSON.stringify({
      p1: state.p1,
      p2: state.p2,
      server: state.server,
      initialServerInSet: state.initialServerInSet,
      currentSet: state.currentSet,
      setScores: state.setScores,
      isTiebreak: state.isTiebreak,
      tiebreakPointsP1: state.tiebreakPointsP1,
      tiebreakPointsP2: state.tiebreakPointsP2,
      history: state.history,
      matchOver: state.matchOver
    })));
    if (state.undoStack.length > 50) state.undoStack.shift();
  }

  // Deshacer
  function undoLastAction() {
    if (state.undoStack.length === 0) return;
    const prev = state.undoStack.pop();
    state.p1 = prev.p1;
    state.p2 = prev.p2;
    state.server = prev.server;
    state.initialServerInSet = prev.initialServerInSet;
    state.currentSet = prev.currentSet;
    state.setScores = prev.setScores;
    state.isTiebreak = prev.isTiebreak;
    state.tiebreakPointsP1 = prev.tiebreakPointsP1;
    state.tiebreakPointsP2 = prev.tiebreakPointsP2;
    state.history = prev.history;
    state.matchOver = prev.matchOver;
    updateUI();
    speak('Punto deshecho');
  }

  // Locución por voz
  function speak(text) {
    if (!state.config.voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
    }
  }

  // Actualizar MediaSession para mostrar el marcador en la pantalla del Band 5
  function updateBandScreen() {
    if (!('mediaSession' in navigator)) return;
    const pts = formatTennisPoints(state.p1.points, state.p2.points, state.isTiebreak, state.tiebreakPointsP1, state.tiebreakPointsP2);
    const scoreTitle = `Tú ${pts.p1Text} - ${pts.p2Text} Rival`;
    const setScore = `Juegos: ${state.p1.games}-${state.p2.games} (Set ${state.currentSet})`;
    const serveWho = state.server === 1 ? `Saque: ${state.p1.name}` : `Saque: ${state.p2.name}`;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: scoreTitle,
        artist: setScore,
        album: serveWho
      });
    } catch (e) {
      console.warn('MediaSession metadata error:', e);
    }
  }

  // Registrar un punto anotado
  function scorePoint(winner) {
    if (state.matchOver) return;
    saveSnapshot();

    const winnerName = winner === 1 ? state.p1.name : state.p2.name;

    if (state.isTiebreak) {
      if (winner === 1) state.tiebreakPointsP1++;
      else state.tiebreakPointsP2++;

      const target = state.config.tiebreakMode === 'super' ? 10 : 7;
      const t1 = state.tiebreakPointsP1;
      const t2 = state.tiebreakPointsP2;
      const totalPoints = t1 + t2;

      // En tiebreak, el servidor rota después del punto 1 y luego cada 2 puntos
      if (totalPoints % 2 === 1) {
        state.server = state.server === 1 ? 2 : 1;
      }

      // Cambio de lado cada 6 puntos en tiebreak
      if (totalPoints % 6 === 0) {
        showBreakBanner('Cambio de lado en Tiebreak (cada 6 puntos)');
        speak('Cambio de lado en Tiebreak');
      }

      // Chequeo de fin de tiebreak
      if ((t1 >= target || t2 >= target) && Math.abs(t1 - t2) >= 2) {
        if (t1 > t2) winGame(1);
        else winGame(2);
      } else {
        const text = `${t1} a ${t2}`;
        speak(text);
      }
    } else {
      // Puntuación regular
      let gameWon = false;
      if (winner === 1) {
        if (state.p1.points === 3 && state.p2.points < 3) {
          gameWon = true;
        } else if (state.p1.points === 3 && state.p2.points === 3) {
          if (state.config.deuceMode === 'no-ad') gameWon = true;
          else state.p1.points = 4; // Ad P1
        } else if (state.p1.points === 4) {
          gameWon = true;
        } else if (state.p2.points === 4) {
          state.p2.points = 3; // Regresa a iguales
        } else {
          state.p1.points++;
        }
      } else {
        if (state.p2.points === 3 && state.p1.points < 3) {
          gameWon = true;
        } else if (state.p2.points === 3 && state.p1.points === 3) {
          if (state.config.deuceMode === 'no-ad') gameWon = true;
          else state.p2.points = 4; // Ad P2
        } else if (state.p2.points === 4) {
          gameWon = true;
        } else if (state.p1.points === 4) {
          state.p1.points = 3; // Regresa a iguales
        } else {
          state.p2.points++;
        }
      }

      if (gameWon) {
        winGame(winner);
      } else {
        announceScore();
      }
    }

    addHistoryRecord(winnerName);
    updateUI();
    saveToLocalStorage();
  }

  // Locución del tanteador tras cada punto
  function announceScore() {
    const pts = formatTennisPoints(state.p1.points, state.p2.points, state.isTiebreak, state.tiebreakPointsP1, state.tiebreakPointsP2);
    if (pts.p1Text === '40' && pts.p2Text === '40') {
      speak('Iguales');
    } else if (pts.p1Text === 'Ad') {
      speak('Ventaja tuya');
    } else if (pts.p2Text === 'Ad') {
      speak('Ventaja rival');
    } else {
      speak(`${pts.p1Text} a ${pts.p2Text}`);
    }
  }

  // Ganar un juego
  function winGame(winner) {
    if (winner === 1) state.p1.games++;
    else state.p2.games++;

    // Reiniciar puntos
    state.p1.points = 0;
    state.p2.points = 0;
    state.tiebreakPointsP1 = 0;
    state.tiebreakPointsP2 = 0;

    const winnerName = winner === 1 ? state.p1.name : state.p2.name;
    speak(`Juego para ${winnerName}. ${state.p1.games} a ${state.p2.games}`);

    // Alternar servidor
    state.server = state.server === 1 ? 2 : 1;

    // Verificar si se alcanzó descanso por juegos impares
    const totalGames = state.p1.games + state.p2.games;
    if (totalGames % 2 === 1 && !state.isTiebreak) {
      showBreakBanner(`Cambio de lado (Juegos: ${state.p1.games} - ${state.p2.games})`);
    }

    checkSetStatus();
  }

  // Comprobar estado del set
  function checkSetStatus() {
    const g1 = state.p1.games;
    const g2 = state.p2.games;

    // Tiebreak al llegar a 6-6
    if (g1 === 6 && g2 === 6 && !state.isTiebreak) {
      state.isTiebreak = true;
      state.tiebreakPointsP1 = 0;
      state.tiebreakPointsP2 = 0;
      speak('Comienza Tiebreak');
      return;
    }

    // Ganar el set
    if ((g1 >= 6 || g2 >= 6) && Math.abs(g1 - g2) >= 2 || state.isTiebreak) {
      const winner = g1 > g2 ? 1 : 2;
      finishSet(winner);
    }
  }

  // Finalizar set
  function finishSet(winner) {
    state.setScores.push({ p1: state.p1.games, p2: state.p2.games });
    if (winner === 1) state.p1.sets++;
    else state.p2.sets++;

    state.isTiebreak = false;
    const winnerName = winner === 1 ? state.p1.name : state.p2.name;
    speak(`Set para ${winnerName}.`);

    // Comprobar fin del partido
    const setsToWin = Math.ceil(state.config.matchSets / 2);
    if (state.p1.sets >= setsToWin || state.p2.sets >= setsToWin) {
      state.matchOver = true;
      const matchWinner = state.p1.sets > state.p2.sets ? state.p1.name : state.p2.name;
      speak(`Partido finalizado. Ganador ${matchWinner}.`);
      showBreakBanner(`¡Partido terminado! Ganador: ${matchWinner}`);
    } else {
      state.currentSet++;
      state.p1.games = 0;
      state.p2.games = 0;
      showBreakBanner(`Fin del Set. Descanso prolongado antes del Set ${state.currentSet}`);
    }
  }

  function showBreakBanner(text) {
    dom.breakDetail.textContent = text;
    dom.breakBanner.classList.remove('hidden');
  }

  function addHistoryRecord(winnerName) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const pts = formatTennisPoints(state.p1.points, state.p2.points, state.isTiebreak, state.tiebreakPointsP1, state.tiebreakPointsP2);
    state.history.unshift({
      time,
      winnerName,
      isP1: winnerName === state.p1.name,
      score: `${pts.p1Text} - ${pts.p2Text}`,
      games: `${state.p1.games} - ${state.p2.games}`,
      set: state.currentSet
    });
    if (state.history.length > 30) state.history.pop();
  }

  // Actualizar todo el UI
  function updateUI() {
    const pts = formatTennisPoints(state.p1.points, state.p2.points, state.isTiebreak, state.tiebreakPointsP1, state.tiebreakPointsP2);
    dom.pointsP1.textContent = pts.p1Text;
    dom.pointsP2.textContent = pts.p2Text;
    dom.gamesP1.textContent = state.p1.games;
    dom.gamesP2.textContent = state.p2.games;

    // Sets anteriores
    const s1 = state.setScores[0];
    const s2 = state.setScores[1];
    const s3 = state.setScores[2];

    dom.p1Set1.textContent = s1 ? s1.p1 : (state.currentSet === 1 ? state.p1.games : '-');
    dom.p2Set1.textContent = s1 ? s1.p2 : (state.currentSet === 1 ? state.p2.games : '-');
    dom.p1Set2.textContent = s2 ? s2.p1 : (state.currentSet === 2 ? state.p1.games : '-');
    dom.p2Set2.textContent = s2 ? s2.p2 : (state.currentSet === 2 ? state.p2.games : '-');
    dom.p1Set3.textContent = s3 ? s3.p1 : (state.currentSet === 3 ? state.p1.games : '-');
    dom.p2Set3.textContent = s3 ? s3.p2 : (state.currentSet === 3 ? state.p2.games : '-');

    // Servicio
    if (state.server === 1) {
      dom.serveP1.classList.remove('hidden');
      dom.serveP2.classList.add('hidden');
      dom.servingStateText.textContent = `${state.p1.name} al servicio 🎾`;
    } else {
      dom.serveP1.classList.add('hidden');
      dom.serveP2.classList.remove('hidden');
      dom.servingStateText.textContent = `${state.p2.name} al servicio 🎾`;
    }

    // Fase de juego
    if (state.matchOver) {
      dom.matchPhaseText.textContent = '¡Partido terminado!';
    } else if (state.isTiebreak) {
      dom.matchPhaseText.textContent = `Set ${state.currentSet} - TIEBREAK`;
    } else {
      dom.matchPhaseText.textContent = `Set ${state.currentSet} de ${state.config.matchSets}`;
    }

    // Historial
    dom.historyCount.textContent = `${state.history.length} pts`;
    if (state.history.length === 0) {
      dom.historyList.innerHTML = '<div class="empty-history">Inicia el partido para ver los puntos registrados</div>';
    } else {
      dom.historyList.innerHTML = state.history.map(item => `
        <div class="history-item ${item.isP1 ? 'p1-win' : 'p2-win'}">
          <span>${item.time} &bull; <strong>${item.winnerName}</strong></span>
          <span class="history-score">${item.score} (Juegos: ${item.games})</span>
        </div>
      `).join('');
    }

    updateBandScreen();
  }

  // Detección de toques recibidos desde Band 5 (MediaSession)
  function handleBandTapEvent() {
    tapCount++;
    if (tapCount === 1) {
      tapTimer = setTimeout(() => {
        // 1 solo toque detectado -> Punto Ganado (+1 Tú)
        scorePoint(1);
        tapCount = 0;
      }, state.config.tapSensitivity);
    } else if (tapCount === 2) {
      // 2 toques rápidos detectados -> Punto Perdido (+1 Rival)
      clearTimeout(tapTimer);
      scorePoint(2);
      tapCount = 0;
    }
  }

  // Configurar escuchadores de MediaSession para Band 5
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    // Soporte 1: Detección inteligente por toques en Play/Pause
    navigator.mediaSession.setActionHandler('play', () => {
      handleBandTapEvent();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      handleBandTapEvent();
      dom.audio.play().catch(() => {});
    });

    // Soporte 2: Botones directos de pista en pantalla de música de Band 5
    // Siguiente pista (>>|) = Gano punto
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      scorePoint(1);
    });
    // Pista anterior (|<<) = Pierdo punto
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      scorePoint(2);
    });

    updateBandScreen();
  }

  // Activar reproducción silenciosa y vincular MediaSession
  function activateBandLink() {
    // 1. Desbloquear contexto de audio web en iOS
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        ctx.resume();
      }
    } catch (e) {
      console.warn('AudioContext unlock:', e);
    }

    // 2. Asegurar que el audio tenga una fuente valida y reproducir directamente con el gesto del usuario
    if (!dom.audio.src || dom.audio.src.endsWith('/')) {
      dom.audio.src = 'silent.wav';
    }

    dom.audio.currentTime = 0;
    const playPromise = dom.audio.play();

    function onActivatedSuccess() {
      isBandConnected = true;
      setupMediaSession();
      dom.connectionStatus.classList.add('active');
      dom.statusLabel.textContent = 'Band 5 Escuchando';
      dom.btnActivateBand.classList.add('active');
      dom.activateBtnIcon.textContent = '✓';
      dom.activateBtnText.textContent = 'Enlazado y Escuchando';
      dom.bandHint.textContent = '1 toque = Ganas | 2 toques = Pierdes (o botones ⏭️/⏮️)';
      speak('Marcador enlazado con Band 5. ¡Buen partido!');
    }

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          onActivatedSuccess();
        })
        .catch((err) => {
          console.warn('Fallo primario play:', err);
          // Si falló por carga, forzar load() y reintentar
          dom.audio.load();
          dom.audio.play()
            .then(() => {
              onActivatedSuccess();
            })
            .catch((e) => {
              console.error('Error final audio:', e);
              // Activar de todos modos MediaSession para permitir botones
              onActivatedSuccess();
              dom.statusLabel.textContent = 'Toca cualquier botón para confirmar audio';
            });
        });
    } else {
      onActivatedSuccess();
    }
  }

  // Guardado en LocalStorage
  function saveToLocalStorage() {
    try {
      localStorage.setItem('tennis_band5_state', JSON.stringify({
        p1: state.p1,
        p2: state.p2,
        server: state.server,
        currentSet: state.currentSet,
        setScores: state.setScores,
        isTiebreak: state.isTiebreak,
        tiebreakPointsP1: state.tiebreakPointsP1,
        tiebreakPointsP2: state.tiebreakPointsP2,
        history: state.history,
        matchOver: state.matchOver,
        config: state.config
      }));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  function loadFromLocalStorage() {
    try {
      const data = localStorage.getItem('tennis_band5_state');
      if (data) {
        const saved = JSON.parse(data);
        Object.assign(state.p1, saved.p1);
        Object.assign(state.p2, saved.p2);
        state.server = saved.server || 1;
        state.currentSet = saved.currentSet || 1;
        state.setScores = saved.setScores || [];
        state.isTiebreak = saved.isTiebreak || false;
        state.tiebreakPointsP1 = saved.tiebreakPointsP1 || 0;
        state.tiebreakPointsP2 = saved.tiebreakPointsP2 || 0;
        state.history = saved.history || [];
        state.matchOver = saved.matchOver || false;
        if (saved.config) Object.assign(state.config, saved.config);
        dom.nameP1.value = state.p1.name;
        dom.nameP2.value = state.p2.name;
      }
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
    }
  }

  // Controles Manuales para los Descansos
  function setupManualCorrectionControls() {
    // Tocar el recuadro grande suma punto (y autoriza audio si aun no esta activo)
    dom.touchAddP1.addEventListener('click', () => {
      if (!isBandConnected) activateBandLink();
      scorePoint(1);
    });
    dom.touchAddP2.addEventListener('click', () => {
      if (!isBandConnected) activateBandLink();
      scorePoint(2);
    });

    // Deshacer
    dom.btnUndo.addEventListener('click', undoLastAction);

    // Sumar/Restar Puntos manualmente
    dom.btnP1PointPlus.addEventListener('click', () => {
      saveSnapshot();
      if (state.isTiebreak) state.tiebreakPointsP1++;
      else state.p1.points = Math.min(4, state.p1.points + 1);
      updateUI();
    });
    dom.btnP1PointMinus.addEventListener('click', () => {
      saveSnapshot();
      if (state.isTiebreak) state.tiebreakPointsP1 = Math.max(0, state.tiebreakPointsP1 - 1);
      else state.p1.points = Math.max(0, state.p1.points - 1);
      updateUI();
    });
    dom.btnP2PointPlus.addEventListener('click', () => {
      saveSnapshot();
      if (state.isTiebreak) state.tiebreakPointsP2++;
      else state.p2.points = Math.min(4, state.p2.points + 1);
      updateUI();
    });
    dom.btnP2PointMinus.addEventListener('click', () => {
      saveSnapshot();
      if (state.isTiebreak) state.tiebreakPointsP2 = Math.max(0, state.tiebreakPointsP2 - 1);
      else state.p2.points = Math.max(0, state.p2.points - 1);
      updateUI();
    });

    // Sumar/Restar Juegos manualmente
    dom.btnP1GamePlus.addEventListener('click', () => {
      saveSnapshot();
      state.p1.games++;
      updateUI();
    });
    dom.btnP1GameMinus.addEventListener('click', () => {
      saveSnapshot();
      state.p1.games = Math.max(0, state.p1.games - 1);
      updateUI();
    });
    dom.btnP2GamePlus.addEventListener('click', () => {
      saveSnapshot();
      state.p2.games++;
      updateUI();
    });
    dom.btnP2GameMinus.addEventListener('click', () => {
      saveSnapshot();
      state.p2.games = Math.max(0, state.p2.games - 1);
      updateUI();
    });

    // Cambiar Saque
    dom.btnSwapServe.addEventListener('click', () => {
      saveSnapshot();
      state.server = state.server === 1 ? 2 : 1;
      updateUI();
      speak(state.server === 1 ? 'Saque para ti' : 'Saque para rival');
    });

    // Reiniciar sólo puntos de este juego (a 0-0)
    dom.btnResetPoints.addEventListener('click', () => {
      saveSnapshot();
      state.p1.points = 0;
      state.p2.points = 0;
      state.tiebreakPointsP1 = 0;
      state.tiebreakPointsP2 = 0;
      updateUI();
      speak('Puntos reiniciados a cero cero');
    });

    // Cerrar banner de descanso
    dom.btnDismissBreak.addEventListener('click', () => {
      dom.breakBanner.classList.add('hidden');
    });

    // Modificar nombres
    dom.nameP1.addEventListener('change', (e) => {
      state.p1.name = e.target.value.trim() || 'TÚ';
      updateUI();
    });
    dom.nameP2.addEventListener('change', (e) => {
      state.p2.name = e.target.value.trim() || 'Rival';
      updateUI();
    });

    // Botón de activar enlace Band 5
    dom.btnActivateBand.addEventListener('click', activateBandLink);

    // Toggle de voz
    dom.btnVoiceToggle.addEventListener('click', () => {
      state.config.voiceEnabled = !state.config.voiceEnabled;
      dom.voiceIcon.textContent = state.config.voiceEnabled ? '🔊' : '🔇';
      if (state.config.voiceEnabled) speak('Voz activada');
    });

    // Reiniciar partido completo
    dom.btnResetMatch.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar todo el partido a cero?')) {
        saveSnapshot();
        state.p1.points = 0;
        state.p1.games = 0;
        state.p1.sets = 0;
        state.p2.points = 0;
        state.p2.games = 0;
        state.p2.sets = 0;
        state.currentSet = 1;
        state.setScores = [];
        state.isTiebreak = false;
        state.tiebreakPointsP1 = 0;
        state.tiebreakPointsP2 = 0;
        state.history = [];
        state.matchOver = false;
        localStorage.removeItem('tennis_band5_state');
        updateUI();
        speak('Partido reiniciado');
      }
    });

    // Modal de ajustes
    dom.btnSettings.addEventListener('click', () => {
      dom.selectSets.value = state.config.matchSets;
      dom.selectDeuceMode.value = state.config.deuceMode;
      dom.selectTiebreak.value = state.config.tiebreakMode;
      dom.tapSensitivity.value = state.config.tapSensitivity;
      dom.tapSensitivityVal.textContent = `${state.config.tapSensitivity} ms`;
      dom.modalSettings.classList.remove('hidden');
    });

    dom.btnCloseModal.addEventListener('click', () => {
      dom.modalSettings.classList.add('hidden');
    });

    dom.tapSensitivity.addEventListener('input', (e) => {
      dom.tapSensitivityVal.textContent = `${e.target.value} ms`;
    });

    dom.btnSaveSettings.addEventListener('click', () => {
      state.config.matchSets = parseInt(dom.selectSets.value, 10);
      state.config.deuceMode = dom.selectDeuceMode.value;
      state.config.tiebreakMode = dom.selectTiebreak.value;
      state.config.tapSensitivity = parseInt(dom.tapSensitivity.value, 10);
      dom.modalSettings.classList.add('hidden');
      updateUI();
      saveToLocalStorage();
    });
  }

  // Inicialización
  loadFromLocalStorage();
  setupManualCorrectionControls();
  updateUI();
})();
