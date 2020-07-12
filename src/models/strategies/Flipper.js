import Strategy from './Strategy'
import Signal from '../Signal'
import _DataFetcher from '../../backendModules/DataFetcher'
import _TechnicalAnalyst from '../TechnicalAnalyst'

/**
 * "20% Flipper" by Nick Radge.
 * Has the default rules added but can be overwritten in the constructor.
 * Basically the strategy is to buy a stock if it rises 20% from a bottom and sell if it
 * falls 20% (or 5/6) from a top when long.
 * @extends Strategy
 */
class Flipper extends Strategy {
	/**
	 * Creates an instance of the Flipper Strategy.
	 * @param {Object} params
	 * @param {String} params.strategyName The name of the strategy
	 * @param {Object} params.initialContext The initial context to start with. Useful to set inital bias etc.
	 * @param {Object} params.rules the rules for the strategy. See `defaultRules` for the ones that are available.
	 * @returns {Flipper}
	 */
	constructor({
		strategyName = 'flipper',
		initialContext = {},
		rules = {},
		DataFetcher = _DataFetcher,
		TechnicalAnalyst = _TechnicalAnalyst
	} = {}) {
		super({ strategyName, initialContext })

		this.technicalAnalyst = new TechnicalAnalyst()
		this.dataFetcher = new DataFetcher()

		/**
		 * These are the default rules for the strategy. Will probably not be overwritten very often.
		 */
		const defaultRules = {
			entryFactor: 6 / 5,
			exitFactor: 5 / 6,
			entryInBearishRegime: false,
			bearishRegimeExitFactor: 11 / 12,
			regimeSecurityID: 19002,
			regimeLookback: 200,
			regimeOperator: '>=',
			regimeType: 'SMA'
		}

		/**
		 * This is the default context that's assigned if none is provided initially.
		 */
		const defaultContext = {
			bias: 'neutral',
			highPrice: null,
			lowPrice: null,
			triggerPrice: null,
			regime: null
		}

		this.rules = { ...defaultRules, ...rules } // Merge the default rules with the ones given.
		this.context = { ...defaultContext, ...initialContext } // Merge default context with the ones provided
	}

	/**
	 * This is the function that's being called for every bar and updates context and checks for triggers.
	 * @param {Object} params
	 * @param {Object} params.signalBar "yesterdays" bar to check for signal to avoid look-ahead-bias.
	 * @param {Object} params.currentBar "today" Will be used to give date and price (open) for entry/exit.
	 * @param {Stock} params.stock The stock being tested. Should be the summary of the stock and not with the whole priceData array to keep size down.
	 * @param {Object} params.context The context that's being carried between bars to keep the test's state.
	 * @returns {Object} with `signal` (null if no signal is found, else Signal) and `context` to be carried to the next bar.
	 */
	processBar({ signalBar, currentBar, stock, context }) {
		// Update the context with the latest highs and lows
		let newContext = {
			...this.setHighLowPrices({
				highPrice: context.highPrice,
				lowPrice: context.lowPrice,
				signalBar
			}),
			regime: this.updateRegime(signalBar), // Check the regime filter
			lastSignal: context.lastSignal
		}

		// Check if the signalbar triggered anything. Will be null if no signal is given which is ok to return as it is
		const { signal, context: maybeUpdatedContext } = this.checkForTrigger({
			highPrice: newContext.highPrice,
			lowPrice: newContext.lowPrice,
			currentBias: context.bias,
			triggerPrice: context.triggerPrice,
			lastSignal: newContext.lastSignal,
			regime: newContext.regime,
			signalBar,
			currentBar,
			stock
		})

		// The context may be updated by the triggering so using the spread to overwrite old values.
		newContext = { ...newContext, ...maybeUpdatedContext }

		if (signal) {
			newContext.lastSignal = signal

			// console.log(newContext)
		}

		if (currentBar.date === null) {
			console.log({
				d: signalBar.date,
				regime: this.updateRegime(signalBar),
				x: newContext.regime
			})
		}

		return { signal, context: newContext }
	}

	/**
	 * Updates the high and low prices to be used as a basis for the signal generation.
	 * @param {Object} params
	 * @param {number|null} params.highPrice the current high to be used for the signaling. Is null by default
	 * @param {number|null} params.lowPrice the current low to be used for the signaling. Is null by default
	 * @param {Boolean} params.useHighAndLow If the function should use the bar's high/low or only close value.
	 * @returns {Object} with highPrice
	 */
	setHighLowPrices({ highPrice, lowPrice, signalBar, useHighAndLow = false }) {
		let tempHigh = signalBar.high
		let tempLow = signalBar.low
		const output = {}

		// If useHighAndLow == false we only use the close value.
		if (!useHighAndLow) {
			tempHigh = signalBar.close
			tempLow = signalBar.close
		}

		// If there is no high set, use the first value we get
		if (!highPrice) {
			output.highPrice = tempHigh
		} else {
			// Else use the max of the prev high and the current
			output.highPrice = Math.max(highPrice, tempHigh)
		}

		// If there is no low set, use the current
		if (!lowPrice) {
			output.lowPrice = tempLow
		} else {
			// Set the low to the min of the previous and the current
			output.lowPrice = Math.min(lowPrice, tempLow)
		}

		return output
	}

