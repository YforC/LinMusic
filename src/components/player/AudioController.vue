<template>



  <!-- 閺?UI 閻ㄥ嫰鐓舵０鎴炲付閸掑墎绮嶆禒?-->



  <div class="hidden"></div>



</template>







<script setup lang="ts">



import { watch, onUnmounted, onMounted } from 'vue'



import { Howl, Howler } from 'howler'



import { usePlayerStore } from '@/stores/player'



import { getPlayUrl, getLyrics, getSongInfo, getCoverUrl } from '@/api/music'



import { parseLrc } from '@/utils/lrc-parser'



import { storeToRefs } from 'pinia'



import type { Song } from '@/api/types'







const playerStore = usePlayerStore()



const { currentSong, isPlaying, volume, playMode, audioQuality } = storeToRefs(playerStore)







let howl: Howl | null = null



let animationId: number | null = null



let lastPositionUpdate = 0



let audioNode: HTMLAudioElement | null = null



let endHandled = false







Howler.autoSuspend = false



Howler.autoUnlock = true







const updateMediaSessionMetadata = (song: Song) => {



  if (!('mediaSession' in navigator)) return



  const artworkSrc = getCoverUrl(song.id, song.platform)



  const artwork = artworkSrc



    ? [{ src: artworkSrc, sizes: '512x512', type: 'image/jpeg' }]



    : []



  navigator.mediaSession.metadata = new MediaMetadata({



    title: song.name,



    artist: song.artist,



    album: song.album || '',



    artwork



  })



}







const updateMediaSessionPosition = () => {



  if (!('mediaSession' in navigator)) return



  if (!howl || typeof navigator.mediaSession.setPositionState !== 'function') return



  const duration = howl.duration()



  const position = howl.seek() as number



  if (!Number.isFinite(duration) || duration === 0 || !Number.isFinite(position)) return



  navigator.mediaSession.setPositionState({



    duration,



    playbackRate: howl.rate(),



    position



  })



}







const handleNativeTimeUpdate = () => {



  if (!audioNode) return



  const position = audioNode.currentTime



  if (!Number.isFinite(position)) return



  playerStore.currentTime = position



  playerStore.updateLyricIndex()



  const now = Date.now()



  if (now - lastPositionUpdate > 1000) {



    updateMediaSessionPosition()



    lastPositionUpdate = now



  }



}







const handleNativeEnded = () => {



  handleTrackEnd()



}







const detachAudioNodeListeners = () => {



  if (!audioNode) return



  audioNode.removeEventListener('timeupdate', handleNativeTimeUpdate)



  audioNode.removeEventListener('ended', handleNativeEnded)



  if (audioNode.dataset.lmusicAttached === 'true' && audioNode.parentElement) {



    audioNode.parentElement.removeChild(audioNode)



  }



  audioNode = null



}







const bindAudioNodeListeners = () => {



  detachAudioNodeListeners()



  const node = (howl as any)?._sounds?.[0]?._node as HTMLAudioElement | undefined



  if (!node) return



  audioNode = node



  audioNode.preload = 'metadata'



  audioNode.setAttribute('playsinline', 'true')



  audioNode.setAttribute('webkit-playsinline', 'true')



  audioNode.setAttribute('x-webkit-airplay', 'allow')



  if (!audioNode.parentElement && document.body) {



    audioNode.dataset.lmusicAttached = 'true'



    audioNode.style.position = 'fixed'



    audioNode.style.left = '-9999px'



    audioNode.style.width = '1px'



    audioNode.style.height = '1px'



    audioNode.style.opacity = '0'



    audioNode.style.pointerEvents = 'none'



    document.body.appendChild(audioNode)



  }



  audioNode.addEventListener('timeupdate', handleNativeTimeUpdate)



  audioNode.addEventListener('ended', handleNativeEnded)



}







const resumeAudioContext = async () => {



  if (!Howler.ctx || Howler.ctx.state !== 'suspended') return



  try {



    await Howler.ctx.resume()



  } catch (error) {



    console.warn('Audio context resume failed:', error)



  }



}







