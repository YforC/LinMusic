<template>
  <div
    class="bg-white/5 p-4 rounded-lg hover:bg-white/10 transition-all duration-300 group cursor-pointer"
    @click="$emit('click', playlist)"
  >
    <div class="relative w-full aspect-square mb-4 rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden">
      <img
        v-if="playlist.coverUrl"
        :src="playlist.coverUrl"
        :alt="playlist.name"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div v-else class="w-full h-full bg-white/10 flex items-center justify-center skeleton">
        <span class="material-symbols-outlined text-white/30 text-6xl">music_note</span>
      </div>

      <!-- Play Button -->
      <div
        class="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20"
        @click.stop="$emit('play', playlist)"
      >
        <div class="btn-play w-12 h-12">
          <span class="material-symbols-outlined text-[28px] fill-1 ml-0.5">play_arrow</span>
        </div>
      </div>

      <!-- Add to Queue Button -->
      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        <button
          class="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 hover:scale-105 text-white transition-all duration-200"
          title="添加到播放列表"
          @click.stop="$emit('add', playlist)"
        >
          <span class="material-symbols-outlined text-[18px]">playlist_add</span>
        </button>
      </div>
    </div>

    <h3 class="text-white font-bold truncate mb-1 group-hover:text-white/90 transition-colors">{{ playlist.name }}</h3>
    <p class="text-white/50 text-sm line-clamp-2">{{ playlist.description }}</p>
  </div>
</template>

<script setup lang="ts">
interface PlaylistCardProps {
  playlist: {
    id: string | number
    name: string
    description?: string
    coverUrl?: string
  }
}

defineProps<PlaylistCardProps>()

defineEmits<{
  click: [playlist: PlaylistCardProps['playlist']]
  play: [playlist: PlaylistCardProps['playlist']]
  add: [playlist: PlaylistCardProps['playlist']]
}>()
</script>