	async createRegimeFilter(
		{ id, type, lookback, operator },
		{ dataFetcher = this.dataFetcher, technicalAnalyst = this.technicalAnalyst } = {}
	) {
		const indexData = await dataFetcher.fetchStock({
			id,
			fieldString: 'id, priceData{close, date}'
		})

		const movingAverage = technicalAnalyst.movingAverage({
			field: 'close',
			lookback,
			data: indexData.priceData,
			type,
			includeField: true
		})

		const comparator = this.createComparator(operator)

		const output = new Map()
		for (const [date, { price, average }] of movingAverage) {
			output.set(date, comparator(price, average))
		}

		console.log('Latest regime', [...output.entries()].pop())

		this.regimeFilter = output
	}

	// TODO Kopiera regim-filter ovanifrån här
	// * Skapa två MAs med olika lookback (som definieras i rules)
	// * Merge de två mapsen där värdet är ration mellan dem

	createComparator(operator) {
		return (price, average) => {
			let condition
			if (!price || !average) {
				return null
			} else if (operator === '==') {
				condition = price === average
			} else if (operator === '<=') {
				condition = price <= average
			} else if (operator === '>=') {
				condition = price >= average
			} else {
				throw new Error('Invalid operator')
			}

			return condition ? 'bull' : 'bear'
		}
	}

	updateRegime(signalBar) {
		const date = signalBar.date ? signalBar.date.toISOString() : new Date().toISOString()
		return this.regimeFilter.get(date)
	}

	/**
	 * Checks if "yesterday" generated any actions to be executed on "today's" open.
	 * @param {Object} params
	 * @param {Number} params.highPrice The highest price since reset
	 * @param {Number} params.lowPrice The lowest price since reset
	 * @param {String} params.currentBias "bull", "neutral" or "bear" to know how to handle price action
	 * @param {String} params.regime "bull" or "bear" to know how to handle price action. Depends on larger index price action.
	 * @param {Object} params.signalBar "yesterdays" bar to check for signal to avoid look-ahead-bias.
	 * @param {Object} params.currentBar "today" Will be used to give date and price (open) for entry/exit.
	 * @param {Stock} params.stock The stock being tested. Should be the summary of the stock and not with the whole priceData array to keep size down.
	 * @param {Number|null} params.triggerPrice the price where expected to take action next time. Not used in strategy, only for visualization after.
	 * @returns {Object} with `signal` and `context` props.
	 */
	checkForTrigger({
		highPrice,
		lowPrice,
		currentBias,
		signalBar,
		currentBar,
		lastSignal,
		regime,
		stock,
		triggerPrice
	}) {
		const context = {
			bias: currentBias,
			highPrice,
			lowPrice,
			triggerPrice
		}

		let signal = null

		if (currentBias === 'bear' || currentBias === 'neutral') {
			if (signalBar.close >= lowPrice * this.rules.entryFactor) {
				// Update the context
				context.bias = 'bull'
				context.highPrice = signalBar.close
				context.triggerPrice = context.highPrice * this.rules.exitFactor

				if (regime === 'bull' || this.rules.entryInBearishRegime) {
					// Create the signal instance
					signal = new Signal({
						stock,
						price: currentBar.open,
						date: currentBar.date,
						action: 'buy',
						type: 'enter'
					})
				}
			} else {
				// IF no signal was generated the trigger price should still be updated.
				context.triggerPrice = context.lowPrice * this.rules.entryFactor
			}
		} else if (currentBias === 'bull') {
			// Exit signal:
			if (
				signalBar.close <=
				highPrice *
					(regime === 'bull' ? this.rules.exitFactor : this.rules.bearishRegimeExitFactor)
			) {
				// Update context
				context.bias = 'bear'
				context.lowPrice = signalBar.close
				context.triggerPrice = context.lowPrice * this.rules.entryFactor

				if (lastSignal && lastSignal.type === 'enter') {
					// Create the signal instance
					signal = new Signal({
						stock,
						price: currentBar.open,
						date: currentBar.date,
						action: 'sell',
						type: 'exit'
					})
				}
			} else {
				// IF no signal was generated the trigger price should still be updated.
				context.triggerPrice = context.highPrice * this.rules.exitFactor
			}
		} else {
			throw new Error('Invalid bias value')
		}
		return { signal, context }
	}
}

export default Flipper
