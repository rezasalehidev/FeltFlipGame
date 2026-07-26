<script setup lang="ts">
import { ref } from 'vue'
import type { LoginCredentials } from '../types'
import { DEMO_CREDENTIALS, login } from '../utils/auth'

const emit = defineEmits<{
  success: [username: string]
}>()

const form = ref<LoginCredentials>({
  username: '',
  password: '',
})
const error = ref('')
const submitting = ref(false)

function onSubmit() {
  error.value = ''
  submitting.value = true
  const result = login(form.value)
  submitting.value = false

  if (!result.ok || !result.user) {
    error.value = result.message ?? 'Login failed.'
    return
  }

  emit('success', result.user.username)
}
</script>

<template>
  <div class="login-page">
    <form class="panel" @submit.prevent="onSubmit">
      <p class="brand">FeltFlip</p>
      <h1>Sign in to play</h1>
      <p class="hint">Enter your username and password to open the table.</p>

      <label class="field">
        <span>Username</span>
        <input
          v-model="form.username"
          type="text"
          name="username"
          autocomplete="username"
          placeholder="Reza"
          required
        />
      </label>

      <label class="field">
        <span>Password</span>
        <input
          v-model="form.password"
          type="password"
          name="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />
      </label>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <button class="btn" type="submit" :disabled="submitting">
        {{ submitting ? 'Signing in…' : 'Login' }}
      </button>

      <p class="demo">
        Demo account:
        <strong>{{ DEMO_CREDENTIALS.username }}</strong>
        /
        <strong>{{ DEMO_CREDENTIALS.password }}</strong>
      </p>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  width: min(420px, 100%);
  margin: 0 auto;
  display: grid;
  place-items: center;
  padding: 2rem 1.25rem;
  animation: rise 0.6s ease both;
}

.panel {
  width: 100%;
  padding: 2rem 1.5rem;
  border-radius: 20px;
  background: rgba(8, 28, 24, 0.72);
  border: 1px solid rgba(240, 193, 75, 0.22);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
}

.brand {
  margin: 0;
  font-family: 'Fraunces', Georgia, serif;
  font-size: 2.4rem;
  font-weight: 700;
  color: #f0c14b;
  letter-spacing: -0.03em;
  line-height: 1;
  text-align: center;
}

h1 {
  margin: 0.75rem 0 0;
  text-align: center;
  font-size: 1.15rem;
  font-weight: 600;
  color: #f7f2e4;
}

.hint {
  margin: 0.4rem 0 1.4rem;
  text-align: center;
  color: rgba(215, 235, 227, 0.7);
  font-size: 0.9rem;
}

.field {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
}

.field span {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(215, 235, 227, 0.65);
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(240, 193, 75, 0.22);
  background: rgba(4, 18, 14, 0.75);
  color: #f7f2e4;
  font: inherit;
  outline: none;
}

.field input:focus {
  border-color: rgba(240, 193, 75, 0.55);
}

.error {
  margin: 0 0 0.85rem;
  color: #ff8a80;
  font-size: 0.9rem;
}

.btn {
  width: 100%;
  appearance: none;
  border: 1px solid rgba(240, 193, 75, 0.45);
  background: linear-gradient(180deg, #f0c14b, #d4a017);
  color: #1a2a22;
  font-family: inherit;
  font-weight: 700;
  font-size: 1rem;
  padding: 0.85rem 1.25rem;
  border-radius: 999px;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.7;
  cursor: default;
}

.demo {
  margin: 1rem 0 0;
  text-align: center;
  font-size: 0.82rem;
  color: rgba(215, 235, 227, 0.65);
  word-break: break-all;
}

.demo strong {
  color: #f0c14b;
  font-weight: 600;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
