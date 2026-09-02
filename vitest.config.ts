import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    /**
     * 다른 세션이 `.worktrees/` 에 판 브랜치의 테스트까지 함께 돌아간다.
     * 남의 작업 중인 실패가 내 스위트에 섞이고 시간도 두 배가 된다
     * (실측: 269개 → 529개). 기본 exclude 에는 이 경로가 없다.
     */
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