const resumePlaybackFromGesture = () => {



  if (!currentSong.value || !playerStore.isPlaying) return



  void resumeAudioContext()



  if (!howl) {



    if (!playerStore.isLoading) {



      playSong()



    }



    return



  }



  if (!howl.playing()) {



    howl.play()



  }



}







const handleVisibilityChange = () => {



  if (document.visibilityState === 'visible') {



    resumePlaybackFromGesture()



  }



}







const getSeekBase = () => {



  if (howl) {



    const position = howl.seek() as number



    if (Number.isFinite(position)) return position



  }



  return playerStore.currentTime



}







const setMediaSessionHandler = (



  action: MediaSessionAction,



  handler: MediaSessionActionHandler | null



) => {



  try {



    navigator.mediaSession.setActionHandler(action, handler)



  } catch (error) {



    console.warn(`MediaSession action not supported: ${action}`, error)



  }



}







const registerMediaSessionHandlers = () => {



  if (!('mediaSession' in navigator)) return



  setMediaSessionHandler('play', () => {



    if (!playerStore.isPlaying) playerStore.togglePlay()



  })



  setMediaSessionHandler('pause', () => {



    if (playerStore.isPlaying) playerStore.togglePlay()



  })



  setMediaSessionHandler('previoustrack', () => {



    playerStore.playPrev()



  })



  setMediaSessionHandler('nexttrack', () => {



    playerStore.playNext()



  })



  setMediaSessionHandler('seekto', (details) => {



    if (typeof details.seekTime === 'number') {



      playerStore.seekTo(details.seekTime)



    }



  })



  setMediaSessionHandler('seekbackward', (details) => {



    const offset = details.seekOffset ?? 10



    playerStore.seekTo(getSeekBase() - offset)



  })



  setMediaSessionHandler('seekforward', (details) => {



    const offset = details.seekOffset ?? 10



    playerStore.seekTo(getSeekBase() + offset)



  })



  setMediaSessionHandler('stop', () => {



    if (playerStore.isPlaying) playerStore.togglePlay()



  })



}







// 鐠哄疇娴嗛崚鐗堝瘹鐎规碍妞傞梻?



function seek(time: number) {

  if (!howl) return

  const wasPlaying = playerStore.isPlaying

  howl.seek(time)

  updateMediaSessionPosition()

  if (wasPlaying) {

    void resumeAudioContext()

    if (!howl.playing()) {

      howl.play()

    }

  }

}





// 濞夈劌鍞?seek 婢跺嫮鎮婇崳?



onMounted(() => {



  playerStore.setSeekHandler(seek)



  document.addEventListener('touchend', resumePlaybackFromGesture, { passive: true })



  document.addEventListener('click', resumePlaybackFromGesture)



  document.addEventListener('visibilitychange', handleVisibilityChange)



  registerMediaSessionHandlers()



})







function handleTrackEnd() {



  if (endHandled) return



  endHandled = true



  const advanced = handleSongEnd()



  if (!advanced) {



    playerStore.isPlaying = false



  }



}







// 閹绢厽鏂佸灞炬锤



