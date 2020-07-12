/**
 * Class to store how the fees are calculated
 */
export default class Fee {
	public percentage: number
	public minimum: number

	/**
	 * @param {object} params
	 * @param {number} params.percentage percentage that's paid in each trade
	 * @param {number} params.minimum the minimum paid in fees
	 */
	constructor({ percentage = 0.0025, minimum = 1 } = {}) {
		this.percentage = percentage
		this.minimum = minimum
	}

	/**
	 * Calulates the fee based on the amount
	 * @param {number} amount the amount the fee is based on
	 * @param {number} percentage Percentage to calculate the fee on
	 * @param {number} minimum minimum fee
	 * @returns {number}
	 */
	calculate(
		amount: number,
		percentage: number = this.percentage,
		minimum: number = this.minimum
	): number {
		return Math.max(minimum, amount * percentage)
	}
}
