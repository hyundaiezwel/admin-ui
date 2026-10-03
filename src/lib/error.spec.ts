import { describe, expect, it } from 'vitest'
import { ApiError, toFieldErrors, toMessage, toMessageWithCode } from './error'

describe('error', () => {
  const api = new ApiError('DUP_CODE', '이미 등록된 코드입니다', { code: '중복입니다' }, 409)

  it('toMessage는 문구만 꺼낸다 — 예외가 아닌 값도 문자열로', () => {
    expect(toMessage(api)).toBe('이미 등록된 코드입니다')
    expect(toMessage('끊김')).toBe('끊김')
  })

  it('toMessageWithCode는 ApiError에만 코드를 붙인다', () => {
    expect(toMessageWithCode(api)).toBe('DUP_CODE: 이미 등록된 코드입니다')
    expect(toMessageWithCode(new Error('일반'))).toBe('일반')
  })

  it('toFieldErrors는 검증 항목만, 없으면 빈 맵', () => {
    expect(toFieldErrors(api)).toEqual({ code: '중복입니다' })
    expect(toFieldErrors(new ApiError('X', 'x'))).toEqual({})
    expect(toFieldErrors(new Error('x'))).toEqual({})
  })
})