async function playSong() {
  if (!currentSong.value) return

  const song = currentSong.value
  endHandled = false
  detachAudioNodeListeners()
  registerMediaSessionHandlers()

  if (howl) {
    howl.stop()
    howl.unload()
    howl = null
  }

  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }

  playerStore.isLoading = true
  playerStore.currentTime = 0

  void resumeAudioContext()

  try {
    updateMediaSessionMetadata(song)
    void getSongInfo(song.id, song.platform)
      .then((info) => {
        if (!info) return
        if (!song.coverUrl) {
          song.coverUrl = info.pic || getCoverUrl(song.id, song.platform)
        }
        if (!song.album) {
          song.album = info.album
        }
        updateMediaSessionMetadata(song)
      })
      .catch((error) => {
        console.error('Get song info failed:', error)
      })

    const url = getPlayUrl(song.id, song.platform, audioQuality.value)

    howl = new Howl({
      src: [url],
      html5: true,
      format: ['mp3', 'flac', 'wav', 'ogg'],
      volume: volume.value,
      onload: () => {
        playerStore.duration = howl?.duration() || 0
        playerStore.isLoading = false
        updateMediaSessionPosition()
        bindAudioNodeListeners()
      },
      onplay: () => {
        bindAudioNodeListeners()
        playerStore.isPlaying = true
        updateProgress()
      },
      onpause: () => {
        playerStore.isPlaying = false
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      },
      onstop: () => {
        playerStore.isPlaying = false
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
      },
      onend: () => {
        if (animationId) {
          cancelAnimationFrame(animationId)
          animationId = null
        }
        handleTrackEnd()
      },
      onloaderror: (id, error) => {
        console.error('Load error:', id, error)
        playerStore.isLoading = false
      },
      onplayerror: (id, error) => {
        console.error('Play error:', id, error)
        howl?.once('unlock', () => {
          howl?.play()
        })
      }
    })

    howl.play()
    loadLyrics(song.id, song.platform)
  } catch (error) {
    console.error('Play failed:', error)
    playerStore.isLoading = false
  }
}

function updateProgress() {



  if (howl && playerStore.isPlaying) {



    playerStore.currentTime = howl.seek() as number



    playerStore.updateLyricIndex()



    const now = Date.now()



    if (now - lastPositionUpdate > 1000) {



      updateMediaSessionPosition()



      lastPositionUpdate = now



    }



    animationId = requestAnimationFrame(updateProgress)



  }



}







// 濮濆本娲哥紒鎾存将婢跺嫮鎮?



function handleSongEnd(): boolean {



  const mode = playMode.value



  const playlist = playerStore.playlist



  const currentIndex = playerStore.currentIndex







  if (!playlist.length) return false







  switch (mode) {



    case 'single':



      // 閸楁洘娲稿顏嗗箚



      if (howl) {



        endHandled = false



        howl.seek(0)



        howl.play()



        return true



      }



      return false



    case 'loop':



      // 閸掓銆冨顏嗗箚



      playerStore.playNext()



      return true



    case 'shuffle':



      // 闂呭繑婧�閹绢厽鏂?



      playerStore.playNext()



      return true



    default:



      // 妞ゅ搫绨幘顓熸杹



      if (currentIndex < playlist.length - 1) {



        playerStore.playNext()



        return true



      }



      return false



  }



}







// 閸旂姾娴囧宀冪槤



async function loadLyrics(id: string, platform: string) {



  try {



    const lrcText = await getLyrics(id, platform as any)



    const lyrics = parseLrc(lrcText)



    playerStore.setLyrics(lyrics)



  } catch (error) {



    console.error('Load lyrics failed:', error)



    playerStore.setLyrics([])



  }



}







// 閻╂垵鎯夐幘顓熸杹閻樿埖锟戒礁褰夐崠?



watch(isPlaying, (playing) => {



  if (!howl) return







  if (playing) {



    void resumeAudioContext()



    if (!howl.playing()) {



      howl.play()



    }



  } else {



    if (howl.playing()) {



      howl.pause()



    }



  }



  if ('mediaSession' in navigator) {



    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'



  }



}, { flush: 'sync' })







// 閻╂垵鎯夐棅鎶藉櫤閸欐ê瀵?



watch(volume, (newVolume) => {



  howl?.volume(newVolume)



})







// 閻╂垵鎯夎ぐ鎾冲濮濆本娲搁崣妯哄



watch(currentSong, (newSong, oldSong) => {



  if (newSong && (!oldSong || newSong.id !== oldSong.id || newSong.platform !== oldSong.platform)) {



    playSong()



  }



}, { flush: 'sync' })







// 濞撳懐鎮?



onUnmounted(() => {



  document.removeEventListener('touchend', resumePlaybackFromGesture)



  document.removeEventListener('click', resumePlaybackFromGesture)



  document.removeEventListener('visibilitychange', handleVisibilityChange)



  detachAudioNodeListeners()



  if (howl) {



    howl.unload()



    howl = null



  }



  if (animationId) {



    cancelAnimationFrame(animationId)



  }



})



</script>



