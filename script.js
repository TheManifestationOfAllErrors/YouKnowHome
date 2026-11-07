
    const catImages = [
      'Assets/cat1.png',
      'Assets/cat2.png',
      'Assets/cat3.png',
      'Assets/cat4.png'
    ];

    const catImage = document.querySelector('#random-cat');
    let catIndex = Math.floor(Math.random() * catImages.length);
    catImage.src = catImages[catIndex];

    const greetingWindow = document.querySelector('#greetingWindow');
    const profileWindow = document.querySelector('#profileWindow');
    const greetingView = document.querySelector('#greeting-view');
    const loadingView = document.querySelector('#loading-view');
    const progressFill = document.querySelector('#progressFill');
    const progressText = document.querySelector('#progressText');
    const dialogTitle = document.querySelector('#dialogTitle');
    const profileClock = document.querySelector('#profile-clock');
    const successView = document.querySelector('#success-view');
    const successCat = document.querySelector('#success-cat');
    const profileDate = document.querySelector('#profile-date');
    const bellButton = document.querySelector('#bell-button');
    let loadingTimer;

    const mobileViewport = window.matchMedia('(max-width: 560px), (max-height: 560px)');
    const profileWindows = [greetingWindow, profileWindow];

    function updateMobileWindowScale() {
      const isMobile = mobileViewport.matches;
      const availableWidth = Math.max(1, window.innerWidth - 24);
      const availableHeight = Math.max(1, window.innerHeight - 24);

      profileWindows.forEach((windowElement) => {
        const width = windowElement.offsetWidth;
        const height = windowElement.offsetHeight;
        let scale = isMobile && width ? Math.min(1, availableWidth / width) : 1;

        if (isMobile && height) {
          scale = Math.min(scale, availableHeight / height);
          windowElement.style.left = '50%';
          windowElement.style.top = '50%';
          windowElement.style.transform = 'translate(-50%, -50%) scale(var(--mobile-scale))';
        }

        windowElement.style.setProperty('--mobile-scale', String(scale));
      });
    }

    const mobileWindowObserver = new ResizeObserver(updateMobileWindowScale);
    profileWindows.forEach((windowElement) => mobileWindowObserver.observe(windowElement));
    window.addEventListener('resize', updateMobileWindowScale);
    updateMobileWindowScale();

    bellButton.addEventListener('click', () => {
      bellButton.classList.remove('is-ringing');
      void bellButton.offsetWidth;
      bellButton.classList.add('is-ringing');

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      [880, 660].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startTime = now + index * 0.16;

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.2);
      });

      setTimeout(() => {
        bellButton.classList.remove('is-ringing');
        audioContext.close();
      }, 600);
    });

    function updateProfileClock() {
      const now = new Date();
      profileDate.textContent = now.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      profileClock.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const hongKongTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Hong_Kong',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }).format(now);
      const hongKongParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Hong_Kong',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(now);
      const timeParts = Object.fromEntries(hongKongParts.map(({ type, value }) => [type, value]));
      const seconds = Number(timeParts.second);
      const minutes = Number(timeParts.minute);
      const hours = Number(timeParts.hour) % 12;

      document.querySelectorAll('.sidebar-analog').forEach((clockFace) => {
        clockFace.style.setProperty('--hour-angle', `${hours * 30 + minutes * 0.5}deg`);
        clockFace.style.setProperty('--minute-angle', `${minutes * 6 + seconds * 0.1}deg`);
        clockFace.style.setProperty('--second-angle', `${seconds * 6}deg`);
      });
      document.querySelectorAll('[data-hk-clock]').forEach((digitalClock) => {
        digitalClock.textContent = hongKongTime;
        digitalClock.dateTime = hongKongTime;
      });
    }

    updateProfileClock();
    setInterval(updateProfileClock, 1000);

    let keyAudioContext;
    const visibleSidebarClocks = new Set();
    let clockTickTimer = null;
    let clockTickCount = 0;

    function playDigitalClockTick(now) {
      const oscillator = keyAudioContext.createOscillator();
      const gain = keyAudioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(clockTickCount % 2 === 0 ? 1320 : 990, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.018, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
      oscillator.connect(gain);
      gain.connect(keyAudioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.05);
      clockTickCount += 1;
    }

    function playClockTick() {
      if (!keyAudioContext || keyAudioContext.state !== 'running') {
        return;
      }

      const now = keyAudioContext.currentTime;
      if (document.querySelector('.profile-window.clock-home-active.interests-active')) {
        playDigitalClockTick(now);
        return;
      }

      const isTick = clockTickCount % 2 === 0;
      const clickLength = Math.floor(keyAudioContext.sampleRate * 0.012);
      const clickBuffer = keyAudioContext.createBuffer(1, clickLength, keyAudioContext.sampleRate);
      const clickSamples = clickBuffer.getChannelData(0);
      const clickSource = keyAudioContext.createBufferSource();
      const clickFilter = keyAudioContext.createBiquadFilter();
      const clickGain = keyAudioContext.createGain();
      const resonance = keyAudioContext.createOscillator();
      const resonanceGain = keyAudioContext.createGain();

      for (let sample = 0; sample < clickLength; sample += 1) {
        clickSamples[sample] = Math.random() * 2 - 1;
      }

      clickSource.buffer = clickBuffer;
      clickFilter.type = 'highpass';
      clickFilter.frequency.value = 1800;
      clickGain.gain.setValueAtTime(isTick ? 0.009 : 0.007, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);
      clickSource.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(keyAudioContext.destination);
      clickSource.start(now);

      resonance.type = 'triangle';
      resonance.frequency.value = isTick ? 980 : 760;
      resonanceGain.gain.setValueAtTime(0.0001, now);
      resonanceGain.gain.exponentialRampToValueAtTime(0.0045, now + 0.002);
      resonanceGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
      resonance.connect(resonanceGain);
      resonanceGain.connect(keyAudioContext.destination);
      resonance.start(now);
      resonance.stop(now + 0.06);
      clockTickCount += 1;
    }

    function updateClockTicking() {
      const hasDigitalClock = [...document.querySelectorAll('.profile-window.clock-home-active.interests-active')].some((profileElement) => {
        return getComputedStyle(profileElement).display !== 'none';
      });
      const hasVisibleClock = [...visibleSidebarClocks].some((clock) => {
        const profileElement = clock.closest('.profile-window');
        return profileElement
          && !profileElement.classList.contains('interests-active')
          && getComputedStyle(profileElement).display !== 'none';
      });
      const shouldTick = (hasVisibleClock || hasDigitalClock) && document.visibilityState === 'visible';
      if (shouldTick && clockTickTimer === null) {
        clockTickTimer = setInterval(playClockTick, 1000);
      } else if (!shouldTick && clockTickTimer !== null) {
        clearInterval(clockTickTimer);
        clockTickTimer = null;
      }
    }

    const sidebarClockObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
          visibleSidebarClocks.add(entry.target);
        } else {
          visibleSidebarClocks.delete(entry.target);
        }
      });
      updateClockTicking();
    }, { threshold: [0, 0.15] });

    function observeSidebarClock(clock) {
      if (clock) {
        sidebarClockObserver.observe(clock);
      }
    }

    function unobserveSidebarClock(clock) {
      if (clock) {
        sidebarClockObserver.unobserve(clock);
        visibleSidebarClocks.delete(clock);
        updateClockTicking();
      }
    }

    document.querySelectorAll('.sidebar-clock-wrap').forEach(observeSidebarClock);
    document.addEventListener('visibilitychange', updateClockTicking);

    async function playKeyClick() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!keyAudioContext) {
        keyAudioContext = new AudioContextClass();
      }

      if (keyAudioContext.state === 'suspended') {
        await keyAudioContext.resume();
      }

      const audioContext = keyAudioContext;
      const now = audioContext.currentTime;

      [950, 330].forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const startTime = now + index * 0.035;

        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.07);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.08);
      });

    }

    async function playDigitalClockBootSound() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!keyAudioContext) {
        keyAudioContext = new AudioContextClass();
      }

      if (keyAudioContext.state === 'suspended') {
        await keyAudioContext.resume();
      }

      const now = keyAudioContext.currentTime;
      [220, 440, 880, 1320, 1760].forEach((frequency, index) => {
        const oscillator = keyAudioContext.createOscillator();
        const gain = keyAudioContext.createGain();
        const startTime = now + index * 0.055;

        oscillator.type = 'square';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.07, startTime + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.045);
        oscillator.connect(gain);
        gain.connect(keyAudioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.05);
      });
    }

    async function playCloseSound() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!keyAudioContext) {
        keyAudioContext = new AudioContextClass();
      }

      if (keyAudioContext.state === 'suspended') {
        await keyAudioContext.resume();
      }

      const now = keyAudioContext.currentTime;
      [520, 300, 180].forEach((frequency, index) => {
        const oscillator = keyAudioContext.createOscillator();
        const gain = keyAudioContext.createGain();
        const startTime = now + index * 0.045;

        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);
        oscillator.connect(gain);
        gain.connect(keyAudioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.1);
      });
    }

    async function playLoadingSound() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!keyAudioContext) {
        keyAudioContext = new AudioContextClass();
      }

      if (keyAudioContext.state === 'suspended') {
        await keyAudioContext.resume();
      }

      const now = keyAudioContext.currentTime;
      [440, 554, 659, 880].forEach((frequency, index) => {
        const oscillator = keyAudioContext.createOscillator();
        const gain = keyAudioContext.createGain();
        const startTime = now + index * 0.28;

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.09, startTime + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.24);
        oscillator.connect(gain);
        gain.connect(keyAudioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.25);
      });
    }

    async function playCelebrationSound() {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      if (!keyAudioContext) {
        keyAudioContext = new AudioContextClass();
      }

      if (keyAudioContext.state === 'suspended') {
        await keyAudioContext.resume();
      }

      const now = keyAudioContext.currentTime;
      [523, 659, 784, 1047].forEach((frequency, index) => {
        const oscillator = keyAudioContext.createOscillator();
        const gain = keyAudioContext.createGain();
        const startTime = now + index * 0.13;

        oscillator.type = 'triangle';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);
        oscillator.connect(gain);
        gain.connect(keyAudioContext.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.31);
      });
    }

    const okButton = document.querySelector('.ok-btn');

    okButton.addEventListener('click', async () => {
      okButton.classList.remove('is-pressed');
      void okButton.offsetWidth;
      okButton.classList.add('is-pressed');
      await playKeyClick();
      playLoadingSound();
      greetingView.style.display = 'none';
      loadingView.style.display = 'flex';
      dialogTitle.textContent = 'System Loading...';
      let progress = 0;

      loadingTimer = setInterval(() => {
        progress += 2;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;

        if (progress >= 100) {
          clearInterval(loadingTimer);
          setTimeout(() => {
            loadingView.style.display = 'none';
            successView.style.display = 'flex';
            successCat.src = catImages[catIndex];
            dialogTitle.textContent = 'Cat Received!';
            playCelebrationSound();

            setTimeout(() => {
              greetingWindow.style.display = 'none';
              document.body.classList.add('profile-active');
              setProfilePage(profileWindow, 'home');
              profileWindow.style.display = 'flex';
            }, 1400);
          }, 300);
        }
      }, 35);
    });

    document.querySelector('#close-button').addEventListener('click', () => {
      window.open('', '_self');
      playCloseSound();
      setTimeout(() => window.close(), 120);
    });

    function restoreGreetingIfLastProfileClosed() {
      syncRulesWallpaper();
      const hasOpenProfile = [...document.querySelectorAll('.profile-window')].some((windowElement) => {
        return getComputedStyle(windowElement).display !== 'none';
      });

      if (hasOpenProfile) {
        return;
      }

      greetingWindow.style.display = 'flex';
      document.body.classList.remove('profile-active');
      greetingView.style.display = 'flex';
      loadingView.style.display = 'none';
      successView.style.display = 'none';
      progressFill.style.width = '0%';
      progressText.textContent = '0%';
      dialogTitle.textContent = '欢迎欢迎！';
    }

    document.querySelector('#profile-close-button').addEventListener('click', () => {
      playCloseSound();
      profileWindow.style.display = 'none';
      syncRulesWallpaper();
      restoreGreetingIfLastProfileClosed();
    });

    function refreshProfileTab(profileElement) {
      const refreshButton = profileElement.querySelector('.refresh-button');
      if (refreshButton.disabled) {
        return;
      }

      const isInterestsRefresh = profileElement.classList.contains('interests-active');
      const interestsView = profileElement.querySelector('.interests-view');
      refreshButton.disabled = true;
      profileElement.classList.add('is-refreshing');
      profileElement.classList.toggle('interests-refreshing', isInterestsRefresh);
      interestsView.classList.toggle('is-glitching', isInterestsRefresh);
      if (isInterestsRefresh) {
        profileElement.querySelector('.interest-refresh-label').textContent = 'REBOOTING INTERESTS';
        profileElement.querySelector('.interest-refresh-status').textContent = 'RE-SYNCHRONIZING ARCHIVE...';
        const progress = profileElement.querySelector('.interest-refresh-progress > span');
        progress.style.animation = 'none';
        void progress.offsetWidth;
        progress.style.animation = '';
      }
      profileElement.querySelector('.tab-refresh-screen').setAttribute('aria-hidden', 'false');

      setTimeout(() => {
        profileElement.classList.remove('is-refreshing');
        profileElement.classList.remove('interests-refreshing');
        interestsView.classList.remove('is-glitching');
        profileElement.querySelector('.tab-refresh-screen').setAttribute('aria-hidden', 'true');
        refreshButton.disabled = false;
        updateProfileClock();
      }, 1100);
    }

    function connectProfileRefresh(profileElement) {
      profileElement.querySelector('.refresh-button').addEventListener('click', () => {
        refreshProfileTab(profileElement);
      });
    }

    connectProfileRefresh(profileWindow);

    const namesToggle = document.querySelector('#names-toggle');
    const namesControl = document.querySelector('#names-control');
    const moreNames = document.querySelector('#more-names');
    let namesTouchInteraction = false;
    let namesPopoverCloseTimer;

    function setNamesPopoverOpen(isOpen) {
      clearTimeout(namesPopoverCloseTimer);
      namesToggle.setAttribute('aria-expanded', String(isOpen));
      moreNames.hidden = !isOpen;
    }

    function scheduleNamesPopoverClose() {
      clearTimeout(namesPopoverCloseTimer);
      namesPopoverCloseTimer = setTimeout(() => {
        if (!namesControl.matches(':hover') && !namesControl.contains(document.activeElement)) {
          setNamesPopoverOpen(false);
        }
      }, 150);
    }

    namesControl.addEventListener('pointerdown', (event) => {
      namesTouchInteraction = event.pointerType === 'touch' && event.target === namesToggle;
    });

    namesControl.addEventListener('pointerenter', (event) => {
      if (!mobileViewport.matches && event.pointerType === 'mouse') {
        setNamesPopoverOpen(true);
      }
    });

    namesControl.addEventListener('pointerleave', (event) => {
      if (!mobileViewport.matches && event.pointerType === 'mouse') {
        scheduleNamesPopoverClose();
      }
    });

    moreNames.addEventListener('pointerenter', () => {
      clearTimeout(namesPopoverCloseTimer);
    });

    moreNames.addEventListener('pointerleave', (event) => {
      if (!mobileViewport.matches && event.pointerType === 'mouse') {
        scheduleNamesPopoverClose();
      }
    });

    namesControl.addEventListener('focusin', () => {
      if (!mobileViewport.matches && !namesTouchInteraction) {
        setNamesPopoverOpen(true);
      }
    });

    namesControl.addEventListener('focusout', (event) => {
      if (!namesControl.contains(event.relatedTarget)) {
        setNamesPopoverOpen(false);
      }
    });

    namesToggle.addEventListener('click', () => {
      if (mobileViewport.matches || namesTouchInteraction) {
        setNamesPopoverOpen(namesToggle.getAttribute('aria-expanded') !== 'true');
        namesTouchInteraction = false;
      }
    });

    namesControl.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setNamesPopoverOpen(false);
        namesToggle.focus();
      }
    });

    function syncRulesWallpaper() {
      const hasVisibleRulesWindow = [...document.querySelectorAll('.profile-window.rules-active')].some((windowElement) => {
        return getComputedStyle(windowElement).display !== 'none';
      });
      const hasVisibleInterestsWindow = [...document.querySelectorAll('.profile-window.interests-active')].some((windowElement) => {
        return getComputedStyle(windowElement).display !== 'none';
      });
      document.body.classList.toggle('rules-mode', hasVisibleRulesWindow);
      document.body.classList.toggle('interests-mode', hasVisibleInterestsWindow);
    }

    let interestBootTimer;
    let interestDoorTransitionTimer;

    function setProfilePage(profileElement, page) {
      if (profileElement.classList.contains('clock-home-active')) {
        setClockHomeView(profileElement, false);
      }

      const isRules = page === 'rules';
      const isInterests = page === 'interests';
      const leavingInterests = !isInterests && profileElement.classList.contains('interests-active');
      const interestsView = profileElement.querySelector('.interests-view');
      const interestBootScreen = profileElement.querySelector('.interest-refresh-boot');
      const welcomeScreen = interestsView.querySelector('[data-interest-welcome]');
      clearTimeout(interestBootTimer);
      clearTimeout(interestDoorTransitionTimer);
      profileElement.classList.remove('skip-interest-door-slide');
      profileElement.classList.remove('interests-booting');
      interestsView.classList.remove('is-glitching');

      if (isInterests) {
        welcomeScreen.classList.remove('is-opening');
        profileElement.classList.add('interests-booting');
        interestsView.classList.add('is-glitching');
        interestBootScreen.querySelector('.interest-refresh-label').textContent = 'BOOTING INTERESTS';
        interestBootScreen.querySelector('.interest-refresh-status').textContent = 'INITIALIZING ARCHIVE...';
        const progress = interestBootScreen.querySelector('.interest-refresh-progress > span');
        progress.style.animation = 'none';
        void progress.offsetWidth;
        progress.style.animation = '';
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const bootDuration = reduceMotion ? 100 : 1100;
        const openingDuration = reduceMotion ? 10 : 700;
        interestBootTimer = setTimeout(() => {
          profileElement.classList.remove('interests-booting');
          interestsView.classList.remove('is-glitching');
          welcomeScreen.classList.add('is-opening');
          interestBootTimer = setTimeout(() => {
            welcomeScreen.classList.remove('is-opening');
          }, openingDuration);
        }, bootDuration);
      } else {
        welcomeScreen.classList.remove('is-opening');
      }

      if (!isInterests && interestsView.contains(document.activeElement)) {
        profileElement.querySelector(`[data-profile-page="${page}"]`).focus();
      }
      profileElement.classList.toggle('rules-active', isRules);
      profileElement.classList.toggle('interests-active', isInterests);
      if (leavingInterests) {
        profileElement.classList.add('skip-interest-door-slide');
        interestDoorTransitionTimer = setTimeout(() => {
          profileElement.classList.remove('skip-interest-door-slide');
        }, 50);
      }
      updateClockTicking();
      profileElement.querySelector('.rules-view').setAttribute('aria-hidden', String(!isRules));
      interestsView.setAttribute('aria-hidden', String(!isInterests));
      profileElement.querySelectorAll('[data-profile-page]').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.profilePage === page);
      });
      syncRulesWallpaper();
    }

    function connectProfileRules(profileElement) {
      profileElement.querySelector('[data-profile-rules]').addEventListener('click', () => {
        playKeyClick();
        setProfilePage(profileElement, 'rules');
      });
    }

    connectProfileRules(profileWindow);

    function connectProfileInterests(profileElement) {
      const interestsView = profileElement.querySelector('.interests-view');
      const welcomeScreen = interestsView.querySelector('[data-interest-welcome]');
      const interestCards = interestsView.querySelector('[data-interest-cards]');
      const gameCards = [...interestsView.querySelectorAll('[data-game-card]')];
      const gameIndex = interestsView.querySelector('[data-game-index]');
      const comingSoonScreen = profileElement.querySelector('[data-coming-soon-screen]');
      const comingSoonBack = comingSoonScreen.querySelector('[data-coming-soon-back]');
      let selectedGame = 0;

      function showGame(index) {
        selectedGame = (index + gameCards.length) % gameCards.length;
        gameCards.forEach((card, cardIndex) => {
          card.hidden = cardIndex !== selectedGame;
          const video = card.querySelector('video');
          if (!video) {
            return;
          }

          if (cardIndex === selectedGame) {
            video.play().catch((error) => {
              console.error('Unable to play the selected game preview.', error);
            });
          } else {
            video.pause();
          }
        });
        gameIndex.textContent = `${String(selectedGame + 1).padStart(2, '0')} / ${String(gameCards.length).padStart(2, '0')}`;
        interestCards.classList.remove('is-switching');
        void interestCards.offsetWidth;
        interestCards.classList.add('is-switching');
      }

      interestsView.querySelector('[data-enter-interests]').addEventListener('click', () => {
        playKeyClick();
        welcomeScreen.hidden = true;
        interestCards.hidden = false;
        showGame(selectedGame);
      });

      interestsView.querySelector('[data-game-previous]').addEventListener('click', () => {
        playKeyClick();
        showGame(selectedGame - 1);
      });

      interestsView.querySelector('[data-game-next]').addEventListener('click', () => {
        playKeyClick();
        showGame(selectedGame + 1);
      });

      interestsView.querySelectorAll('.save-file-play').forEach((button) => {
        button.addEventListener('click', () => {
          playKeyClick();
          profileElement.classList.add('is-coming-soon');
          comingSoonScreen.hidden = false;
          comingSoonScreen.classList.remove('is-glitching');
          void comingSoonScreen.offsetWidth;
          comingSoonScreen.classList.add('is-glitching');
          comingSoonBack.focus();
        });
      });

      comingSoonBack.addEventListener('click', () => {
        playKeyClick();
        comingSoonScreen.classList.remove('is-glitching');
        comingSoonScreen.hidden = true;
        profileElement.classList.remove('is-coming-soon');
        gameCards[selectedGame].querySelector('.save-file-play').focus();
      });

      interestsView.querySelector('[data-interest-back]').addEventListener('click', () => {
        playKeyClick();
        interestCards.hidden = true;
        interestCards.classList.remove('is-switching');
        welcomeScreen.hidden = false;
      });

      profileElement.querySelector('[data-profile-interests]').addEventListener('click', () => {
        playKeyClick();
        welcomeScreen.hidden = false;
        interestCards.hidden = true;
        interestCards.classList.remove('is-switching');
        setProfilePage(profileElement, 'interests');
      });
    }

    connectProfileInterests(profileWindow);

    const clockPlaceholderByProfile = new WeakMap();
    const analogClockCloseTimers = new WeakMap();

    function animateClockBetweenPositions(clock, fromRect, toRect) {
      const scaleX = fromRect.width / toRect.width;
      const scaleY = fromRect.height / toRect.height;
      const offsetX = fromRect.left - toRect.left;
      const offsetY = fromRect.top - toRect.top;

      clock.animate([
        {
          transformOrigin: 'top left',
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`
        },
        {
          transformOrigin: 'top left',
          transform: 'none'
        }
      ], {
        duration: 700,
        easing: 'ease-in-out'
      });
    }

    function animateClockAssembly(clock, reverse = false) {
      const analogClock = clock.querySelector('.sidebar-analog');
      const clockFace = clock.querySelector('.sidebar-clock-face');
      const faceBounds = clockFace.getBoundingClientRect();
      const scaleX = faceBounds.width / 120;
      const scaleY = faceBounds.height / 120;

      analogClock.animate([
        { transform: 'rotate(0deg)' },
        { transform: reverse ? 'rotate(-720deg)' : 'rotate(720deg)' }
      ], {
        duration: 1100,
        easing: 'cubic-bezier(0.22, 0.68, 0, 1)'
      });

      clock.querySelectorAll('.clock-roman-numerals text').forEach((numeral, index) => {
        const bounds = numeral.getBBox();
        const offsetX = (60 - bounds.x - bounds.width / 2) * scaleX;
        const offsetY = (60 - bounds.y - bounds.height / 2) * scaleY;

        numeral.animate([
          {
            opacity: reverse ? 1 : 0,
            transform: reverse ? 'translate(0, 0) scale(1)' : `translate(${offsetX}px, ${offsetY}px) scale(0.15)`
          },
          {
            opacity: reverse ? 0 : 1,
            transform: reverse ? `translate(${offsetX}px, ${offsetY}px) scale(0.15)` : 'translate(0, 0) scale(1)'
          }
        ], {
          duration: 420,
          delay: (reverse ? 11 - index : index) * 45,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
        });
      });
    }

    function setClockHomeView(profileElement, isActive) {
      if (profileElement.classList.contains('clock-home-active') === isActive) {
        return;
      }

      const isDigitalClock = profileElement.classList.contains('interests-active');
      const sidebar = profileElement.querySelector('.sidebar');
      const clockHomeScreen = profileElement.querySelector('.clock-home-screen');
      let clock;
      let fromRect;

      if (!isDigitalClock && isActive) {
        clearTimeout(analogClockCloseTimers.get(profileElement));
        profileElement.classList.add('analog-clock-active');
        clock = sidebar.querySelector('.sidebar-clock-wrap');
        fromRect = clock.getBoundingClientRect();
        unobserveSidebarClock(clock);

        const placeholder = document.createElement('div');
        placeholder.className = 'sidebar-clock-placeholder';
        placeholder.style.width = `${fromRect.width}px`;
        placeholder.style.height = `${fromRect.height}px`;
        sidebar.insertBefore(placeholder, clock);
        clockPlaceholderByProfile.set(profileElement, placeholder);
        clockHomeScreen.append(clock);
      } else if (!isDigitalClock) {
        clock = clockHomeScreen.querySelector('.sidebar-clock-wrap');
        fromRect = clock.getBoundingClientRect();
        unobserveSidebarClock(clock);

        const placeholder = clockPlaceholderByProfile.get(profileElement);
        sidebar.insertBefore(clock, placeholder);
        placeholder.remove();
        clockPlaceholderByProfile.delete(profileElement);
      }

      if (isActive && isDigitalClock) {
        clearTimeout(analogClockCloseTimers.get(profileElement));
        profileElement.classList.remove('analog-clock-active');
        playDigitalClockBootSound();
      }

      profileElement.classList.toggle('clock-home-active', isActive);
      if (!isDigitalClock && !isActive) {
        const closeTimer = setTimeout(() => {
          profileElement.classList.remove('analog-clock-active');
          analogClockCloseTimers.delete(profileElement);
        }, 700);
        analogClockCloseTimers.set(profileElement, closeTimer);
      }
      const eyeButton = profileElement.querySelector('.profile-eye-button');
      eyeButton.setAttribute('aria-pressed', String(isActive));
      eyeButton.setAttribute('aria-label', `${isActive ? 'Hide' : 'Show'} clock and credits`);
      clockHomeScreen.setAttribute('aria-hidden', String(!isActive));
      if (clock) {
        observeSidebarClock(clock);
        animateClockBetweenPositions(clock, fromRect, clock.getBoundingClientRect());
        animateClockAssembly(clock, !isActive);
      }
      updateClockTicking();
    }

    function connectProfileHomeControls(profileElement) {
      profileElement.querySelector('.profile-eye-button').addEventListener('click', () => {
        setClockHomeView(profileElement, !profileElement.classList.contains('clock-home-active'));
      });
      profileElement.querySelector('[data-profile-home]').addEventListener('click', () => {
        playKeyClick();
        setProfilePage(profileElement, 'home');
      });
    }

    connectProfileHomeControls(profileWindow);

    document.querySelector('#profile-prev').addEventListener('click', () => {
      profileWindow.classList.add('sidebar-hidden');
    });

    document.querySelector('#profile-next').addEventListener('click', () => {
      profileWindow.classList.remove('sidebar-hidden');
    });

    document.querySelector('#center-window-button').addEventListener('click', () => {
      const visibleWindow = getComputedStyle(profileWindow).display !== 'none'
        ? profileWindow
        : greetingWindow;
      visibleWindow.style.left = '50%';
      visibleWindow.style.top = '50%';
      visibleWindow.style.transform = 'translate(-50%, -50%) scale(var(--mobile-scale, 1))';
    });

    function makeDraggable(windowElement) {
      const titleBar = windowElement.querySelector('.title-bar, .window-header');
      let isDragging = false;
      let dragOffsetX = 0;
      let dragOffsetY = 0;

      titleBar.addEventListener('pointerdown', (event) => {
        if (mobileViewport.matches || event.target.closest('button')) {
          return;
        }

        const bounds = windowElement.getBoundingClientRect();
        windowElement.style.transform = 'none';
        windowElement.style.left = `${bounds.left}px`;
        windowElement.style.top = `${bounds.top}px`;
        dragOffsetX = event.clientX - bounds.left;
        dragOffsetY = event.clientY - bounds.top;
        isDragging = true;
        titleBar.setPointerCapture(event.pointerId);
      });

      titleBar.addEventListener('pointermove', (event) => {
        if (!isDragging) {
          return;
        }

        windowElement.style.left = `${event.clientX - dragOffsetX}px`;
        windowElement.style.top = `${event.clientY - dragOffsetY}px`;
      });

      titleBar.addEventListener('pointerup', (event) => {
        isDragging = false;
        titleBar.releasePointerCapture(event.pointerId);
      });
    }

    makeDraggable(greetingWindow);
    makeDraggable(profileWindow);
  