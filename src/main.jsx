import { useState, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import {
  auth, db, signInAnonymously, onAuthStateChanged,
  ref, get, onValue, off,
  createRoom, joinRoom, startGame, submitAnswer, advanceRound, leaveRoom, calcScores,
} from './firebase.js'

const APP_VERSION = '2026.07.06.10'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const THEMES = [
  { id: 'dark',   name: 'Dark Party',    emoji: '🌙', primary: '#6C63FF', bg: '#0D0D1A', surface: '#1A1A2E', card: '#22224A', text: '#FFFFFF', accent: '#FF6B6B' },
  { id: 'neon',   name: 'Neon Rave',     emoji: '⚡', primary: '#00FF88', bg: '#020208', surface: '#080818', card: '#0D0D22', text: '#FFFFFF', accent: '#FF00FF' },
  { id: 'retro',  name: 'Retro Arcade',  emoji: '🕹️', primary: '#FFD700', bg: '#1A0A2E', surface: '#2D1B4E', card: '#3D2060', text: '#FFD700', accent: '#FF4444' },
  { id: 'gold',   name: 'Gold VIP',      emoji: '👑', primary: '#FFD700', bg: '#0F0A00', surface: '#1E1400', card: '#2A1F00', text: '#FFE066', accent: '#FFA500' },
  { id: 'ocean',  name: 'Ocean Night',   emoji: '🌊', primary: '#00B4D8', bg: '#03045E', surface: '#023E8A', card: '#0077B6', text: '#FFFFFF', accent: '#90E0EF' },
]

const SONG_PACKS = [
  // Decades
  { id: '60s',       name: '60s Classics',  term: '60s classic hits',            emoji: '☮️', desc: 'Peace, love & rock n roll' },
  { id: '70s',       name: '70s Hits',      term: '70s greatest hits',           emoji: '🪩', desc: 'Boogie nights!' },
  { id: '80s',       name: '80s Hits',      term: '80s classic pop hits',        emoji: '🕺', desc: 'Totally radical!' },
  { id: '90s',       name: '90s Bangers',   term: '90s greatest hits',           emoji: '💿', desc: 'All that and a bag of chips' },
  { id: '00s',       name: '2000s Pop',     term: '2000s pop hits',              emoji: '🌟', desc: 'Y2K certified bops' },
  { id: '10s',       name: '2010s Hits',    term: '2010s pop hits',              emoji: '📱', desc: 'The Instagram era' },
  { id: 'today',     name: "Today's Hits",  term: 'pop hits 2024',               emoji: '🔥', desc: 'Current bangers only' },
  // Genres
  { id: 'party',     name: 'Party Mix',     term: 'top hits',                    emoji: '🎉', desc: 'The ultimate crowd pleaser' },
  { id: 'pop',       name: 'Pop Anthems',   term: 'pop anthems hits',            emoji: '🌈', desc: 'Sing it loud' },
  { id: 'hiphop',    name: 'Hip Hop',       term: 'hip hop rap classics',        emoji: '🎤', desc: 'Drop the beat' },
  { id: 'rnb',       name: 'R&B Soul',      term: 'rnb soul hits',               emoji: '💃', desc: 'Feel the groove' },
  { id: 'rock',      name: 'Classic Rock',  term: 'classic rock hits',           emoji: '🎸', desc: 'Turn it up to 11' },
  { id: 'indierock', name: 'Indie Rock',    term: 'indie rock alternative hits', emoji: '🎵', desc: 'Hipster approved' },
  { id: 'metal',     name: 'Metal',         term: 'heavy metal hits',            emoji: '🤘', desc: 'Headbanger special' },
  { id: 'punk',      name: 'Punk Rock',     term: 'punk rock hits',              emoji: '⚡', desc: 'Anarchy in the charts' },
  { id: 'country',   name: 'Country',       term: 'country hits',                emoji: '🤠', desc: 'Boots & banjos baby' },
  { id: 'latin',     name: 'Latin Hits',    term: 'latin pop hits',              emoji: '🌴', desc: 'Hot hot hot' },
  { id: 'kpop',      name: 'K-Pop',         term: 'kpop hits',                   emoji: '⭐', desc: 'Annyeong!' },
  { id: 'reggae',    name: 'Reggae',        term: 'reggae hits',                 emoji: '🎶', desc: 'One love' },
  { id: 'edm',       name: 'EDM / Dance',   term: 'edm electronic dance music',  emoji: '🎧', desc: 'Drop the bass' },
  { id: 'jazz',      name: 'Jazz & Blues',  term: 'jazz blues classics',         emoji: '🎷', desc: 'Smooth operator' },
  { id: 'soul',      name: 'Motown Soul',   term: 'motown soul classics',        emoji: '🕺', desc: 'Straight from Detroit' },
  { id: 'disney',    name: 'Disney',        term: 'disney movie songs',          emoji: '🏰', desc: 'Hakuna Matata!' },
  { id: 'christmas', name: 'Christmas',     term: 'christmas holiday songs',     emoji: '🎄', desc: 'Tis the season' },
  { id: 'bollywood', name: 'Bollywood',     term: 'bollywood hits',              emoji: '🎬', desc: 'Bollywood magic' },
  { id: 'kids',      name: 'Kids Songs',    term: 'children songs kids',         emoji: '🧒', desc: 'For the young ones' },
]

const DECADE_IDS = ['60s','70s','80s','90s','00s','10s','today']

const AVATARS = [
  '🐻','🦊','🐼','🐯','🦁','🐺','🐸','🐙','🦄','🐲',
  '👾','🤖','👻','🎃','🎭','🦸','🧙','🎅','🧜','🦋',
  '🐬','🦅','🐉','🌺','🎪','🦩','🐧','🦚','🦜','🎠',
]

const ROUND_COUNTS = [5, 10, 15, 20]
const TIMER_DURATION = 10
const ANSWER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FED766']
const ANSWER_LABELS = ['A', 'B', 'C', 'D']

// ─── ITUNES API ───────────────────────────────────────────────────────────────

async function fetchSongs(term, artistOnly = false) {
  if (artistOnly) {
    // Step 1: find the artist's iTunes ID
    const artistRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=musicArtist&limit=5`
    )
    if (!artistRes.ok) throw new Error('iTunes API error')
    const artistData = await artistRes.json()
    const artist = artistData.results?.[0]
    if (!artist) throw new Error('Artist not found')

    // Step 2: look up songs by that artist ID directly
    const songsRes = await fetch(
      `https://itunes.apple.com/lookup?id=${artist.artistId}&entity=song&limit=200`
    )
    if (!songsRes.ok) throw new Error('iTunes API error')
    const songsData = await songsRes.json()
    return songsData.results.filter(t =>
      t.wrapperType === 'track' && t.previewUrl && t.trackName && t.artistName
    )
  }

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=50&media=music`
  const res = await fetch(url)
  if (!res.ok) throw new Error('iTunes API error')
  const data = await res.json()
  return data.results.filter(t => t.previewUrl && t.trackName && t.artistName)
}

function buildRoundData(tracks, count) {
  const shuffled = [...tracks].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(correct => {
    const pool = shuffled.filter(t => t.trackId !== correct.trackId)
    const wrong = pool.sort(() => Math.random() - 0.5).slice(0, 3)
    const options = [correct, ...wrong].sort(() => Math.random() - 0.5).map(t => ({
      trackId: t.trackId, trackName: t.trackName, artistName: t.artistName,
    }))
    return {
      correct: {
        trackId: correct.trackId,
        trackName: correct.trackName,
        artistName: correct.artistName,
        artworkUrl100: correct.artworkUrl100 || '',
        previewUrl: correct.previewUrl,
      },
      options,
      startAt: 0,
    }
  })
}

// ─── CANVAS EFFECTS ───────────────────────────────────────────────────────────

function launchConfetti(canvas, count = 120) {
  if (!canvas) return () => {}
  const ctx = canvas.getContext('2d')
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#FED766','#F0B429','#6C63FF','#FF63A5','#63FF6C']
  const pieces = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.5,
    r: Math.random() * 7 + 3, color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 5, vy: Math.random() * 3 + 2,
    angle: Math.random() * 360, va: (Math.random() - 0.5) * 8,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
  }))
  let frame
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.angle += p.va; p.vy += 0.08
      if (p.y < canvas.height + 20) alive = true
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle * Math.PI / 180); ctx.fillStyle = p.color
      if (p.shape === 'rect') ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
      else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill() }
      ctx.restore()
    })
    if (alive) frame = requestAnimationFrame(animate)
    else ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  animate()
  return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, canvas.width, canvas.height) }
}

function launchFireworks(canvas, duration = 5000) {
  if (!canvas) return () => {}
  const ctx = canvas.getContext('2d')
  canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight
  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#FED766','#6C63FF','#FF63A5','#FFD700','#FF4500','#00FF88']
  const particles = []
  function explode(x, y) {
    const color = colors[Math.floor(Math.random() * colors.length)]
    for (let i = 0; i < 70; i++) {
      const angle = (i / 70) * Math.PI * 2; const speed = Math.random() * 6 + 2
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, alpha: 1, color, r: Math.random() * 3 + 1 })
    }
  }
  const times = [0,300,600,900,1200,1600,2000,2500,3000,3500]
  const handles = times.map(t => setTimeout(() => {
    explode(canvas.width * (0.2 + Math.random() * 0.6), canvas.height * (0.1 + Math.random() * 0.5))
  }, t))
  let frame
  const animate = () => {
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.alpha -= 0.012
      if (p.alpha <= 0) { particles.splice(i, 1); continue }
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    }
    frame = requestAnimationFrame(animate)
  }
  animate()
  const stop = setTimeout(() => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, canvas.width, canvas.height) }, duration + 1000)
  return () => { handles.forEach(clearTimeout); clearTimeout(stop); cancelAnimationFrame(frame); ctx.clearRect(0, 0, canvas.width, canvas.height) }
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────

function ParticlesBg() {
  return (
    <div className="particles-bg" aria-hidden>
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="particle" style={{
          '--d': `${(Math.random() * 5).toFixed(1)}s`, '--dur': `${(Math.random() * 12 + 10).toFixed(1)}s`,
          '--x': `${Math.floor(Math.random() * 100)}%`, '--sz': `${(Math.random() * 5 + 2).toFixed(1)}px`,
          '--op': `${(Math.random() * 0.4 + 0.1).toFixed(2)}`,
        }} />
      ))}
    </div>
  )
}

function Equalizer() {
  return (
    <div className="equalizer" aria-label="Music playing">
      {[1,2,3,4,5].map(i => <div key={i} className="eq-bar" style={{ '--i': i }} />)}
    </div>
  )
}

function TimerBar({ timeLeft }) {
  const pct = (timeLeft / TIMER_DURATION) * 100
  const color = pct > 60 ? '#4CAF50' : pct > 30 ? '#FFA726' : '#EF5350'
  return (
    <div className="timer-track">
      <div className="timer-fill" style={{ width: `${pct}%`, background: color }} />
      <span className="timer-num">{Math.ceil(timeLeft)}</span>
    </div>
  )
}

// ─── PULL TO REFRESH ─────────────────────────────────────────────────────────

function PullToRefresh() {
  const [dist, setDist] = useState(0)
  const startY = useRef(null)
  const THRESHOLD = 72

  useEffect(() => {
    function onStart(e) {
      startY.current = e.touches[0].clientY
    }
    function onMove(e) {
      if (startY.current === null) return
      const d = Math.max(0, e.touches[0].clientY - startY.current)
      setDist(Math.min(d, THRESHOLD + 24))
    }
    function onEnd() {
      if (dist >= THRESHOLD) window.location.reload()
      startY.current = null
      setDist(0)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [dist])

  if (dist < 8) return null
  const progress = Math.min(dist / THRESHOLD, 1)
  const ready = dist >= THRESHOLD
  return (
    <div className="ptr-bar" style={{ opacity: progress }}>
      <div className="ptr-icon" style={{ transform: `rotate(${progress * 180}deg)` }}>
        {ready ? '✓' : '↓'}
      </div>
      <span>{ready ? 'Release to refresh' : 'Pull to refresh'}</span>
    </div>
  )
}

// ─── THREE DOT MENU + ABOUT ───────────────────────────────────────────────────

function AboutModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} className="about-icon" alt="BeatDrop" />
        <h2 className="about-title">BeatDrop</h2>
        <p className="about-sub">The Ultimate Music Party Game</p>
        <p className="about-version">Version {APP_VERSION}</p>
        <p className="about-credit">Created by Bill Parsons</p>
        <p className="about-powered">Powered by iTunes Search API</p>
        <button className="btn-primary" style={{ marginTop: 8 }} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

function ThreeDotsMenu() {
  const [open, setOpen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('touchstart', onOutside)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('touchstart', onOutside)
    }
  }, [])

  return (
    <>
      <div className="three-dots-wrap" ref={menuRef}>
        <button className="three-dots-btn" onClick={() => setOpen(v => !v)} aria-label="Menu">
          <span /><span /><span />
        </button>
        {open && (
          <div className="dots-dropdown">
            <button className="dots-item" onClick={() => { setOpen(false); window.location.reload() }}>
              🔄 Refresh
            </button>
            <button className="dots-item" onClick={() => { setOpen(false); setShowAbout(true) }}>
              ℹ️ About
            </button>
          </div>
        )}
      </div>
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  )
}

// ─── WELCOME SCREEN ───────────────────────────────────────────────────────────

function WelcomeScreen({ onCreate, onJoin, onSolo, theme, onThemeChange, signingIn }) {
  return (
    <div className="screen welcome-screen">
      <PullToRefresh />
      <ParticlesBg />
      <ThreeDotsMenu />
      <div className="welcome-content">
        <div className="logo-wrap">
          <div className="logo-note">🎵</div>
          <h1 className="logo-title">Beat<em>Drop</em></h1>
          <p className="logo-tagline">The Ultimate Music Party Game</p>
        </div>

        <div className="theme-row">
          <p className="theme-label">Choose your vibe:</p>
          <div className="theme-btns">
            {THEMES.map(t => (
              <button key={t.id} className={`theme-btn ${theme.id === t.id ? 'active' : ''}`}
                onClick={() => onThemeChange(t)} title={t.name}>
                <span>{t.emoji}</span>
                <span className="theme-btn-name">{t.name}</span>
              </button>
            ))}
          </div>
        </div>

        {signingIn ? (
          <div className="signing-in"><div className="spinner" /><p>Connecting...</p></div>
        ) : (
          <div className="welcome-btns">
            <button className="btn-primary btn-huge pulse-btn" onClick={onCreate}>🎮 Create Room</button>
            <button className="btn-secondary btn-huge" onClick={onJoin}>🚪 Join Room</button>
            <button className="btn-text" onClick={onSolo}>🎯 Solo Practice</button>
          </div>
        )}

        <p className="version-tag">v{APP_VERSION} · Powered by iTunes</p>
      </div>
    </div>
  )
}

// ─── IDENTITY PICKER (shared by Create + Join) ────────────────────────────────

function IdentityPicker({ onDone, onBack, title, sub }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [showPicker, setShowPicker] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="screen setup-screen">
      <ParticlesBg />
      <div className="screen-card">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2 className="screen-title">{title}</h2>
        <p className="screen-sub">{sub}</p>

        <div className="add-row">
          <button className="avatar-btn" onClick={() => setShowPicker(v => !v)}>
            {avatar} <span className="caret">▾</span>
          </button>
          <input ref={inputRef} className="name-input" placeholder="Your nickname..."
            value={name} maxLength={14} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && onDone(name.trim(), avatar)} />
        </div>

        {showPicker && (
          <div className="avatar-picker">
            {AVATARS.map(a => (
              <button key={a} className={`avatar-opt ${avatar === a ? 'sel' : ''}`}
                onClick={() => { setAvatar(a); setShowPicker(false) }}>{a}</button>
            ))}
          </div>
        )}

        <button className="btn-primary" onClick={() => onDone(name.trim(), avatar)} disabled={!name.trim()}>
          Let's Go! →
        </button>
      </div>
    </div>
  )
}

// ─── JOIN ROOM SCREEN ─────────────────────────────────────────────────────────

function JoinRoomScreen({ onJoin, onBack, loading, error }) {
  const [code, setCode] = useState('')

  return (
    <div className="screen setup-screen">
      <ParticlesBg />
      <div className="screen-card">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2 className="screen-title">Join a Room</h2>
        <p className="screen-sub">Enter the 4-letter room code</p>

        <input
          className="name-input code-input"
          placeholder="e.g. BEAT"
          value={code}
          maxLength={4}
          onChange={e => setCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && code.length === 4 && onJoin(code)}
        />

        {error && <p className="error-msg">⚠️ {error}</p>}

        <button className="btn-primary" onClick={() => onJoin(code)}
          disabled={code.length !== 4 || loading}>
          {loading ? 'Joining...' : 'Join Room →'}
        </button>
      </div>
    </div>
  )
}

// ─── PACK PICKER ─────────────────────────────────────────────────────────────

function PackPicker({ pack, onChange }) {
  const [showCustom, setShowCustom] = useState(pack?.isCustom ?? false)
  const [customArtist, setCustomArtist] = useState(pack?.isCustom ? pack.name : '')
  const [customError, setCustomError] = useState('')
  const [validating, setValidating] = useState(false)
  const [validated, setValidated] = useState(pack?.isCustom && !!pack.term)

  const selectVal = showCustom ? '__custom__' : (pack?.id ?? SONG_PACKS[0].id)

  function handleSelectChange(e) {
    const val = e.target.value
    if (val === '__custom__') {
      setShowCustom(true)
      setCustomArtist('')
      setValidated(false)
      setCustomError('')
      onChange({ id: '__custom__', name: '', term: '', emoji: '🎤', isCustom: true, desc: '' })
    } else {
      setShowCustom(false)
      setValidated(false)
      setCustomError('')
      onChange(SONG_PACKS.find(p => p.id === val) ?? SONG_PACKS[0])
    }
  }

  async function validateArtist() {
    const name = customArtist.trim()
    if (!name) return
    setValidating(true)
    setCustomError('')
    setValidated(false)
    try {
      const tracks = await fetchSongs(name, true)
      if (tracks.length < 4) {
        setCustomError(`No songs found for "${name}". Try a different spelling.`)
        onChange({ id: '__custom__', name: '', term: '', emoji: '🎤', isCustom: true, artistOnly: true, desc: '' })
      } else {
        onChange({ id: `custom_${name}`, name, term: name, emoji: '🎤', isCustom: true, artistOnly: true, desc: `Songs by ${name}` })
        setValidated(true)
      }
    } catch {
      setCustomError('Search failed. Check your connection.')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="pack-picker">
      <label className="pack-picker-label">Category</label>
      <select className="pack-select" value={selectVal} onChange={handleSelectChange}>
        <option value="__custom__">🎤 Custom Artist / Band...</option>
        <optgroup label="── Decades ──────────">
          {SONG_PACKS.filter(p => DECADE_IDS.includes(p.id)).map(p => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
          ))}
        </optgroup>
        <optgroup label="── Genres ───────────">
          {SONG_PACKS.filter(p => !DECADE_IDS.includes(p.id)).map(p => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
          ))}
        </optgroup>
      </select>

      {showCustom && (
        <div className="custom-artist-row">
          <div className="custom-artist-input-wrap">
            <input className="name-input" placeholder="Type artist or band name..."
              value={customArtist}
              onChange={e => { setCustomArtist(e.target.value); setValidated(false); setCustomError('') }}
              onKeyDown={e => e.key === 'Enter' && validateArtist()} />
            <button className="btn-secondary custom-search-btn" onClick={validateArtist}
              disabled={!customArtist.trim() || validating}>
              {validating ? '⏳' : '🔍'}
            </button>
          </div>
          {customError && <p className="error-msg">⚠️ {customError}</p>}
          {validated && <p className="success-msg">✓ Found songs for <strong>{customArtist}</strong>!</p>}
        </div>
      )}
    </div>
  )
}

// ─── CREATE ROOM SCREEN ───────────────────────────────────────────────────────

function CreateRoomScreen({ onStart, onBack, loading, error }) {
  const [pack, setPack] = useState(SONG_PACKS[0])
  const [rounds, setRounds] = useState(10)

  return (
    <div className="screen pack-screen">
      <ParticlesBg />
      <div className="screen-card pack-card-wrap">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2 className="screen-title">Create a Room</h2>

        <PackPicker pack={pack} onChange={setPack} />

        <div className="rounds-row">
          <span className="rounds-label">Rounds:</span>
          {ROUND_COUNTS.map(r => (
            <button key={r} className={`rounds-btn ${rounds === r ? 'active' : ''}`}
              onClick={() => setRounds(r)}>{r}</button>
          ))}
        </div>

        {error && <p className="error-msg">⚠️ {error}</p>}

        <button className="btn-primary" onClick={() => onStart(pack, rounds)} disabled={loading || !pack?.term}>
          {loading ? 'Creating...' : 'Create Room! 🎵'}
        </button>
      </div>
    </div>
  )
}

// ─── LOBBY SCREEN ─────────────────────────────────────────────────────────────

function LobbyScreen({ roomCode, players, isHost, pack, totalRounds, onStart, onLeave, starting, startError }) {
  const playerList = Object.values(players || {})

  return (
    <div className="screen lobby-screen">
      <ParticlesBg />
      <div className="screen-card lobby-card">
        <button className="btn-back" onClick={onLeave}>✕ Leave</button>

        <div className="room-code-box">
          <p className="room-code-label">Room Code</p>
          <div className="room-code">{roomCode}</div>
          <p className="room-code-hint">Share this code with your friends!</p>
        </div>

        <div className="lobby-pack-info">
          <span>{pack?.emoji}</span>
          <span>{pack?.name}</span>
          <span className="dot">·</span>
          <span>{totalRounds} rounds</span>
        </div>

        <div className="lobby-players">
          <p className="lobby-players-label">Players ({playerList.length})</p>
          {playerList.map((p, i) => (
            <div key={i} className="lobby-player-row">
              <span className="lp-avatar">{p.avatar}</span>
              <span className="lp-name">{p.name}</span>
              {p.isHost && <span className="host-badge">HOST</span>}
            </div>
          ))}
          {playerList.length < 2 && (
            <p className="lobby-waiting">Waiting for more players to join...</p>
          )}
        </div>

        {isHost ? (
          <>
            {startError && <p className="error-msg">⚠️ {startError}</p>}
            <button className="btn-primary" onClick={onStart} disabled={starting || playerList.length < 1}>
              {starting ? '🎵 Loading songs...' : '▶ Start Game!'}
            </button>
            {playerList.length < 2 && <p className="screen-sub" style={{textAlign:'center'}}>You can start solo or wait for friends</p>}
          </>
        ) : (
          <div className="waiting-host">
            <div className="spinner" />
            <p>Waiting for the host to start...</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ONLINE GAME SCREEN ───────────────────────────────────────────────────────

function OnlineGameScreen({ uid, isHost, roomCode, roomData, players, rounds, answers, onAdvance, onCancel }) {
  const ri = roomData?.currentRound ?? 0
  const round = rounds?.[ri]
  const totalRounds = roomData?.totalRounds ?? 10

  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [localRevealed, setLocalRevealed] = useState(false)
  const [myAnswer, setMyAnswer] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)

  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const confettiRef = useRef(null)
  const revealedRef = useRef(false)

  // Reset when round changes
  useEffect(() => {
    revealedRef.current = false
    setLocalRevealed(false)
    setMyAnswer(null)
    setTimeLeft(TIMER_DURATION)
    clearInterval(timerRef.current)

    if (!round?.startAt || !round?.correct?.previewUrl) return

    // Play audio
    if (audioRef.current) {
      audioRef.current.volume = 1
      audioRef.current.src = round.correct.previewUrl
      audioRef.current.currentTime = Math.floor(Math.random() * 12)
      audioRef.current.play().catch(() => {})
    }

    // Sync timer to startAt
    const tick = () => {
      const elapsed = (Date.now() - round.startAt) / 1000
      const rem = Math.max(0, TIMER_DURATION - elapsed)
      setTimeLeft(rem)
      if (rem <= 0 && !revealedRef.current) doReveal()
    }
    timerRef.current = setInterval(tick, 80)
    tick()

    return () => {
      clearInterval(timerRef.current)
      if (audioRef.current) audioRef.current.pause()
    }
  }, [ri, round?.startAt])

  // Watch all answers — reveal when everyone answered
  useEffect(() => {
    if (!round || revealedRef.current) return
    const roundAnswers = answers?.[ri] ?? {}
    const playerCount = Object.keys(players || {}).length
    if (playerCount > 0 && Object.keys(roundAnswers).length >= playerCount) {
      clearInterval(timerRef.current)
      doReveal()
    }
  }, [answers, ri])

  function doReveal() {
    if (revealedRef.current) return
    revealedRef.current = true
    setLocalRevealed(true)
    if (audioRef.current) {
      const fade = setInterval(() => {
        if (!audioRef.current) return clearInterval(fade)
        if (audioRef.current.volume > 0.08) audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.08)
        else { audioRef.current.pause(); clearInterval(fade) }
      }, 80)
    }
    const myAns = answers?.[ri]?.[uid]
    if (myAns?.trackId === round?.correct?.trackId && confettiRef.current) {
      launchConfetti(confettiRef.current)
    }
  }

  async function handleAnswer(trackId) {
    if (myAnswer || localRevealed) return
    setMyAnswer(trackId)
    await submitAnswer(db, roomCode, ri, uid, trackId)
  }

  if (!round) {
    return (
      <div className="screen loading-screen">
        <div className="loading-box"><div className="spinner" /><p className="loading-msg">Loading round...</p></div>
      </div>
    )
  }

  const artUrl = round.correct.artworkUrl100?.replace('100x100bb', '300x300bb')
  const roundAnswers = answers?.[ri] ?? {}
  const playerList = Object.entries(players || {})
  const isCorrect = localRevealed && myAnswer === round.correct.trackId
  const isWrong = localRevealed && myAnswer && myAnswer !== round.correct.trackId
  const isLast = ri >= totalRounds - 1

  return (
    <div className="screen game-screen" style={artUrl ? { '--art-url': `url(${artUrl})` } : {}}>
      <audio ref={audioRef} />
      <canvas ref={confettiRef} className="overlay-canvas" />
      {artUrl && <div className="art-bg" />}

      <div className="game-inner">
        {/* Cancel confirm overlay */}
        {confirmCancel && (
          <div className="cancel-confirm">
            <p>End game for everyone?</p>
            <div className="cancel-btns">
              <button className="btn-secondary" onClick={() => setConfirmCancel(false)}>Keep Playing</button>
              <button className="btn-danger" onClick={onCancel}>End Game</button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="game-header">
          <div className="round-pill">Round {ri + 1} / {totalRounds}</div>
          <TimerBar timeLeft={timeLeft} />
          {isHost && <button className="cancel-game-btn" onClick={() => setConfirmCancel(true)}>✕ End</button>}
          <div className="song-status">
            {localRevealed ? (
              <div className="song-reveal">
                {artUrl && <img src={artUrl} className="reveal-art" alt="" />}
                <div>
                  <div className="reveal-track">{round.correct.trackName}</div>
                  <div className="reveal-artist">{round.correct.artistName}</div>
                </div>
              </div>
            ) : (
              <Equalizer />
            )}
          </div>
        </div>

        {/* Who's answered indicator */}
        <div className="answered-row">
          {playerList.map(([puid, p]) => (
            <div key={puid} className={`answered-dot ${roundAnswers[puid] ? 'done' : ''}`} title={p.name}>
              {p.avatar}
            </div>
          ))}
        </div>

        {/* Answer options */}
        <div className="options-grid online-options">
          {round.options.map((opt, i) => {
            let cls = 'option-btn'
            if (localRevealed) {
              if (opt.trackId === round.correct.trackId) cls += ' opt-correct'
              else if (myAnswer === opt.trackId) cls += ' opt-wrong'
              else cls += ' opt-dimmed'
            } else if (myAnswer === opt.trackId) {
              cls += ' opt-selected'
            }
            return (
              <button key={opt.trackId} className={cls} style={{ '--ac': ANSWER_COLORS[i] }}
                onClick={() => handleAnswer(opt.trackId)}
                disabled={!!myAnswer || localRevealed}>
                <span className="opt-label">{ANSWER_LABELS[i]}</span>
                <div className="opt-text">
                  <div className="opt-track">{opt.trackName}</div>
                  <div className="opt-artist">{opt.artistName}</div>
                </div>
                {localRevealed && opt.trackId === round.correct.trackId && <span className="opt-check">✓</span>}
              </button>
            )
          })}
        </div>

        {/* My result */}
        {localRevealed && (
          <div className={`solo-result ${isCorrect ? 'res-correct' : isWrong ? 'res-wrong' : 'res-slow'}`}>
            {isCorrect ? '🎉 Correct!' : isWrong ? '😢 Wrong answer!' : '⏱ Too slow!'}
          </div>
        )}

        {/* Host: next round button */}
        {localRevealed && isHost && (
          <button className="btn-primary btn-next" onClick={() => onAdvance(ri + 1, totalRounds)}>
            {isLast ? '🏆 See Final Results!' : 'Next Round →'}
          </button>
        )}

        {/* Guest: waiting message */}
        {localRevealed && !isHost && (
          <p className="waiting-next">Waiting for host to continue...</p>
        )}
      </div>
    </div>
  )
}

// ─── ONLINE FINAL SCREEN ──────────────────────────────────────────────────────

function OnlineFinalScreen({ players, rounds, answers, totalRounds, onHome }) {
  const canvasRef = useRef(null)
  const scores = calcScores(players, rounds, answers, totalRounds)
  const sorted = Object.entries(players)
    .map(([uid, p]) => ({ uid, ...p, score: scores[uid] ?? 0 }))
    .sort((a, b) => b.score - a.score)
  const medals = ['🥇','🥈','🥉']

  useEffect(() => {
    if (canvasRef.current) return launchFireworks(canvasRef.current, 6000)
  }, [])

  return (
    <div className="screen final-screen">
      <canvas ref={canvasRef} className="fireworks-bg" />
      <div className="final-inner">
        <h1 className="final-title">🏆 Game Over! 🏆</h1>

        <div className="winner-box">
          <div className="winner-crown">👑</div>
          <div className="winner-avatar">{sorted[0]?.avatar}</div>
          <div className="winner-name">{sorted[0]?.name}</div>
          <div className="winner-score">{sorted[0]?.score?.toLocaleString()} pts</div>
          <div className="winner-glow" />
        </div>

        {sorted.length >= 2 && (
          <div className="podium-wrap">
            {[1, 0, 2].map(rank => {
              const p = sorted[rank]
              if (!p) return <div key={rank} className="podium-slot empty" />
              const heights = [140, 200, 100]
              return (
                <div key={rank} className="podium-slot">
                  <div className="podium-top">
                    <span className="podium-medal">{medals[rank]}</span>
                    <span className="podium-avatar">{p.avatar}</span>
                    <span className="podium-pname">{p.name}</span>
                    <span className="podium-pscore">{p.score?.toLocaleString()}</span>
                  </div>
                  <div className="podium-block" style={{ height: heights[rank] }}>{rank + 1}</div>
                </div>
              )
            })}
          </div>
        )}

        <div className="leaderboard">
          {sorted.map((p, i) => (
            <div key={p.uid} className={`lb-row ${i === 0 ? 'lb-first' : ''}`}>
              <span className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <span className="lb-av">{p.avatar}</span>
              <span className="lb-name">{p.name}</span>
              <span className="lb-pts">{p.score?.toLocaleString()} pts</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={onHome}>🏠 Back to Home</button>
      </div>
    </div>
  )
}

// ─── SOLO SCREENS (unchanged) ─────────────────────────────────────────────────

function PlayerSetupScreen({ players, onAdd, onRemove, onNext, onBack }) {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [showPicker, setShowPicker] = useState(false)
  const inputRef = useRef(null)

  function handleAdd() {
    const n = name.trim()
    if (!n || players.length >= 6) return
    onAdd({ name: n, avatar, score: 0, streak: 0 })
    setName('')
    setAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)])
    setShowPicker(false)
    inputRef.current?.focus()
  }

  return (
    <div className="screen setup-screen">
      <ParticlesBg />
      <div className="screen-card">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2 className="screen-title">Who's Playing?</h2>
        <p className="screen-sub">Add 1–6 players</p>
        <div className="players-list">
          {players.map((p, i) => (
            <div key={i} className="player-chip">
              <span className="chip-avatar">{p.avatar}</span>
              <span className="chip-name">{p.name}</span>
              <button className="chip-remove" onClick={() => onRemove(i)}>✕</button>
            </div>
          ))}
          {players.length === 0 && <p className="empty-hint">No players yet — add one below!</p>}
        </div>
        {players.length < 6 && (
          <div className="add-row">
            <button className="avatar-btn" onClick={() => setShowPicker(v => !v)}>
              {avatar} <span className="caret">▾</span>
            </button>
            <input ref={inputRef} className="name-input" placeholder="Nickname..." value={name}
              maxLength={14} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            <button className="btn-add" onClick={handleAdd} disabled={!name.trim()}>Add</button>
          </div>
        )}
        {showPicker && (
          <div className="avatar-picker">
            {AVATARS.map(a => (
              <button key={a} className={`avatar-opt ${avatar === a ? 'sel' : ''}`}
                onClick={() => { setAvatar(a); setShowPicker(false) }}>{a}</button>
            ))}
          </div>
        )}
        <button className="btn-primary" onClick={onNext} disabled={players.length === 0}>Choose Pack →</button>
      </div>
    </div>
  )
}

function PackSelectScreen({ pack, rounds, onPackSelect, onRoundsChange, onStart, onBack }) {
  return (
    <div className="screen pack-screen">
      <ParticlesBg />
      <div className="screen-card pack-card-wrap">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h2 className="screen-title">Choose Your Pack</h2>

        <PackPicker pack={pack} onChange={onPackSelect} />

        <div className="rounds-row">
          <span className="rounds-label">Rounds:</span>
          {ROUND_COUNTS.map(r => (
            <button key={r} className={`rounds-btn ${rounds === r ? 'active' : ''}`}
              onClick={() => onRoundsChange(r)}>{r}</button>
          ))}
        </div>
        <button className="btn-primary" onClick={onStart} disabled={!pack?.term}>Start Game! 🎵</button>
      </div>
    </div>
  )
}

function LoadingScreen({ message, error, onBack }) {
  return (
    <div className="screen loading-screen">
      <div className="loading-box">
        <div className="loading-note">{error ? '😢' : '🎵'}</div>
        {!error && <div className="spinner" />}
        <p className="loading-msg">{message}</p>
        {error && <button className="btn-secondary" onClick={onBack}>← Go Back</button>}
      </div>
    </div>
  )
}

function SoloGameScreen({ players, setPlayers, rounds, currentRound, onRoundEnd, onCancel }) {
  const round = rounds[currentRound]
  const { correct, options } = round
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [revealed, setRevealed] = useState(false)
  const [roundScore, setRoundScore] = useState({})
  const [confirmCancel, setConfirmCancel] = useState(false)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const timeLeftRef = useRef(TIMER_DURATION)
  const answersRef = useRef({})
  const revealedRef = useRef(false)
  const confettiRef = useRef(null)

  useEffect(() => {
    answersRef.current = {}; revealedRef.current = false; timeLeftRef.current = TIMER_DURATION
    setAnswers({}); setTimeLeft(TIMER_DURATION); setRevealed(false); setRoundScore({})
    if (audioRef.current) {
      audioRef.current.volume = 1; audioRef.current.src = correct.previewUrl
      audioRef.current.currentTime = round.startAt ?? Math.floor(Math.random() * 12)
      audioRef.current.play().catch(() => {})
    }
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, TIMER_DURATION - (Date.now() - start) / 1000)
      timeLeftRef.current = rem; setTimeLeft(rem)
      if (rem <= 0) { clearInterval(timerRef.current); doReveal() }
    }, 80)
    return () => { clearInterval(timerRef.current); if (audioRef.current) audioRef.current.pause() }
  }, [currentRound])

  useEffect(() => {
    if (players.length > 0 && Object.keys(answersRef.current).length === players.length && !revealedRef.current) {
      clearInterval(timerRef.current); doReveal()
    }
  }, [answers])

  function doReveal() {
    if (revealedRef.current) return
    revealedRef.current = true; setRevealed(true)
    const audio = audioRef.current
    if (audio) {
      const fade = setInterval(() => {
        if (audio.volume > 0.08) audio.volume = Math.max(0, audio.volume - 0.08)
        else { audio.pause(); clearInterval(fade) }
      }, 80)
    }
    const tl = timeLeftRef.current; const ans = answersRef.current; const scores = {}
    const updated = players.map((p, i) => {
      const ok = ans[i] === correct.trackId
      const pts = ok ? Math.round(500 + 500 * (tl / TIMER_DURATION)) : 0
      const streak = ok ? p.streak + 1 : 0
      const bonus = ok && streak >= 3 ? Math.round(pts * 0.25) : 0
      scores[i] = pts + bonus
      return { ...p, score: p.score + pts + bonus, streak }
    })
    setRoundScore(scores); setPlayers(updated)
    const anyCorrect = players.some((_, i) => ans[i] === correct.trackId)
    if (anyCorrect && confettiRef.current) launchConfetti(confettiRef.current)
  }

  function handleAnswer(playerIdx, trackId) {
    if (answersRef.current[playerIdx] !== undefined || revealedRef.current) return
    const next = { ...answersRef.current, [playerIdx]: trackId }
    answersRef.current = next; setAnswers(next)
  }

  const artUrl = correct.artworkUrl100?.replace('100x100bb', '300x300bb')
  const isLast = currentRound >= rounds.length - 1

  return (
    <div className="screen game-screen" style={artUrl ? { '--art-url': `url(${artUrl})` } : {}}>
      <audio ref={audioRef} />
      <canvas ref={confettiRef} className="overlay-canvas" />
      {artUrl && <div className="art-bg" />}
      <div className="game-inner">
        {confirmCancel && (
          <div className="cancel-confirm">
            <p>Quit the game?</p>
            <div className="cancel-btns">
              <button className="btn-secondary" onClick={() => setConfirmCancel(false)}>Keep Playing</button>
              <button className="btn-danger" onClick={onCancel}>Quit</button>
            </div>
          </div>
        )}
        <div className="game-header">
          <div className="round-pill">Round {currentRound + 1} / {rounds.length}</div>
          <TimerBar timeLeft={timeLeft} />
          <button className="cancel-game-btn" onClick={() => setConfirmCancel(true)}>✕ Quit</button>
          <div className="song-status">
            {revealed ? (
              <div className="song-reveal">
                {artUrl && <img src={artUrl} className="reveal-art" alt="" />}
                <div><div className="reveal-track">{correct.trackName}</div><div className="reveal-artist">{correct.artistName}</div></div>
              </div>
            ) : <Equalizer />}
          </div>
        </div>
        <div className="options-grid">
          {options.map((opt, i) => {
            let cls = 'option-btn'
            if (revealed) {
              if (opt.trackId === correct.trackId) cls += ' opt-correct'
              else cls += ' opt-wrong'
            } else if (players.length === 1 && answers[0] === opt.trackId) cls += ' opt-selected'
            return (
              <button key={opt.trackId} className={cls} style={{ '--ac': ANSWER_COLORS[i] }}
                onClick={() => players.length === 1 && handleAnswer(0, opt.trackId)}
                disabled={revealed || (players.length === 1 && answers[0] !== undefined)}>
                <span className="opt-label">{ANSWER_LABELS[i]}</span>
                <div className="opt-text">
                  <div className="opt-track">{opt.trackName}</div>
                  <div className="opt-artist">{opt.artistName}</div>
                </div>
                {revealed && opt.trackId === correct.trackId && <span className="opt-check">✓</span>}
              </button>
            )
          })}
        </div>
        {players.length > 1 && (
          <div className="mp-area">
            {players.map((p, pi) => {
              const chosen = answers[pi]
              const ok = revealed && chosen === correct.trackId
              const wrong = revealed && chosen && chosen !== correct.trackId
              return (
                <div key={pi} className={`mp-player ${ok ? 'mp-correct' : ''} ${wrong ? 'mp-wrong' : ''}`}>
                  <div className="mp-info">
                    <span className="mp-avatar">{p.avatar}</span>
                    <div><div className="mp-name">{p.name}</div><div className="mp-score">{p.score.toLocaleString()} pts</div></div>
                    {p.streak >= 3 && !revealed && <span className="streak-fire">🔥{p.streak}</span>}
                    {revealed && roundScore[pi] > 0 && <span className="pts-gained">+{roundScore[pi].toLocaleString()}</span>}
                  </div>
                  {!revealed ? (
                    <div className="mp-btns">
                      {options.map((opt, oi) => (
                        <button key={opt.trackId} className={`mp-btn ${chosen === opt.trackId ? 'mp-btn-chosen' : ''}`}
                          style={{ '--ac': ANSWER_COLORS[oi] }} onClick={() => handleAnswer(pi, opt.trackId)}
                          disabled={chosen !== undefined}>{ANSWER_LABELS[oi]}</button>
                      ))}
                    </div>
                  ) : (
                    <div className={`mp-result ${ok ? 'res-correct' : 'res-wrong'}`}>
                      {ok ? '🎉 Correct!' : chosen ? '✗ Wrong' : '⏱ Too slow!'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {players.length === 1 && revealed && (
          <div className={`solo-result ${answers[0] === correct.trackId ? 'res-correct' : 'res-wrong'}`}>
            {answers[0] === correct.trackId ? `🎉 Correct! +${roundScore[0]?.toLocaleString() ?? 0} pts` : answers[0] ? '😢 Wrong answer!' : '⏱ Too slow!'}
          </div>
        )}
        {revealed && (
          <button className="btn-primary btn-next" onClick={() => onRoundEnd(isLast)}>
            {isLast ? '🏆 See Final Results!' : 'Next Round →'}
          </button>
        )}
      </div>
    </div>
  )
}

function SoloFinalScreen({ players, onPlayAgain, onHome }) {
  const canvasRef = useRef(null)
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const medals = ['🥇','🥈','🥉']
  const awards = []
  if (players.length > 1) {
    const top = players.reduce((a, b) => a.streak >= b.streak ? a : b)
    if (top.streak >= 3) awards.push({ label: '🔥 Hot Streak', player: top.name })
    const last = sorted[sorted.length - 1]
    if (last.score === 0) awards.push({ label: '😂 Wooden Spoon', player: last.name })
  }
  useEffect(() => { if (canvasRef.current) return launchFireworks(canvasRef.current, 6000) }, [])
  return (
    <div className="screen final-screen">
      <canvas ref={canvasRef} className="fireworks-bg" />
      <div className="final-inner">
        <h1 className="final-title">🏆 Game Over! 🏆</h1>
        <div className="winner-box">
          <div className="winner-crown">👑</div>
          <div className="winner-avatar">{sorted[0].avatar}</div>
          <div className="winner-name">{sorted[0].name}</div>
          <div className="winner-score">{sorted[0].score.toLocaleString()} pts</div>
          <div className="winner-glow" />
        </div>
        {sorted.length >= 2 && (
          <div className="podium-wrap">
            {[1, 0, 2].map(rank => {
              const p = sorted[rank]; if (!p) return <div key={rank} className="podium-slot empty" />
              const heights = [140, 200, 100]
              return (
                <div key={rank} className="podium-slot">
                  <div className="podium-top">
                    <span className="podium-medal">{medals[rank]}</span>
                    <span className="podium-avatar">{p.avatar}</span>
                    <span className="podium-pname">{p.name}</span>
                    <span className="podium-pscore">{p.score.toLocaleString()}</span>
                  </div>
                  <div className="podium-block" style={{ height: heights[rank] }}>{rank + 1}</div>
                </div>
              )
            })}
          </div>
        )}
        <div className="leaderboard">
          {sorted.map((p, i) => (
            <div key={i} className={`lb-row ${i === 0 ? 'lb-first' : ''}`}>
              <span className="lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}</span>
              <span className="lb-av">{p.avatar}</span><span className="lb-name">{p.name}</span>
              <span className="lb-pts">{p.score.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
        {awards.length > 0 && (
          <div className="awards-row">
            {awards.map((a, i) => (
              <div key={i} className="award-chip"><span>{a.label}</span><span className="award-name">{a.player}</span></div>
            ))}
          </div>
        )}
        <div className="final-btns">
          <button className="btn-secondary" onClick={onPlayAgain}>Play Again 🔄</button>
          <button className="btn-primary" onClick={onHome}>Home 🏠</button>
        </div>
      </div>
    </div>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────

function App() {
  const [screen, setScreen] = useState('welcome')
  const [theme, setTheme] = useState(THEMES[0])

  // Firebase auth
  const [uid, setUid] = useState(null)
  const [signingIn, setSigningIn] = useState(true)

  // Online state
  const [roomCode, setRoomCode] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [roomData, setRoomData] = useState(null)
  const [onlinePlayers, setOnlinePlayers] = useState({})
  const [onlineRounds, setOnlineRounds] = useState({})
  const [onlineAnswers, setOnlineAnswers] = useState({})
  const [joinError, setJoinError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState('')
  const [pendingIdentity, setPendingIdentity] = useState(null) // { type: 'create'|'join', code? }

  // Solo state
  const [soloPlayers, setSoloPlayers] = useState([])
  const [soloPack, setSoloPack] = useState(SONG_PACKS[0])
  const [soloRounds, setSoloRounds] = useState(10)
  const [builtRounds, setBuiltRounds] = useState([])
  const [currentRound, setCurrentRound] = useState(0)
  const [loadMsg, setLoadMsg] = useState('')
  const [loadError, setLoadError] = useState(false)

  // Firebase listeners
  const listenersRef = useRef([])

  // Apply theme
  useEffect(() => {
    const r = document.documentElement
    r.style.setProperty('--primary', theme.primary)
    r.style.setProperty('--bg', theme.bg)
    r.style.setProperty('--surface', theme.surface)
    r.style.setProperty('--card', theme.card)
    r.style.setProperty('--text', theme.text)
    r.style.setProperty('--accent', theme.accent)
    r.style.setProperty('--primary-rgb', hexToRgb(theme.primary))
    r.style.setProperty('--accent-rgb', hexToRgb(theme.accent))
  }, [theme])

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `${r},${g},${b}`
  }

  // Sign in anonymously on mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (user) { setUid(user.uid); setSigningIn(false) }
      else {
        signInAnonymously(auth)
          .then(cred => { setUid(cred.user.uid); setSigningIn(false) })
          .catch(() => setSigningIn(false))
      }
    })
    return unsub
  }, [])

  // Setup Firebase listeners when in a room
  function attachListeners(code) {
    const roomRef = ref(db, `rooms/${code}`)
    const playersRef = ref(db, `rooms/${code}/players`)
    const roundsRef = ref(db, `rooms/${code}/rounds`)
    const answersRef2 = ref(db, `rooms/${code}/answers`)

    const h1 = onValue(roomRef, snap => {
      const val = snap.val()
      if (!val) { handleRoomGone(); return }
      setRoomData(val)
      if (val.status === 'finished') setScreen('onlineFinal')
      else if (val.status === 'playing' || val.status === 'lobby') {
        if (val.status === 'playing') setScreen('onlineGame')
      }
    })
    const h2 = onValue(playersRef, snap => setOnlinePlayers(snap.val() ?? {}))
    const h3 = onValue(roundsRef, snap => setOnlineRounds(snap.val() ?? {}))
    const h4 = onValue(answersRef2, snap => setOnlineAnswers(snap.val() ?? {}))

    listenersRef.current = [
      () => off(roomRef, 'value', h1),
      () => off(playersRef, 'value', h2),
      () => off(roundsRef, 'value', h3),
      () => off(answersRef2, 'value', h4),
    ]
  }

  function detachListeners() {
    listenersRef.current.forEach(fn => fn())
    listenersRef.current = []
  }

  function handleRoomGone() {
    detachListeners()
    setScreen('welcome')
    setRoomCode('')
    setRoomData(null)
  }

  async function handleLeaveRoom() {
    if (roomCode && uid) {
      await leaveRoom(db, roomCode, uid, isHost).catch(() => {})
    }
    detachListeners()
    setRoomCode(''); setRoomData(null); setIsHost(false)
    setOnlinePlayers({}); setOnlineRounds({}); setOnlineAnswers({})
    setScreen('welcome')
  }

  // ── Create flow ──
  async function handleCreateRoom(pack, rounds) {
    setCreateLoading(true); setCreateError('')
    try {
      const code = await createRoom(db, uid, pack, rounds)
      setRoomCode(code); setIsHost(true)
      setPendingIdentity({ type: 'create', pack, rounds, code })
      setScreen('identityCreate')
    } catch (e) {
      setCreateError(e.message)
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleIdentityCreate(name, avatar) {
    const { code } = pendingIdentity
    await joinRoom(db, code, uid, name, avatar, true)
    attachListeners(code)
    setScreen('lobby')
  }

  // ── Join flow ──
  async function handleJoinCode(code) {
    setJoinError('')
    try {
      const snap = await get(ref(db, `rooms/${code}`))
      if (!snap.exists()) { setJoinError('Room not found. Check the code.'); return }
      if (snap.val().status !== 'lobby') { setJoinError('That game has already started.'); return }
      setRoomCode(code); setIsHost(false)
      setPendingIdentity({ type: 'join', code })
      setScreen('identityJoin')
    } catch (e) {
      setJoinError(e.message)
    }
  }

  async function handleIdentityJoin(name, avatar) {
    const { code } = pendingIdentity
    try {
      await joinRoom(db, code, uid, name, avatar, false)
      attachListeners(code)
      setScreen('lobby')
    } catch (e) {
      setJoinError(e.message)
      setScreen('joinRoom')
    }
  }

  // ── Start game (host) ──
  async function handleStartGame() {
    setStartLoading(true); setStartError('')
    try {
      const pack = roomData?.pack
      const knownPack = SONG_PACKS.find(p => p.id === pack?.id)
      const term = knownPack?.term ?? pack?.term ?? 'top hits'
      const artistOnly = pack?.artistOnly ?? false
      const tracks = await fetchSongs(term, artistOnly)
      if (tracks.length < 8) throw new Error('Not enough songs found')
      const rounds = buildRoundData(tracks, roomData?.totalRounds ?? 10)
      await startGame(db, roomCode, rounds)
    } catch (e) {
      setStartError(e.message)
    } finally {
      setStartLoading(false)
    }
  }

  // ── Advance round (host) ──
  async function handleAdvance(nextRound, totalRounds) {
    await advanceRound(db, roomCode, nextRound, totalRounds)
  }

  // ── Solo game ──
  async function startSoloGame() {
    setLoadError(false); setLoadMsg('🎵 Fetching songs from iTunes...')
    setScreen('soloLoading')
    try {
      const tracks = await fetchSongs(soloPack.term, soloPack.artistOnly ?? false)
      if (tracks.length < 8) throw new Error('Not enough songs with previews')
      const built = buildRoundData(tracks, Math.min(soloRounds, tracks.length - 3))
      setBuiltRounds(built); setCurrentRound(0)
      setSoloPlayers(prev => prev.map(p => ({ ...p, score: 0, streak: 0 })))
      setScreen('soloGame')
    } catch (e) {
      setLoadMsg(`Could not load songs. Check your connection.\n(${e.message})`)
      setLoadError(true)
    }
  }

  function handleSoloRoundEnd(isLast) {
    if (isLast) setScreen('soloFinal')
    else setCurrentRound(r => r + 1)
  }

  return (
    <div className="app" data-theme={theme.id}>

      {screen === 'welcome' && (
        <WelcomeScreen theme={theme} onThemeChange={setTheme} signingIn={signingIn}
          onCreate={() => setScreen('createRoom')}
          onJoin={() => setScreen('joinRoom')}
          onSolo={() => setScreen('soloSetup')} />
      )}

      {screen === 'createRoom' && (
        <CreateRoomScreen loading={createLoading} error={createError}
          onBack={() => setScreen('welcome')}
          onStart={handleCreateRoom} />
      )}

      {screen === 'identityCreate' && (
        <IdentityPicker title="What's your name?" sub="You'll be the host"
          onBack={() => setScreen('createRoom')}
          onDone={handleIdentityCreate} />
      )}

      {screen === 'joinRoom' && (
        <JoinRoomScreen loading={false} error={joinError}
          onBack={() => setScreen('welcome')}
          onJoin={handleJoinCode} />
      )}

      {screen === 'identityJoin' && (
        <IdentityPicker title="What's your name?" sub="Pick your nickname & avatar"
          onBack={() => setScreen('joinRoom')}
          onDone={handleIdentityJoin} />
      )}

      {screen === 'lobby' && (
        <LobbyScreen roomCode={roomCode} players={onlinePlayers} isHost={isHost}
          pack={roomData?.pack} totalRounds={roomData?.totalRounds}
          onStart={handleStartGame} onLeave={handleLeaveRoom}
          starting={startLoading} startError={startError} />
      )}

      {screen === 'onlineGame' && roomData && (
        <OnlineGameScreen uid={uid} isHost={isHost} roomCode={roomCode}
          roomData={roomData} players={onlinePlayers}
          rounds={onlineRounds} answers={onlineAnswers}
          onAdvance={handleAdvance} onCancel={handleLeaveRoom} />
      )}

      {screen === 'onlineFinal' && (
        <OnlineFinalScreen players={onlinePlayers} rounds={onlineRounds}
          answers={onlineAnswers} totalRounds={roomData?.totalRounds ?? 10}
          onHome={handleLeaveRoom} />
      )}

      {screen === 'soloSetup' && (
        <PlayerSetupScreen players={soloPlayers}
          onAdd={p => setSoloPlayers(prev => [...prev, p])}
          onRemove={i => setSoloPlayers(prev => prev.filter((_, idx) => idx !== i))}
          onNext={() => setScreen('soloPack')}
          onBack={() => setScreen('welcome')} />
      )}

      {screen === 'soloPack' && (
        <PackSelectScreen pack={soloPack} rounds={soloRounds}
          onPackSelect={setSoloPack} onRoundsChange={setSoloRounds}
          onStart={startSoloGame} onBack={() => setScreen('soloSetup')} />
      )}

      {screen === 'soloLoading' && (
        <LoadingScreen message={loadMsg} error={loadError} onBack={() => setScreen('soloPack')} />
      )}

      {screen === 'soloGame' && builtRounds.length > 0 && (
        <SoloGameScreen players={soloPlayers} setPlayers={setSoloPlayers}
          rounds={builtRounds} currentRound={currentRound}
          onRoundEnd={handleSoloRoundEnd}
          onCancel={() => { setSoloPlayers([]); setScreen('welcome') }} />
      )}

      {screen === 'soloFinal' && (
        <SoloFinalScreen players={soloPlayers}
          onPlayAgain={startSoloGame}
          onHome={() => { setSoloPlayers([]); setScreen('welcome') }} />
      )}

    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
