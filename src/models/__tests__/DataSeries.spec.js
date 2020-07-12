import DataSeries from '../DataSeries'

describe('DataSeries', () => {
	describe('validateData', () => {
		it('throws when given no type', () => {
			expect.assertions(1)
			try {
				const dataSeries = new DataSeries({
					id: 123,
					name: 'my series',
					data: [{ time: '2002-05-05', value: 24.54 }]
				})
			} catch (e) {
				expect(e.message).toBe('Name, type and data is required')
			}
		})

		it('throws when given no name', () => {
			expect.assertions(1)
			try {
				const dataSeries = new DataSeries({
					id: 123,
					name: '',
					data: [{ time: '2002-05-05', value: 24.54 }],
					type: 'line'
				})
			} catch (e) {
				expect(e.message).toBe('Name, type and data is required')
			}
		})

		it('throws when given no data', () => {
			expect.assertions(1)
			try {
				const dataSeries = new DataSeries({ id: 123, name: 'my series', type: 'line' })
			} catch (e) {
				expect(e.message).toBe('Name, type and data is required')
			}
		})

		it('throws when given unknown type', () => {
			expect.assertions(1)
			try {
				const dataSeries = new DataSeries({
					id: 123,
					name: 'my series',
					data: [{ time: '2002-05-05', value: 24.54 }],
					type: 'elephant'
				})
			} catch (e) {
				expect(e.message).toBe('Unknown chart type')
			}
		})

		it('returns the data when given a correct linechart', () => {
			expect.assertions(1)
			const dataSeries = new DataSeries({
				id: 123,
				name: 'my series',
				data: [{ time: '2002-05-05', value: null }, { time: '2002-05-05', value: 24.54 }],
				type: 'line'
			})
			expect(dataSeries.data).toEqual([
				{ time: '2002-05-05', value: null },
				{ time: '2002-05-05', value: 24.54 }
			])
		})

		it('Requires at least 1 datapoint', () => {
			expect.assertions(1)
			try {
				const dataSeries = new DataSeries({
					id: 123,
					name: 'my series',
					data: [],
					type: 'line'
				})
			} catch (err) {
				expect(err.message).toBe('At least 1 datapoint must be provided')
			}
		})

		it('Should accept candle type', () => {
			expect.assertions(1)
			const dataSeries = new DataSeries({
				id: 123,
				name: 'my series',
				data: [
					{ time: '2002-05-05', open: null, high: null, low: null, close: null },
					{ time: '2002-05-05', open: 11, high: 12, low: 11, close: 12 }
				],
				type: 'candlestick'
			})
			expect(dataSeries.data).toEqual([
				{ time: '2002-05-05', open: null, high: null, low: null, close: null },
				{ time: '2002-05-05', open: 11, high: 12, low: 11, close: 12 }
			])
		})

		it('expects candlestick all pricepoints to be either null or numbers', () => {
			expect.assertions(2)
			try {
				const dataSeries = new DataSeries({
					id: 123,
					name: 'my series',
					data: [
						{ time: '2002-05-05', open: null, high: 13, low: null, close: null },
						{ time: '2002-05-05', open: 11, high: 12, low: 11, close: 12 }
					],
					type: 'candlestick'
				})
			} catch (err) {
				expect(err.message).toBe('Invalid data format for candlestick chart')
			}

			try {
				const dataSeries = new DataSeries({
					id: 123,
					name: 'my series',
					data: [
						{ time: '2002-05-05', open: null, high: null, low: null, close: null },
						{ time: '2002-05-05', open: 11, high: null, low: 11, close: 12 }
					],
					type: 'candlestick'
				})
			} catch (err) {
				expect(err.message).toBe('Invalid data format for candlestick chart')
			}
		})

		it('Should accept area type', () => {
			expect.assertions(1)
			const dataSeries = new DataSeries({
				id: 123,
				name: 'my series',
				data: [{ time: '2002-05-05', value: null }, { time: '2002-05-05', value: 24.54 }],
				type: 'area'
			})
			expect(dataSeries.data).toEqual([
				{ time: '2002-05-05', value: null },
				{ time: '2002-05-05', value: 24.54 }
			])
		})
	})

	it.todo('should have histograms?')
	it.todo('high must be the highest value')
	it.todo('low mustbe the lowest value')
})
