import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import {
  getDatabase, ref, set, get, onValue, off,
  update, remove, push, serverTimestamp
} from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyCMREbZ7OjLQCDa3gjo6i3YjegiLi31Jys",
  authDomain: "beatdrop-275fb.firebaseapp.com",
  databaseURL: "https://beatdrop-275fb-default-rtdb.firebaseio.com",
  projectId: "beatdrop-275fb",
  storageBucket: "beatdrop-275fb.firebasestorage.app",
  messagingSenderId: "333540692643",
  appId: "1:333540692643:web:5c5f7e2b9859e6b562a516"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)

export {
  signInAnonymously, onAuthStateChanged,
  ref, set, get, onValue, off, update, remove, push, serverTimestamp
}

// ─── Room helpers ─────────────────────────────────────────────────────────────

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateCode() {
  return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
}

export async function createRoom(db, uid, pack, totalRounds, audioAll = false) {
  let code
  for (let i = 0; i < 10; i++) {
    code = generateCode()
    const snap = await get(ref(db, `rooms/${code}`))
    if (!snap.exists()) break
  }
  await set(ref(db, `rooms/${code}`), {
    hostUid: uid,
    status: 'lobby',
    pack: { id: pack.id, name: pack.name, emoji: pack.emoji, term: pack.term ?? '', artistOnly: pack.artistOnly ?? false, isSongsLike: pack.isSongsLike ?? false, songName: pack.songName ?? '' },
    totalRounds,
    currentRound: 0,
    audioAll,
    createdAt: Date.now(),
  })
  return code
}

export async function joinRoom(db, code, uid, name, avatar, isHost = false) {
  const snap = await get(ref(db, `rooms/${code}`))
  if (!snap.exists()) throw new Error('Room not found')
  const room = snap.val()
  if (room.status !== 'lobby') throw new Error('Game already in progress')
  await set(ref(db, `rooms/${code}/players/${uid}`), {
    name, avatar, isHost, joinedAt: Date.now()
  })
  return room
}

export async function startGame(db, code, rounds) {
  const roundsObj = {}
  rounds.forEach((r, i) => { roundsObj[i] = r })
  await update(ref(db, `rooms/${code}`), {
    status: 'playing',
    currentRound: 0,
    rounds: roundsObj,
  })
  await set(ref(db, `rooms/${code}/rounds/0/startAt`), Date.now())
}

export async function submitAnswer(db, code, roundIndex, uid, trackId) {
  await set(ref(db, `rooms/${code}/answers/${roundIndex}/${uid}`), {
    trackId,
    answeredAt: Date.now(),
  })
}

export async function advanceRound(db, code, nextRound, totalRounds) {
  if (nextRound >= totalRounds) {
    await update(ref(db, `rooms/${code}`), { status: 'finished' })
  } else {
    await update(ref(db, `rooms/${code}`), {
      currentRound: nextRound,
      status: 'playing',
    })
    await set(ref(db, `rooms/${code}/rounds/${nextRound}/startAt`), Date.now())
  }
}

export async function leaveRoom(db, code, uid, isHost) {
  if (isHost) {
    await remove(ref(db, `rooms/${code}`))
  } else {
    await remove(ref(db, `rooms/${code}/players/${uid}`))
  }
}

export function calcScores(players, rounds, answers, totalRounds) {
  const scores = {}
  Object.keys(players).forEach(uid => {
    let total = 0
    for (let i = 0; i < totalRounds; i++) {
      const round = rounds?.[i]
      const answer = answers?.[i]?.[uid]
      if (!round?.correct || !answer) continue
      if (answer.trackId === round.correct.trackId) {
        const elapsed = Math.max(0, (answer.answeredAt - round.startAt) / 1000)
        const ratio = Math.max(0, (10 - elapsed) / 10)
        total += Math.round(500 + 500 * ratio)
      }
    }
    scores[uid] = total
  })
  return scores
}
