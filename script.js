document.addEventListener('DOMContentLoaded', () => {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playPauseIcon = playPauseBtn.querySelector('i');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const audioPlayer = document.getElementById('audio-player');
    const volumeSlider = document.getElementById('volume-slider');
    
    const albumArt = document.querySelector('.album-art');
    const trackTitle = document.getElementById('track-title');
    const trackArtist = document.getElementById('track-artist');

    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');
    const backgroundContainer = document.getElementById('background-container');

    const searchInput = document.getElementById('search-input');
    const playlistEl = document.getElementById('playlist');
    
    let audioContext, analyser, source, dataArray, bufferLength;
    let fullPlaylist = [];
    let currentPlaylist = [];
    let currentTrackIndex = 0;
    let isPlaying = false;
    let repeatState = 1; // 0: no repeat, 1: repeat playlist, 2: repeat one

    function initAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                source = audioContext.createMediaElementSource(audioPlayer);
                source.connect(analyser);
                analyser.connect(audioContext.destination);
                analyser.fftSize = 256;
                bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                drawVisualizer();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser", e);
            }
        }
    }

    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);

        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        let bassSum = 0;
        for (let i = 0; i < bufferLength / 8; i++) { // Bass frequencies
             bassSum += dataArray[i];
        }
        const bassAverage = bassSum / (bufferLength / 8);
        const scale = 1 + (bassAverage / 255) * 0.05; // Reduced effect
        const brightness = 1 + (bassAverage / 255) * 0.2; // Reduced effect
        
        backgroundContainer.style.transform = `scale(${scale})`;
        backgroundContainer.style.filter = `brightness(${brightness})`;


        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * 2;
            
            const r = barHeight + (25 * (i/bufferLength));
            const g = 250 * (i/bufferLength);
            const b = 50;

            canvasCtx.fillStyle = `rgba(230, 0, 115, ${0.2 + (dataArray[i] / 255) * 0.5})`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }

    async function fetchPlaylist() {
        try {
            const response = await fetch('playlist.json');
            fullPlaylist = await response.json();
            currentPlaylist = [...fullPlaylist];
            renderPlaylist();
            loadTrack(currentTrackIndex);
        } catch (error) {
            console.error('Could not fetch playlist:', error);
        }
    }

    function renderPlaylist() {
        playlistEl.innerHTML = '';
        currentPlaylist.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            
            const isCurrent = currentPlaylist[currentTrackIndex].src === song.src;
            if (isCurrent) {
                 li.classList.add('active');
            }

            li.innerHTML = `
                <img src="${song.art}" alt="${song.title}" class="playlist-item-art">
                <div class="playlist-item-info">
                    <span class="playlist-item-title">${song.title}</span>
                    <span class="playlist-item-artist">${song.artist}</span>
                </div>
            `;
            li.addEventListener('click', () => {
                const originalIndex = fullPlaylist.findIndex(s => s.src === song.src);
                currentTrackIndex = currentPlaylist.findIndex(s => s.src === song.src);
                loadTrack(currentTrackIndex);
                playTrack();
            });
            playlistEl.appendChild(li);
        });
    }

    function loadTrack(trackIndex) {
        if (currentPlaylist.length === 0) return;
        const track = currentPlaylist[trackIndex];
        trackTitle.textContent = track.title;
        trackArtist.textContent = track.artist;
        albumArt.src = track.art;
        audioPlayer.src = track.src;

        if (track.src === "MISSING_AUDIO.mp3") {
            playPauseBtn.disabled = true;
        } else {
            playPauseBtn.disabled = false;
        }

        renderPlaylist();
    }

    function playTrack() {
        if (currentPlaylist.length === 0) return;
        initAudioContext();
        
        audioPlayer.play().then(() => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            isPlaying = true;
            playPauseIcon.classList.remove('fa-play');
            playPauseIcon.classList.add('fa-pause');
            albumArt.style.animation = 'spin 8s linear infinite';
        }).catch(error => {
            console.log("Autoplay was prevented. User must interact with the page first.", error);
            pauseTrack();
        });
    }

    function pauseTrack() {
        isPlaying = false;
        audioPlayer.pause();
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
        albumArt.style.animation = 'none';
    }

    function togglePlayPause() {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    }

    function nextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) playTrack();
    }

    function prevTrack() {
        currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        loadTrack(currentTrackIndex);
        if (isPlaying) playTrack();
    }
    
    function setVolume() {
        audioPlayer.volume = volumeSlider.value;
    }
    
    function handleSongEnd() {
        if (repeatState === 2) { // repeat one
            audioPlayer.currentTime = 0;
            playTrack();
        } else if (repeatState === 1) { // repeat playlist
            nextTrack();
        } else { // no repeat
            if (currentTrackIndex < currentPlaylist.length - 1) {
                nextTrack();
            } else {
                pauseTrack();
            }
        }
    }

    function toggleRepeat() {
        repeatState = (repeatState + 1) % 3;
        switch (repeatState) {
            case 0: // no repeat
                repeatBtn.classList.remove('active');
                repeatBtn.innerHTML = '<i class="fas fa-repeat"></i>';
                repeatBtn.title = "Repeat Off";
                break;
            case 1: // repeat playlist
                repeatBtn.classList.add('active');
                repeatBtn.innerHTML = '<i class="fas fa-repeat"></i>';
                repeatBtn.title = "Repeat Playlist";
                break;
            case 2: // repeat one
                repeatBtn.classList.add('active');
                repeatBtn.innerHTML = '<i class="fas fa-repeat-1"></i>';
                repeatBtn.title = "Repeat One";
                break;
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function updateProgress() {
        const { duration, currentTime } = audioPlayer;
        if (duration) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            currentTimeEl.textContent = formatTime(currentTime);
        }
    }
    
    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audioPlayer.duration;
        if(duration){
            audioPlayer.currentTime = (clickX / width) * duration;
        }
    }
    
    function setDuration() {
        durationEl.textContent = formatTime(audioPlayer.duration);
    }

    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        currentPlaylist = fullPlaylist.filter(song => 
            song.title.toLowerCase().includes(searchTerm) || 
            song.artist.toLowerCase().includes(searchTerm)
        );
        currentTrackIndex = 0;
        renderPlaylist();
    }

    // Event Listeners
    playPauseBtn.addEventListener('click', togglePlayPause);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    repeatBtn.addEventListener('click', toggleRepeat);
    searchInput.addEventListener('input', handleSearch);
    volumeSlider.addEventListener('input', setVolume);
    
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', setDuration);
    audioPlayer.addEventListener('ended', handleSongEnd);
    
    progressContainer.addEventListener('click', setProgress);

    // Initial Load
    fetchPlaylist();
    toggleRepeat(); // Set to default state (repeat playlist)
});