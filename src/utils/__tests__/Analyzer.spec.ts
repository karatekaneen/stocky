import Analyzer from '../Analyzer'
import TechnicalAnalyst from '../TechnicalAnalyst'
// import * as OriginalDataFetcher from '../../../utils/DataFetcher'
// jest.mock('../../../utils/DataFetcher')
// jest.mock('../../Signal')

// const mockedDataFetcher = OriginalDataFetcher as jest.Mocked<typeof OriginalDataFetcher>
// const DataFetcher = mockedDataFetcher.default

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

	describe('Merge volume comparisons', () => {
		let saveStats: any, validCall: any

		beforeEach(() => {
			saveStats = jest.fn()
			validCall = [
				[
					{ result: 1, volume: 2 },
					{ result: 3, volume: 4 },
					{ result: 5, volume: 6 },
				],
				[
					{ result: 10, volume: 20 },
					{ result: 30, volume: 40 },
					{ result: 50, volume: 60 },
				],
				[
					{ result: 11, volume: 21 },
					{ result: 31, volume: 41 },
					{ result: 51, volume: 61 },
				],
			]
		})

		it('Saves to the correct document', async () => {
			await Analyzer.mergeAndSaveVolumeComparisons(validCall, { db: { saveStats } } as any)

			expect(saveStats.mock.calls[0][0]).toBe('volume-to-result')
		})

		it('Adds a stat name', async () => {
			await Analyzer.mergeAndSaveVolumeComparisons(validCall, { db: { saveStats } } as any)

			expect(saveStats.mock.calls[0][1]).toBeTruthy()
		})

		it('Should add a description', async () => {
			await Analyzer.mergeAndSaveVolumeComparisons(validCall, { db: { saveStats } } as any)

			expect(saveStats.mock.calls[0][2]).toBeTruthy()
		})

		it('Merges multiple arrays in to one', async () => {
			await Analyzer.mergeAndSaveVolumeComparisons(validCall, { db: { saveStats } } as any)

			const data = saveStats.mock.calls[0][3]
			expect(data.length).toBe(9)
			expect(data.every((d: any) => d.result && d.volume))
		})

		it('Filters out where result is falsy', async () => {
			const mockData = [
				[
					{ result: 0, volume: 2 },
					{ result: null, volume: 4 },
					{ result: 5, volume: 6 },
				],
			]
			await Analyzer.mergeAndSaveVolumeComparisons(mockData, { db: { saveStats } } as any)

			const data = saveStats.mock.calls[0][3]
			expect(data.length).toBe(1)
		})

		it('Filters out where volume is falsy', async () => {
			const mockData = [
				[
					{ result: 2, volume: 0 },
					{ result: 25, volume: null },
					{ result: 5, volume: undefined },
					{ result: 5, volume: 6 },
				],
			]
			await Analyzer.mergeAndSaveVolumeComparisons(mockData, { db: { saveStats } } as any)

			const data = saveStats.mock.calls[0][3]
			expect(data.length).toBe(1)
		})

		it('Sorts by volume, ascending', async () => {
			await Analyzer.mergeAndSaveVolumeComparisons(validCall, { db: { saveStats } } as any)

			const data = saveStats.mock.calls[0][3]
			expect(data.map((d: any) => d.volume)).toEqual([2, 4, 6, 20, 21, 40, 41, 60, 61])
		})
	})
})
