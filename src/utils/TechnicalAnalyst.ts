import { PricePoint } from '../types'

export default class TechnicalAnalyst {
	constructor() {}
	/**
	 * Calculates moving average.
	 *
	 * **Note that this is vulnerable to look-ahead-bias since it is including the date requested.**
	 * @param {Object} params
	 * @param {string} params.field The field where the data to calculate the average from resides
	 * @param {number} params.lookback Lookback period
	 * @param {Array<Object>} params.data Array that must have `data` and the `[field]` attribute.
	 * @param {string} params.type The type of moving average. **Unused**
	 * @param {boolean} params.includeField Whether or not the field should be included.
	 * @returns {Map<string, Object>} The ISO-date as key with the current date **included** so beware of look-ahead.
	 */
	movingAverage({
		field,
		lookback,
		data,
		type,
		includeField, // TODO: Make static
	}: {
		field: keyof Omit<PricePoint, 'time' | 'date'>
		lookback: number
		data: PricePoint[]
		type: string
		includeField: boolean
	}) {
		const { output } = data.reduce(
			(aggregate, current, index, arr) => {
				const valueToWrite: { average: number; price?: number } = { average: null }

				if (includeField) {
					valueToWrite.price = current[field]
				}
				aggregate.sum += current[field]

				if (index + 1 >= lookback) {
					if (arr[index - lookback]) {
						aggregate.sum -= arr[index - lookback][field]
					}

					valueToWrite.average = aggregate.sum / lookback
				}

				const dateString =
					typeof current.date === 'string' ? current.date : current.date.toISOString()
				aggregate.output.set(dateString, valueToWrite)

				return aggregate
			},
			{ output: new Map<string, { average: number; price?: number }>(), sum: 0 }
		)
		return output
	}
}
