import Fee from '../Fee'

describe('Fee', () => {
	it('has a working constructor', () => {
		const f = new Fee()
		expect(f instanceof Fee).toBe(true)
	})

	describe('calculate', () => {
		it('calculates fee with percentage', () => {
			const f = new Fee({ percentage: 0.0025, minimum: 1 })
			expect(f.calculate(100000)).toBe(250)
		})

		it('returns minumum if percentage based fee is less than min', () => {
			const f = new Fee({ percentage: 0.0005, minimum: 100 })
			expect(f.calculate(100000)).toBe(100)
		})

		it('can use custom values', () => {
			const f = new Fee({ percentage: 0.0005, minimum: 100 })
			expect(f.calculate(100000, 0.33)).toBe(33000)
			expect(f.calculate(100000, 0, 1)).toBe(1)
		})
	})
})
