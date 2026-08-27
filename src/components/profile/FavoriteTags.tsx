'use client'
import { useTranslations } from 'next-intl'
import { useMainAccount } from '@/hooks/useMainAccount'
import { sameTag } from '@/lib/ranking'
import { loadSettings, saveSettings } from '@/lib/storage'
import { addFavorite, removeFavorite, visibleFavorites } from '@/lib/profile'

/**
 * 즐겨찾기 태그. 이름·아이콘은 저장하지 않는다 —
 * 바뀌는 값이라 캐시하면 틀린 이름을 보여주게 된다.
 *
 * 저장은 saveSettings 가 'bc:settings' 를 쏘고 useMainAccount 가 그걸 듣는다.
 * 별도 상태 없이 다시 그려진다(추천 설문과 같은 방식).
 */
export function FavoriteTags({
  currentTag,
  onSelect,
}: {
  currentTag: string | null
  onSelect: (tag: string) => void
}) {
  const t = useTranslations('profile')
  const { mainAccountTag, settings } = useMainAccount()

  const all = settings.favoriteTags
  // 대표 계정은 바로 위에 따로 보이므로 목록에서 뺀다
  const shown = visibleFavorites(all, mainAccountTag)
  const isFavorite = Boolean(currentTag) && all.some(tag => sameTag(tag, currentTag))

  const save = (list: string[]) => saveSettings({ ...loadSettings(), favoriteTags: list })

  return (
    <section className="border-border-subtle bg-bg-surface rounded-card flex flex-col gap-2 border p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold">{t('favorites')}</h2>
        {currentTag && (
          <button
            type="button"
            onClick={() =>
              save(isFavorite ? removeFavorite(all, currentTag) : addFavorite(all, currentTag))
            }
            className="border-border-strong text-text-secondary rounded-card shrink-0 border px-2.5 py-1 text-[11px] font-semibold"
          >
            {isFavorite ? t('removeFavorite') : t('addFavorite')}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-text-tertiary text-[11px]">{t('noFavorites')}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {shown.map(tag => (
            <li
              key={tag}
              className="bg-bg-elevated rounded-chip flex items-center overflow-hidden text-[11px]"
            >
              <button
                type="button"
                onClick={() => onSelect(tag)}
                className="text-text-secondary py-1 pr-1 pl-2 font-semibold"
              >
                {tag}
              </button>
              <button
                type="button"
                aria-label={`${tag} ${t('removeFavorite')}`}
                onClick={() => save(removeFavorite(all, tag))}
                className="text-text-tertiary hover:text-danger px-2 py-1"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
