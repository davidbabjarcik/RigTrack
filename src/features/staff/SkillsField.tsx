import { Plus, X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

import { joinSkills, parseSkills, SKILL_SUGGESTIONS } from './skills'

type Props = { value: string; onChange: (value: string) => void; disabled?: boolean; label?: string }

/** Zručnosti ako štítky: napíšte a Enter (alebo vyberte z návrhov); krížik štítok odoberie. */
export function SkillsField({ value, onChange, disabled = false, label = 'Zručnosti' }: Props) {
  const id = useId()
  const [text, setText] = useState('')
  const skills = parseSkills(value)
  const add = (skill: string) => {
    const clean = skill.trim()
    if (!clean || skills.some((item) => item.toLowerCase() === clean.toLowerCase())) return setText('')
    const next = joinSkills([...skills, clean])
    if (next.length <= 500) onChange(next)
    setText('')
  }
  const remove = (skill: string) => onChange(joinSkills(skills.filter((item) => item !== skill)))
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add(text)
    } else if (event.key === 'Backspace' && !text && skills.length > 0) remove(skills[skills.length - 1])
  }
  const query = text.trim().toLowerCase()
  const suggestions = SKILL_SUGGESTIONS.filter((item) => !skills.includes(item) && (!query || item.toLowerCase().includes(query))).slice(0, query ? 8 : 12)

  return (
    <fieldset disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">{label}</legend>
      <div className={cn('flex flex-wrap items-center gap-1.5 rounded-lg border bg-surface p-2', disabled && 'opacity-60')}>
        {skills.map((skill) => (
          <span key={skill} className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            {skill}
            {!disabled && (
              <button type="button" aria-label={`Odobrať ${skill}`} onClick={() => remove(skill)} className="opacity-80 hover:opacity-100">
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            id={id}
            aria-label={`${label} – pridať`}
            className="h-8 min-w-40 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
            placeholder={skills.length ? 'pridať ďalšiu…' : 'napr. Avolites, Crown, práca vo výškach'}
            maxLength={60}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKey}
            onBlur={() => text.trim() && add(text)}
          />
        )}
      </div>
      {!disabled && suggestions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => add(item)}
              className="inline-flex items-center gap-0.5 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-3" aria-hidden />
              {item}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  )
}

/** Zručnosti ako štítky na čítanie (karta, zoznam). */
export function SkillChips({ value, className }: { value: string; className?: string }) {
  const skills = parseSkills(value)
  if (skills.length === 0) return null
  return (
    <ul className={cn('flex flex-wrap gap-1', className)}>
      {skills.map((skill) => (
        <li key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {skill}
        </li>
      ))}
    </ul>
  )
}
