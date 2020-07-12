import searchForDate from '../DateSearcher'

describe('Search for date', () => {
	it('Throws if date is less than the first date in data', () => {
		expect.assertions(1)

		// Generate array with the date set to the index + 2
		const priceData = new Array(100).fill(0).map((_, i) => ({ date: new Date(i + 2) }))

		try {
			searchForDate({ priceData, date: new Date(1) })
		} catch (err) {
			expect(err.message).toBe('Date is not within provided interval')
		}
	})

	it('Throws if date is greater than the last date in data', () => {
		expect.assertions(1)

		// Generate array with the date set to the index + 2
		const priceData = new Array(100).fill(0).map((_, i) => ({ date: new Date(i + 2) }))

		try {
			searchForDate({ priceData, date: new Date(200) })
		} catch (err) {
			expect(err.message).toBe('Date is not within provided interval')
		}
	})

	it.each([[1000, 99, 98], [25, 24, 23], [1, 1, 0], [2, 2, 1]])(
		'Returns the index of where the date is',
		(arrLength, target, expectedIndex) => {
			// Generate array with the date set to the index + 1
			const priceData = new Array(arrLength).fill(0).map((_, i) => ({ date: new Date(i + 1) }))

			const resp = searchForDate({ priceData, date: new Date(target) })

			expect(resp).toBe(expectedIndex)
		}
	)

	it.each([[100, 51, 26], [250, 127, 64], [100, 37, 19], [200, 199, 100]])(
		'Returns the first value after target if the value is skipped',
		(arrLength, target, expectedIndex) => {
			// Generate array with the date set to the index + 1
			const priceData = new Array(arrLength).fill(0).map((_, i) => ({ date: new Date(i * 2) }))

			const resp = searchForDate({ priceData, date: new Date(target) })

			expect(resp).toBe(expectedIndex)
		}
	)
})
