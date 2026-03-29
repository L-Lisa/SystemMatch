import { scoreKandidat } from '@/lib/matching/layer2'
import {
  dimitry, anastasia, husein,
  jobbMultimindIT, jobbEcceraIT,
  jobbRestaurang, jobbHemsstad,
  jobbJuniorIT, jobbSaljare,
} from './fixtures'

describe('Layer 2 — deterministic scoring (prioritization)', () => {
  describe('Good matches score higher than bad matches', () => {
    it('Dimitry → Multimind IT-support scores well', () => {
      const { score } = scoreKandidat(dimitry, jobbMultimindIT)
      expect(score).toBeGreaterThanOrEqual(15)
    })

    it('Dimitry → Eccera IT-support also scores well (L3 decides quality)', () => {
      const { score } = scoreKandidat(dimitry, jobbEcceraIT)
      expect(score).toBeGreaterThanOrEqual(15)
    })

    it('Anastasia → restaurangbiträde scores well', () => {
      const { score } = scoreKandidat(anastasia, jobbRestaurang)
      expect(score).toBeGreaterThanOrEqual(15)
    })

    it('Husein → junior IT/supporttekniker scores well', () => {
      const { score } = scoreKandidat(husein, jobbJuniorIT)
      expect(score).toBeGreaterThanOrEqual(15)
    })
  })

  describe('Bad matches score lower than good matches', () => {
    it('Anastasia scores higher for restaurang than hemstäd', () => {
      const good = scoreKandidat(anastasia, jobbRestaurang).score
      const bad = scoreKandidat(anastasia, jobbHemsstad).score
      expect(good).toBeGreaterThan(bad)
    })

    it('Husein scores higher for IT than säljare', () => {
      const good = scoreKandidat(husein, jobbJuniorIT).score
      const bad = scoreKandidat(husein, jobbSaljare).score
      expect(good).toBeGreaterThan(bad)
    })
  })

  describe('Bonus flags', () => {
    it('nystartsjobb adds 10 pts', () => {
      const base = scoreKandidat(anastasia, jobbRestaurang).score
      const withNystart = scoreKandidat({ ...anastasia, nystartsjobb: true }, jobbRestaurang).score
      expect(withNystart).toBe(base + 10)
    })

    it('introduktionsjobb adds 10 pts', () => {
      const base = scoreKandidat(anastasia, jobbRestaurang).score
      const withIntro = scoreKandidat({ ...anastasia, introduktionsjobb: true }, jobbRestaurang).score
      expect(withIntro).toBe(base + 10)
    })

    it('körkort match adds 15 pts when job wants it and candidate has it', () => {
      const jobWithKorkort = { ...jobbRestaurang, krav: 'körkort och restaurangerfarenhet' }
      const without = scoreKandidat({ ...anastasia, korkort: false }, jobWithKorkort).score
      const with_ = scoreKandidat({ ...anastasia, korkort: true }, jobWithKorkort).score
      expect(with_).toBe(without + 15)
    })

    it('stadsFlag adds "städ" token, helping match städ jobs', () => {
      const withoutFlag = scoreKandidat({ ...anastasia, stadsFlag: false }, jobbHemsstad).score
      const withFlag = scoreKandidat({ ...anastasia, stadsFlag: true }, jobbHemsstad).score
      expect(withFlag).toBeGreaterThan(withoutFlag)
    })

    it('expired slutdatum deducts 30 pts', () => {
      const base = scoreKandidat(anastasia, jobbRestaurang).score
      const expired = scoreKandidat(
        { ...anastasia, slutdatum: '2020-01-01' },
        jobbRestaurang
      ).score
      expect(expired).toBe(base - 30)
    })
  })

  describe('score reasons are populated', () => {
    it('includes keyword match reason when overlap exists', () => {
      const { reasons } = scoreKandidat(anastasia, jobbRestaurang)
      expect(reasons.some((r) => r.includes('Nyckelordsmatch'))).toBe(true)
    })
  })
})
