import _Signal from '../Signal'
import _Trade from '../Trade'
import DateSearcher from '../../utils/DateSearcher'
import _DataFetcher from '../../backendModules/DataFetcher'

/**
 * Class that tests a set of data given a set of rules. Somewhat of a parent class to be extended.
 */
class Strategy {
	/**
	 * Creates instance of the Strategy class
	 * @param {Object} params
	 * @param {string} params.strategyName The name of the strategy
	 * @param {Object} params.initialContext The initial context to be injected in to the test. Optional.
	 * @param {Function} params.signalFunction The function that generates the signals
	 * @param {string} params.openPositionPolicy How the open positions shoould be handled at the end of the test. Can only be 'excluded', 'conservative' or 'optimistic'
	 * @param {Signal} params.Signal The Signal class
	 * @param {Trade} params.Trade The Trade class
	 */
	constructor({
		strategyName = 'flipper',
		initialContext,
		signalFunction,
		openPositionPolicy = 'conservative',
		Signal = _Signal,
		Trade = _Trade,
		DataFetcher = _DataFetcher
	} = {}) {
		this.Signal = Signal
		this.dataFetcher = new DataFetcher()
		this.Trade = Trade
		this.searchForDate = DateSearcher
		this.context = initialContext
		this.strategyName = strategyName
		this.openPositionPolicy = openPositionPolicy
		this.rules = {}

		if (signalFunction) {
			this.processBar = signalFunction
		}
	}

	/**
	 * Output from the test function
	 * @typedef TestOutput
	 * @property {Array<Signal>} signals All the signals that the test generated
	 * @property {Object} context The context as it was on the last bar
	 * @property {Object|null} pendingSignal If a signal was created on the last day as the test ended it is marked as pending. Useful for live trading to know what to execute the day after.
	 * @property {Array<Trade>} trades The trades that the test generated.
	 * @property {Signal|null} closeOpenPosition If a position was open when the test ended, this sis the signal that was generated to close the open position. Useful to display open profit but mainly used to calculate the last trade.
	 * @property {Trade|null} openTrade If there was an open position when the test ended, this summarizes the open profit etc. Depending on the openPositionPolicy in the Strategy it is either calculated on the last close or the "stop" price. It is also included as the last item in the `trades` prop.
	 */

	/**
	 * The main test function that runs the backtest on a particular stock.
	 * @param {Object} params
	 * @param {Stock} params.stock The stock with the pricedata to test
	 * @param {Date} params.startDate The date to start the test. Defaults to first date
	 * @param {Date} params.endDate The date to end the test. Defaults to last date
	 * @param {Object} params.initialContext If any initial context should be used it can be passed here.
	 * @returns {TestOutput}
	 * @todo It may be a good idea to refactor to pass all the data and index instead to allow for more complex calculations etc. OR make the function in the same way as `processBar` to force each strategy to implement own test function?
	 */
	async test({
		stock,
		startDate = null,
		endDate = null,
		initialContext = this.context,
		dataFetcher = this.dataFetcher
	} = {}) {
		// TODO It may be a good idea to refactor to pass all the data and index instead to allow for more complex calculations etc.
		// ? Maybe the better way is to add ability to override the default test function

		const { priceData } = await dataFetcher.fetchStock({
			id: stock.id,
			fieldString: 'priceData{open, high, low, close, date}'
		})
		let openTrade = null

		// Get the start and end index of the data to be tested
		const { startIndex, endIndex } = this.extractData({
			priceData,
			startDate,
			endDate
		})

		if (!this.regimeFilter) {
			await this.createRegimeFilter({
				id: this.rules.regimeSecurityID,
				type: this.rules.regimeType,
				lookback: this.rules.regimeLookback,
				operator: this.rules.regimeOperator
			})
		}
		const testData = priceData.slice(startIndex, endIndex + 1) // Add 1 to include the last

		// Run the test in a reduce:
		const { signals, context, pendingSignal, closeOpenPosition } = testData.reduce(
			(aggregate, currentBar, index, originalArr) => {
				if (index > 0) {
					const { signal, context: newContext } = this.processBar({
						signalBar: originalArr[index - 1],
						currentBar,
						stock,
						context: aggregate.context
					})

					// Update context
					aggregate.context = newContext

					// Add signal to array if there is any
					if (signal) {
						aggregate.signals.push(signal)
					}

					// On the last bar, check for signals to be executed on the next open:
					if (index === originalArr.length - 1) {
						const { signal: pendingSignal } = this.processBar({
							signalBar: originalArr[index],
							currentBar: { open: null, high: null, low: null, close: null, date: null },
							stock,
							context: aggregate.context
						})

						// If any signals, add them to output
						if (pendingSignal) {
							aggregate.pendingSignal = pendingSignal
						}

						aggregate.closeOpenPosition = this.handleOpenPositions({
							signals: aggregate.signals,
							currentBar,
							context: aggregate.context,
							stock
						})
					}
				}

				return aggregate
			},
			// Initial values:
			{
				signals: [],
				context: initialContext,
				pendingSignal: null,
				closeOpenPosition: null
			}
		)

		const trades = this.summarizeSignals({
			signals,
			priceData,
			closeOpenPosition,
			stock
		})

		// Separate the open trade in to own object as well
		if (closeOpenPosition && trades.length > 0) {
			openTrade = trades[trades.length - 1]
		}

		return {
			signals,
			context,
			pendingSignal,
			trades,
			closeOpenPosition,
			openTrade
		}
	}

