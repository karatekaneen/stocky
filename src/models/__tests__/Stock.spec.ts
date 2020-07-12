import Stock from '../Stock'
import * as OriginalDataSeries from '../DataSeries'
jest.mock('../DataSeries')

const mockedDataSeries = OriginalDataSeries as jest.Mocked<typeof OriginalDataSeries>
const DataSeries = mockedDataSeries.default

describe('Stock', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('Assigns null if no value is passed', () => {
		const stock = new Stock({ name: 'SKF AB', id: 1234 })
		expect(stock.list).toBe(null)
		expect(stock.priceData).toBe(null)
		expect(stock.id).toBe(1234)
	})

	describe('dateToTime', () => {
		it('Returns a correctly formatted date string when given ISO date', () => {
			const s = new Stock({})
			const resp = s.dateToTime([{ date: '2020-01-05T14:50:10.462Z' }])
			expect(resp[0].time).toBe('2020-01-05')
		})

		it('throws if date is falsy', () => {
			expect.assertions(1)
			const s = new Stock({})
			try {
				const resp = s.dateToTime([{ date: null }])
			} catch (err) {
				expect(err.message).toBe('Date is required')
			}
		})
	})

	describe('createCandleStickSeries', () => {
		it('Creates a candlestick DataSeries when called with correct data', () => {
			const testData = {
				name: 'SKF',
				list: 'Large Cap Stockholm',
				priceData: [
					{ date: '2019-10-26T14:50:10.462Z', open: 12, high: 14, low: 12, close: 13 },
					{ date: '2019-10-27T14:50:10.462Z', open: 13, high: 14, low: 12, close: 14 },
				],
			}
			const stock = new Stock(testData)
			stock.createCandlestickSeries()

			expect(stock.dataSeries.length).toBe(1)

			const mock: any = DataSeries.mock.instances[0]
			const { data, name, type } = mock.constructor.mock.calls[0][0]

			expect(data).toEqual([
				{ close: 13, high: 14, low: 12, open: 12, time: '2019-10-26' },
				{ close: 14, high: 14, low: 12, open: 13, time: '2019-10-27' },
			])

			expect(name).toBe('SKF Price')
			expect(type).toBe('candlestick')
		})

		it.todo('should check that there is pricedata')
	})

	describe('createLineSeries', () => {
		it('can make line chart', () => {
			const testData = {
				name: 'SKF',
				list: 'Large Cap Stockholm',
				priceData: [
					{ date: '2019-10-26T14:50:10.462Z', open: 12, high: 14, low: 12, close: 13 },
					{ date: '2019-10-27T14:50:10.462Z', open: 13, high: 14, low: 12, close: 14 },
				],
			}
			const stock = new Stock(testData)
			stock.createLineSeries()

			expect(stock.dataSeries.length).toBe(1)
			const mock: any = DataSeries.mock.instances[0]
			const { data, name, type } = mock.constructor.mock.calls[0][0]

			expect(data).toEqual([
				{ time: '2019-10-26', value: 13 },
				{ time: '2019-10-27', value: 14 },
			])

			expect(name).toBe('SKF close')
			expect(type).toBe('line')
		})

		it('requires field to be one of the pre-specified', () => {
			expect.assertions(2)
			const testData = {
				name: 'SKF',
				list: 'Large Cap Stockholm',
				priceData: [
					{ date: '2019-10-26T14:50:10.462Z', open: 12, high: 14, low: 12, close: 13 },
					{ date: '2019-10-27T14:50:10.462Z', open: 13, high: 14, low: 12, close: 14 },
				],
			}
			const stock = new Stock(testData)

			try {
				stock.createLineSeries('unicorn' as any)
			} catch (err) {
				expect(err.message).toBe(
					'field has to be "open", "close", "high", "low", "volume" or "owners"'
				)
				expect(stock.dataSeries.length).toBe(0)
			}
		})

		it('Making of line chart requires priceData', () => {
			const stock = new Stock({
				name: 'SKF',
				list: 'Large Cap Stockholm',
			})

			stock.createLineSeries()

			expect(stock.dataSeries.length).toBe(0)
		})

		it('can select what field to use in line chart', () => {
			const testData = {
				name: 'SKF',
				list: 'Large Cap Stockholm',
				priceData: [
					{ date: '2019-10-26T14:50:10.462Z', open: 12, high: 14, low: 12, close: 13 },
					{ date: '2019-10-27T14:50:10.462Z', open: 13, high: 14, low: 12, close: 14 },
				],
			}
			const stock = new Stock(testData)

			stock.createLineSeries('open')

			expect(stock.dataSeries.length).toBe(1)

			const mock: any = DataSeries.mock.instances[0]
			const { data, name, type } = mock.constructor.mock.calls[0][0]
			expect(data).toEqual([
				{ time: '2019-10-26', value: 12 },
				{ time: '2019-10-27', value: 13 },
			])

			expect(name).toBe('SKF open')
			expect(type).toBe('line')
		})
	})

	it.todo('should be able to make area chart')
})
