import { describe, expect, it } from 'vitest'
import { feedUrl, googleSubscribeUrl, webcalUrl } from './feedApi'

describe('calendar feed links', () => {
  const url = feedUrl('a'.repeat(64), 'https://project.supabase.co/')
  it('points to the calendar-feed function with an .ics ending', () => {
    expect(url).toBe(`https://project.supabase.co/functions/v1/calendar-feed/${'a'.repeat(64)}.ics`)
  })
  it('opens the subscription in a phone calendar and in Google Calendar', () => {
    expect(webcalUrl(url)).toBe(`webcal://project.supabase.co/functions/v1/calendar-feed/${'a'.repeat(64)}.ics`)
    expect(googleSubscribeUrl(url)).toBe(`https://www.google.com/calendar/render?cid=webcal://project.supabase.co/functions/v1/calendar-feed/${'a'.repeat(64)}.ics`)
  })
})