	/**
	 * Generates an exit signal if there is any open positions at the end of the test.
	 *
	 * This enables both excluding of the open positions as well as calculating the open
	 * profit/loss for testing purposes. Will probably become handy when dealing with strategies
	 * that has very long-running positions. Note that if the `openPositionPolicy` is set to 'conservative'
	 * the signal price is set to the "guaranteed" exit compared to when it it set to 'optimistic'
	 * the signal price is set to the last close.
	 *
	 * @param {Object} params
	 * @param {Array<Signal>} params.signals All the signals generated in the test
	 * @param {Object} params.currentBar the last bar to add data to the signal
	 * @param {Object} params.context The current context from the last bar
	 * @param {Object} params.stock The stock being tested
	 * @param {String} params.openPositionPolicy Decides what the price in the exit signal should be based on.
	 * @param {Object} deps
	 * @param {Signal} deps.Signal The Signal class
	 * @returns {Signal | null} The signal if there is any open positions, else null.
	 */
	handleOpenPositions(
		{ signals, currentBar, context, stock, openPositionPolicy = this.openPositionPolicy },
		{ Signal = this.Signal } = {}
	) {
		let closeOpenPosition = null
		if (signals.length > 0) {
			// Odd number of signals is a tell of open position:
			const isSignalsLengthOdd = signals.length % 2 === 1

			// The last order type is also a tell of open positions:
			const isLastSignalEnter = signals[signals.length - 1].type === 'enter'

			// Check for open positions:
			if (isSignalsLengthOdd && isLastSignalEnter) {
				// There is an open position

				if (openPositionPolicy === 'conservative' || openPositionPolicy === 'exclude') {
					/*
					If the openPositionPolicy the open p/l is calculated on where the "guaranteed" exit will be,
					ie. the trailing trigger price for the exit
					*/
					closeOpenPosition = new Signal({
						stock,
						action: 'sell',
						type: 'exit',
						price: context.triggerPrice,
						date: currentBar.date
					})
				} else if (openPositionPolicy === 'optimistic') {
					/*
				If, on the other hand, the policy is optimistic the open p/l will be calculated as
				the latest close.
				*/
					closeOpenPosition = new Signal({
						stock,
						action: 'sell',
						type: 'exit',
						price: currentBar.close,
						date: currentBar.date
					})
				}
			} else if (isSignalsLengthOdd && !isLastSignalEnter) {
				// ! Logic error somewhere :(
				throw new Error(
					'Logic error found. Uneven length on signal array and last signal was to exit'
				)
			}
		}
		return closeOpenPosition
	}

