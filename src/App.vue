<script setup lang="ts">
import { ref } from 'vue'
import LoginPage from './components/LoginPage.vue'
import PokerGame from './components/PokerGame.vue'
import type { AuthUser } from './types'
import { getSessionUser, logout } from './utils/auth'

const user = ref<AuthUser | null>(getSessionUser())

function onLoginSuccess(username: string) {
  user.value = { username }
}

function onLogout() {
  logout()
  user.value = null
}
</script>

<template>
  <LoginPage v-if="!user" @success="onLoginSuccess" />
  <PokerGame v-else :username="user.username" @logout="onLogout" />
</template>
