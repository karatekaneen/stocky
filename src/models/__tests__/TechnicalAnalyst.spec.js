import TechnicalAnalyst from '../TechnicalAnalyst'

describe('Technical analysis', () => {
	let ta

	const validCall = { lookback: 10, type: 'SMA', includeField: false, field: 'close' }
	beforeEach(() => {
		ta = new TechnicalAnalyst()
	})
	describe('Moving Average', () => {
		it('returns map with dates as keys', () => {
			const mockInput = []
			for (let i = 1; i <= 10; i++) {
				mockInput.push({ date: new Date(i * 1000000000), close: i })
			}

			const resp = ta.movingAverage({ ...validCall, data: mockInput })
			expect([...resp.keys()]).toEqual([
				'1970-01-12T13:46:40.000Z',
				'1970-01-24T03:33:20.000Z',
				'1970-02-04T17:20:00.000Z',
				'1970-02-16T07:06:40.000Z',
				'1970-02-27T20:53:20.000Z',
				'1970-03-11T10:40:00.000Z',
				'1970-03-23T00:26:40.000Z',
				'1970-04-03T14:13:20.000Z',
				'1970-04-15T04:00:00.000Z',
				'1970-04-26T17:46:40.000Z'
			])
		})

		it('Calculates constant average', () => {
			const mockInput = []
			for (let i = 1; i <= 15; i++) {
				mockInput.push({ date: new Date(i * 1000000000), close: 1 })
			}

			const resp = ta.movingAverage({ ...validCall, data: mockInput })
			expect([...resp.values()].map(({ average }) => average).filter(Boolean)).toEqual([
				1,
				1,
				1,
				1,
				1,
				1
			])
		})

		it('Calculates linear average', () => {
			const mockInput = []
			for (let i = 1; i <= 15; i++) {
				mockInput.push({ date: new Date(i * 1000000000), close: i })
			}

			const resp = ta.movingAverage({ ...validCall, data: mockInput })
			expect([...resp.values()].map(({ average }) => average).filter(Boolean)).toEqual([
				5.5,
				6.5,
				7.5,
				8.5,
				9.5,
				10.5
			])
		})

		it.each([
			[2, [4.5, 7.5, 10.5, 13.5, 16.5, 19.5, 22.5, 25.5, 28.5, 31.5, 34.5]],
			[10, [16.5, 19.5, 22.5, 25.5, 28.5, 31.5, 34.5, 37.5, 40.5, 43.5, 46.5]],
			[34, [52.5, 55.5, 58.5, 61.5, 64.5, 67.5, 70.5, 73.5, 76.5, 79.5, 82.5]]
		])('works with different lookbacks', (lookback, expected) => {
			const mockInput = []
			for (let i = 1; i <= lookback + 10; i++) {
				mockInput.push({ date: new Date(i * 1000000000), close: i + i * 2 })
			}

			const resp = ta.movingAverage({ ...validCall, data: mockInput, lookback })
			expect([...resp.values()].map(({ average }) => average).filter(Boolean)).toEqual(expected)
		})

		it.each([5, 20, 50, 34])('sets average to null when there isnt enough data', lookback => {
			const mockInput = []
			for (let i = 1; i <= lookback + 10; i++) {
				mockInput.push({ date: new Date(i * 1000000000), close: i + i * 2 })
			}

			const resp = ta.movingAverage({ ...validCall, data: mockInput, lookback })
			expect([...resp.values()].map(({ average }) => average).filter(x => !x).length).toBe(
				lookback - 1
			)
		})

		it('includes the selected field if requested', () => {
			const mockInput = []
			for (let i = 1; i <= 15; i++) {
				mockInput.push({ date: new Date(i * 1000000000), close: i + i * 2 })
			}

			const resp = ta.movingAverage({ ...validCall, data: mockInput, includeField: true })
			expect([...resp.values()].map(({ price }) => price).filter(Boolean)).toEqual([
				3,
				6,
				9,
				12,
				15,
				18,
				21,
				24,
				27,
				30,
				33,
				36,
				39,
				42,
				45
			])
		})
	})
})
