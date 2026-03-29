import { passesKeywordFilter } from '@/lib/matching/layer1'
import {
  dimitry, anastasia, husein,
  jobbKorkortKrav, jobbMultimindIT, jobbEcceraIT,
  jobbRestaurang, jobbHemsstad, jobbJuniorIT, jobbSaljare,
} from './fixtures'

describe('Layer 1 — keyword filter', () => {
  describe('Körkort hard block', () => {
    it('blocks a kandidat without körkort when krav requires B-körkort', () => {
      expect(passesKeywordFilter(dimitry, jobbKorkortKrav)).toBe(false)
    })

    it('passes a kandidat WITH körkort even when krav requires it', () => {
      expect(passesKeywordFilter(anastasia, jobbKorkortKrav)).toBe(true)
    })

    it('passes when körkort is only in meriter (nice-to-have), not in krav', () => {
      // Eccera has B-körkort in meriter, not krav
      const jobbWithKorkortInMeriter = { ...jobbEcceraIT, meriter: 'B-körkort', krav: 'Linux' }
      expect(passesKeywordFilter(dimitry, jobbWithKorkortInMeriter)).toBe(true)
    })
  })

  describe('Lisa real examples — should all pass L1', () => {
    it('Dimitry → Multimind IT-support passes L1', () => {
      expect(passesKeywordFilter(dimitry, jobbMultimindIT)).toBe(true)
    })

    it('Dimitry → Eccera IT/Linux passes L1 (semantic issue caught by L3)', () => {
      expect(passesKeywordFilter(dimitry, jobbEcceraIT)).toBe(true)
    })

    it('Anastasia → restaurangbiträde passes L1', () => {
      expect(passesKeywordFilter(anastasia, jobbRestaurang)).toBe(true)
    })

    it('Anastasia → hemstädare passes L1 (no-keyword caught by L2)', () => {
      expect(passesKeywordFilter(anastasia, jobbHemsstad)).toBe(true)
    })

    it('Husein → junior IT/supporttekniker passes L1', () => {
      expect(passesKeywordFilter(husein, jobbJuniorIT)).toBe(true)
    })

    it('Husein → Säljare passes L1 (mismatch caught by L2)', () => {
      expect(passesKeywordFilter(husein, jobbSaljare)).toBe(true)
    })
  })
})
