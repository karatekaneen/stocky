class TechnicalAnalyst {
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
	movingAverage({ field, lookback, data, type, includeField }) {
		const { output } = data.reduce(
			(aggregate, current, index, arr) => {
				const valueToWrite = { average: null }

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

				aggregate.output.set(current.date.toISOString(), valueToWrite)

				return aggregate
			},
			{ output: new Map(), sum: 0 }
		)
		return output
	}
}

export default TechnicalAnalyst
