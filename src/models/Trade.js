/* eslint-disable indent */
import _Signal from './Signal'
import DateSearcher from '../utils/DateSearcher'

/**
 * Class to calculate and store data about a particular trade.
 */
class Trade {
	/**
	 * Creates an instance of a Trade
	 * @param {Object} params
	 * @param {Signal} params.entry the entry signal
	 * @param {Signal} params.exit the exit signal
	 * @param {Stock} params.stock Information about the stock the trade was in. Will be used for UI and aggregation.
	 * @param {Number} params.quantity The number of shares
	 * @param {Object} deps
	 * @param {Class} deps.Signal
	 */
	constructor(
		{ entry, exit, stock, quantity = 1 },
		{ Signal = _Signal, searchForDate = DateSearcher } = {}
	) {
		/**
		 * Validates that the input is a Signal instance
		 * @param {Object} s Hopefully a Signal
		 * @returns {Boolean}
		 */
		const isSignal = s => s instanceof Signal

		this.entry = isSignal(entry) ? entry : new Signal(entry)
		this.exit = isSignal(exit) ? exit : new Signal(exit)
		this.stock = stock
		this.quantity = quantity
		this.searchForDate = searchForDate
	}

	get entryPrice() {
		const price = this.entry.price
		return this.feeInstance
			? price +
					this.calculatePriceWithFees({
						price,
						fee: this.feeInstance,
						quantity: this.quantity
					})
			: price
	}
	get resultPercent() {
		return this.exitPrice / this.entryPrice - 1
	}

	get resultPerStock() {
		return this.roundNumber(this.exitPrice - this.entryPrice)
	}

	get exitPrice() {
		const price = this.exit.price

		return this.feeInstance
			? price -
					this.calculatePriceWithFees({
						price,
						fee: this.feeInstance,
						quantity: this.quantity
					})
			: price
	}

	get totalFees() {
		if (this.feeInstance) {
			return this.roundNumber(
				this.feeInstance.calculate(this.entry.price * this.quantity) +
					this.feeInstance.calculate(this.exit.price * this.quantity)
			)
		}

		return 0
	}

	/**
	 * Calculates the initial position value
	 * @returns {number} Initial value
	 */
	get initialValue() {
		return this.roundNumber(this.quantity * this.entryPrice)
	}

	/**
	 * Calculates the final position value
	 * @returns {number} Final value
	 */
	get finalValue() {
		return this.roundNumber(this.quantity * this.exitPrice)
	}

	/**
	 * Calculates the result in cash based on the result per stock multiplied with the quantity.
	 * @returns {number} Result in $$$
	 */
	get resultInCash() {
		return this.roundNumber(this.quantity * this.resultPerStock)
	}

	/**
	 * Set the fee for the trade.
	 * Using method instad of setter to be able to chain.
	 * @param {Fee} fee Instance of Fee
	 * @returns {void}
	 */
	setFee(fee) {
		this.feeInstance = fee

		return this
	}

	/**
	 * Sets the number of stocks and updates stored values
	 * Using method instad of setter to be able to chain.
	 * @param {Number} quantity The quantity of stocks traded
	 * @returns {Trade} this
	 */
	setQuantity(quantity) {
		this.quantity = quantity

		return this
	}

	/**
	 * Calculates stock price after fees
	 * @param {object} params
	 * @param {number} params.price
	 * @param {number} params.quantity
	 * @param {Fee} params.fee Instance of fee, to calculate the fees
	 * @returns {number} price per stock after fees
	 */
	calculatePriceWithFees({ price, fee, quantity }) {
		return (price + fee.calculate(price * quantity)) / quantity
	}

	/**
	 * Calculates the number of shares to buy based on amount of cash available
	 * @param {number} amount the max amount to buy for
	 * @returns {number} the number of shares to buy
	 */
	calculateQuantity(amount) {
		return Math.floor(amount / this.entry.price) // Using the raw entry price to avoid double fees in the calculation
	}

	/**
	 * Calculates the trade performance (value) for each day
	 * @param {object} params
	 * @param {Array<object>} params.pricedata The pricedata to extract
	 * @param {Date} params.startDate The date to start the extraction from. this is _included_ in the output
	 * @param {Date} params.endDate The date to end the extraction at. This is _excluded_ from the output.
	 * @param {number} params.quantity The quantity of shares bought
	 * @param {Function} params.searchForDate Search algorithm. Returns the index of the date in the array
	 * @returns {Array<object>} Array of the position value for each date. Looks like: `{ date: *date instance*, value: 23484 }`
	 */
	getTradePerformance({
		priceData,
		startDate = this.entry.date,
		endDate = this.exit.date,
		quantity = this.quantity,
		searchForDate = this.searchForDate
	}) {
		const startIndex = searchForDate({ priceData, date: startDate })
		const endIndex = searchForDate({ priceData, date: endDate })
		const output = priceData
			.slice(startIndex, endIndex)
			.map(({ date, close }) => ({ date, value: close * quantity }))

		output[0].value = this.initialValue

		return output
	}

	/**
	 * Converts from the annoying 13-decimal floats.
	 * I'm too poor for this to make a significant error in the end anyways.
	 * @param {Number} num The number to be converted to a proper number
	 * @returns {Number} Rounded to 12 decimals
	 * @todo Make private
	 */
	roundNumber(num) {
		// TODO Extract to be able to use on other places
		return Math.round(num * 1e10) / 1e10
	}
}

export default Trade
