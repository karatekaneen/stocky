import Analyzer from '../Analyzer'
import TechnicalAnalyst from '../TechnicalAnalyst'

describe('Analyzer', () => {
	it('Has a working constructor', () => {
		const a = new Analyzer()
		expect(a).toBeInstanceOf(Analyzer)
	})

	describe('ResultToVolume', () => {
		let movingAverage: any

		beforeEach(() => {
			movingAverage = jest.fn(new TechnicalAnalyst().movingAverage)
		})

		it('should convert volume from # shares to $', () => {
			const priceData: any = [
				{ open: 2, high: 2, low: 2, close: 2, volume: 10, date: new Date(1) },
			]

			Analyzer.resultToVolume([], priceData, 1, { technicalAnalyst: { movingAverage } } as any)

			expect(movingAverage.mock.calls[0][0].data[0].volume).toBe(20)
		})

		it.each([100, 200, 20, 1, 2, 3, 4, 5, 6])(
			'should create average of given lookback period length',
			(lookback) => {
				const priceData: any = [
					{ open: 2, high: 2, low: 2, close: 2, volume: 10, date: new Date(1) },
				]

				Analyzer.resultToVolume([], priceData, lookback, {
					technicalAnalyst: { movingAverage },
				} as any)

				expect(movingAverage.mock.calls[0][0].lookback).toBe(lookback)
			}
		)

		it('should return array of result and volume', () => {
			const priceData: any = [
				{ open: 2, high: 2, low: 2, close: 2, volume: 10, date: new Date(1) },
				{ open: 3, high: 3, low: 3, close: 3, volume: 10, date: new Date(2) },
				{ open: 4, high: 4, low: 4, close: 4, volume: 10, date: new Date(3) },
			]

			const trades: any = [
				{ entryDate: new Date(2), resultPercent: 0.25 },
				{ entryDate: new Date(3), resultPercent: -0.123 },
			]

			expect(
				Analyzer.resultToVolume(trades, priceData, 2, {
					technicalAnalyst: { movingAverage },
				} as any)
			).toEqual([
				{ result: 0.25, volume: 25 },
				{ result: -0.123, volume: 35 },
			])
		})

		it('should handle missing average on dates', () => {
			const priceData: any = [
				{ open: 2, high: 2, low: 2, close: 2, volume: 10, date: new Date(1) },
				{ open: 3, high: 3, low: 3, close: 3, volume: 10, date: new Date(2) },
				{ open: 4, high: 4, low: 4, close: 4, volume: 10, date: new Date(3) },
			]

			const trades: any = [
				{ entryDate: new Date(2), resultPercent: 0.25 },
				{ entryDate: new Date(3), resultPercent: -0.123 },
			]

			expect(
				Analyzer.resultToVolume(trades, priceData, 20, {
					technicalAnalyst: { movingAverage },
				} as any)
			).toEqual([
				{ result: 0.25, volume: null },
				{ result: -0.123, volume: null },
			])
		})
	})
})
