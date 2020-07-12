import { PricePoint } from 'src/types'

/**
 * Logic like a binary search tree, almost at least.
 * If the mid item is equal to the target date or the mid item is greater than the target date but the previous is less the mid gets returned.
 *
 * If the mid item is GREATER than the target date it recursively calls itself but with the mid as
 * the "cap" of the searching.
 *
 * If the mid item is LESS than the target date it recursively calls itself but with the mid index
 * as the lower limit for searching.
 *
 * If the mid item is less than the target date but the next is larger - mid +1  gets returned.
 *
 * @param {Object} params
 * @param {Array<Object>} params.priceData The price data to search for the target date
 * @param {Date} params.date The date to search for
 * @param {Number} params.upperLimit The max index to search for, used to limit down the searches logarithmically
 * @param {Number} params.lowerLimit The min index to search for, used to limit down the searches logarithmically
 * @returns {Number} The index of the target date or the one closest
 */
const searchForDate = ({
	priceData,
	date,
	upperLimit = null,
	lowerLimit = null,
}: {
	priceData: PricePoint[]
	date: Date
	upperLimit?: number | null
	lowerLimit?: number | null
}): number => {
	if (date < priceData[0].date || date > priceData[priceData.length - 1].date) {
		// ? Should this really throw when date < priceData[0].date or rather return 0?

		throw new Error('Date is not within provided interval')
	}

	// Assign the upper and lower limits of where to search in the array
	const upper = upperLimit || priceData.length
	const lower = lowerLimit || 0

	// Get the middle index
	const mid = Math.floor((upper + lower) / 2)

	if (
		(priceData[mid].date as Date).getTime() === date.getTime() ||
		(priceData[mid].date > date && priceData[mid - 1].date < date)
	) {
		// Bullseye returning mid
		return mid
	} else if (priceData[mid].date < date && priceData[mid + 1].date > date) {
		// Almost, there is no exact match, returning next item
		return mid + 1
	} else if (priceData[mid].date > date) {
		// Search lower half recursively
		return searchForDate({ priceData, date, upperLimit: mid, lowerLimit: lower })
	} else if (priceData[mid].date < date) {
		// Search upper half recursively
		return searchForDate({ priceData, date, upperLimit: upper, lowerLimit: mid })
	} else {
		// ! You fucked up
		throw new Error('Logic error :C ')
	}
}

export default searchForDate