	/**
	 * Converts all of the raw signals into an array of Trades to be more easily parsable later on.
	 * @param {Object} params
	 * @param {Array<Signal>} params.signals All the signals from the test
	 * @param {Signal|null} params.closeOpenPosition The signal generated to keep track of open profit/loss
	 * @param {String} params.openPositionPolicy How the open positions should be handled at the end of the test
	 * @param {Object} deps
	 * @param {Class} deps.Trade The trade class
	 * @returns {Array<Trade>} List of trades.
	 */
	summarizeSignals(
		{ signals, closeOpenPosition, openPositionPolicy = this.openPositionPolicy, stock },
		{ Trade = this.Trade } = {}
	) {
		const numberOfSignals = signals.length
		if (numberOfSignals < 1) {
			return []
		}

		const isOddNumber = numberOfSignals % 2 === 1
		const lastSignalType = signals[signals.length - 1].type

		// Early indication that something is wrong
		if ((isOddNumber && !closeOpenPosition) || (!isOddNumber && lastSignalType === 'enter')) {
			throw new Error('No exit signal for open position provided')
		}

		// Group the entries and exits together
		const groupedSignals = this.groupSignals({ signals, closeOpenPosition })

		// Convert the signal groups to Trade instances
		const trades = groupedSignals.map(([entrySignal, exitSignal]) => {
			return new Trade({ entry: entrySignal, exit: exitSignal, stock })
		})

		// If the policy is to exclude open positions from result, pop the last item
		if (openPositionPolicy === 'exclude' && closeOpenPosition) {
			trades.pop()
		}

		return trades
	}

	/**
	 * Groups signals 2 by 2, with entry and exit to later on be created as Trades
	 * @param {Object} params parameters
	 * @param {Array<Signal>} params.signals The signals generated in the test
	 * @param {Signal|null} params.closeOpenPosition The signal to close open positions if there are any
	 * @param {Number} params.groupSize How many signals it should be in every group. Defaults to 2 because entry and exit
	 * @returns {Array<Array<Signal>>} Nested arrays with signals in groups of 2 (by default)
	 */
	groupSignals({ signals, closeOpenPosition, groupSize = 2 }) {
		const signalList = [...signals]

		if (closeOpenPosition) {
			signalList.push(closeOpenPosition)
		}

		let index = 0
		const output = []

		// Split up the array into smaller arrays of 2
		while (index < signalList.length) {
			output.push(signalList.slice(index, groupSize + index))
			index += groupSize
		}

		// Check if it has invalid structure
		const hasInvalidSignals = output.some(arr => {
			const isInvalidLength = arr.length !== 2
			const hasInvalidSignalTypes =
				!arr[0] || arr[0].type !== 'enter' || !arr[1] || arr[1].type !== 'exit'
			// TODO Add optional chaining here when able to.

			return isInvalidLength || hasInvalidSignalTypes
		})

		if (hasInvalidSignals) {
			throw new Error('Invalid sequence or number of signals')
		}

		return output
	}

	createRegimeFilter() {
		throw new Error('No regime creation function provided')
	}

	/**
	 * This is the main function to run the tests but since this is
	 * a class meant to be extended each strategy has to override this.
	 */
	processBar() {
		throw new Error('No signal function has been provided')
	}

	/**
	 * Gets the start and end index of the data between the start- and endDate.
	 * @param {Object} params
	 * @param {Array<Object>} params.priceData Array of price data to grab data from
	 * @param {Date} params.startDate The first date to include
	 * @param {Date} params.endDate The last date to include
	 * @returns {Object} with the `startIndex` and `endIndex` props.
	 */
	extractData({ priceData, startDate, endDate }) {
		const output = { startIndex: 0, endIndex: priceData.length - 1 }

		if (startDate) {
			output.startIndex = this.searchForDate({ priceData, date: startDate })
		}

		if (endDate) {
			output.endIndex = this.searchForDate({ priceData, date: endDate })
		}

		return output
	}
}

export default Strategy
