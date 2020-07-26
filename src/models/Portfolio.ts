/* eslint-disable indent */
import Trade from './Trade'
import Fee from './Fee'
import DataFetcher from '../utils/DataFetcher'
import queue from '../utils/queue'
import { SignalType, TradeDailyPerformance } from 'src/types'

type RankingMethod = 'random' | 'best' | 'worst'

type PortfolioBalance = {
	cashAvailable?: number
	total?: number
	positions?: { id: number | string; value: number }[]
	totalPositionValue?: number
	numberOfPositionsOpen?: number
}

type PortfolioParams = {
	startCapital?: number
	maxNumberOfStocks?: number
	selectionMethod?: RankingMethod
	fee?: Fee
	feePercentage?: number
	feeMinimum?: number
}

class Portfolio {
	// these need to be created to avoid Jest from throwing:
	// Trade = null
	#Trade: typeof Trade
	#Fee: typeof Fee
	#dataFetcher: DataFetcher
	#queue: typeof queue

	public historicalTrades = [] as Trade[]
	public openTrades = [] as Trade[]
	public signalsNotTaken = 0
	public startCapital: number
	public cashAvailable: number
	public maxNumberOfStocks: number
	public availableSlots: number
	public selectionMethod: RankingMethod
	public fee: Fee
	public timeline: Map<string, PortfolioBalance>

	constructor(
		{
			startCapital = 100000,
			maxNumberOfStocks = 20,
			selectionMethod = 'random',
			fee,
			feePercentage = 0.0025,
			feeMinimum = 1,
		} = {} as PortfolioParams,
		{ _Trade = Trade, _Fee = Fee, _DataFetcher = DataFetcher, _queue = queue } = {}
	) {
		this.#Trade = _Trade
		this.#dataFetcher = new _DataFetcher()
		this.#queue = _queue

		this.timeline = new Map()
		this.signalsNotTaken = 0
		this.startCapital = startCapital
		this.cashAvailable = startCapital
		this.maxNumberOfStocks = maxNumberOfStocks
		this.availableSlots = maxNumberOfStocks
		this.selectionMethod = selectionMethod
		this.fee = fee || new Fee({ percentage: feePercentage, minimum: feeMinimum })
	}

	get openPositions() {
		return this.maxNumberOfStocks - this.availableSlots
	}

	async backtest({ trades, fee = this.fee }: { trades: Trade[]; fee?: Fee }) {
		/*
		1. Generate date map from signals within trades with object with entry & exit for each date
		2. Loop over the dates
			- Check for exits first for each day
				- Calculate fees? (Or has this already been done?)
				- Add cash to cashAvailable
				- Remove the stock from openTrades
			- Then, check if the portfolio has room for more stocks to be added
				- If there is room, check if there is any entry signals
				- Select the signals to be taken based on selectionMethod
				- Calculate quantity and set it to the trade instance
				- Calculate fees & add it to the trade instance
				- "Withdraw" cash from cashAvailable
		3. Generate portfolio equity curve
			- Get all the pricedata for each trade and generate daily curve
		4. Sumarize + analyze portfolio
		*/

		// Reset the cash available just in case this isn't the first test ran on this instance
		this.cashAvailable = this.startCapital

		const currentlyHolding = new Map<string, Trade[]>()
		const signalMap = this.generateSignalMaps(trades)

		signalMap.forEach(({ entry, exit }, date) => {
			const tradesToClose = currentlyHolding.get(date)
			if (tradesToClose) {
				tradesToClose.forEach((trade) => {
					this.historicalTrades.push(trade)
					this.cashAvailable += trade.finalValue
					this.availableSlots++
				})

				currentlyHolding.delete(date)
			}

			if (this.availableSlots && entry.length > 0) {
				let signalsTaken = 0

				this.rankSignals(entry, this.selectionMethod, this.availableSlots).forEach(
					(t: Trade) => {
						/*
						t might be pure JSON if it's loaded from db and not directly from the test.
						Then it needs to be instantiated to be able to use the Trade class' methods.
						*/
						const trade = t instanceof Trade ? t : new Trade(t)
						const dateString =
							typeof trade.exit.date === 'string'
								? trade.exit.date
								: trade.exit.date.toISOString()

						const maxPositionValue = this.calculateMaxPositionValue(
							this.cashAvailable,
							fee,
							this.availableSlots
						)

						const quantity = trade.calculateQuantity(maxPositionValue)

						if (quantity > 0) {
							trade.setQuantity(quantity)

							// "Withdraw cash"
							this.cashAvailable -= trade.initialValue

							// Remove slot from availability
							this.availableSlots--
							signalsTaken++

							const existingTrades = currentlyHolding.get(dateString)

							existingTrades
								? currentlyHolding.set(dateString, [...existingTrades, trade])
								: currentlyHolding.set(dateString, [trade])
						}
					}
				)

				this.signalsNotTaken += entry.length - signalsTaken
			}
			this.timeline.set(date, { cashAvailable: this.cashAvailable })
		})

		if (signalMap.size > 0) {
			await this.generateTimeline()
		}

		this.openTrades = [...currentlyHolding.values()].flat()
	}

	/**
	 * Calculates the max amount to spend on a position.
	 * @param {number} cashAvailable The max amount of cash available
	 * @param {Fee} feeInstance Instance of Fee
	 * @param {number} availableSlots Number of open position slots that can be filled
	 * @returns {number} the max amount to buy a single stock for
	 */
	calculateMaxPositionValue(
		cashAvailable: number,
		feeInstance: Fee,
		availableSlots = this.availableSlots
	) {
		return (cashAvailable - feeInstance.calculate(cashAvailable)) / availableSlots
	}

	/**
	 * Ranks trades according to the selectionMethod.
	 * * Note that Best & Worst should _only_ be used for testing purposes
	 *
	 * @todo Make proper implementation when signals have ranking factors built in.
	 * @param {Array<Trade>} trades The trades to choose from
	 * @param {string} selectionMethod How to pick the trades
	 * @param {number} availableSlots The maximum number of trades to take
	 * @returns {Array<Trade>} The selected trades
	 */
	rankSignals(trades: Trade[], selectionMethod: RankingMethod, availableSlots: number) {
		if (trades.length <= availableSlots) {
			return trades
		}

		if (selectionMethod === 'random') {
			return [...trades].sort((a, b) => 0.5 - Math.random()).slice(0, availableSlots)
		}

		if (selectionMethod === 'best') {
			const output = [...trades]
				.sort((a, b) => b.resultPercent - a.resultPercent)
				.slice(0, availableSlots)
			return output
		}

		if (selectionMethod === 'worst') {
			return [...trades]
				.sort((a, b) => a.resultPercent - b.resultPercent)
				.slice(0, availableSlots)
		}
		// TODO Make proper implementation
		return trades
	}

	/**
	 * Adds how the cashAvailable changed over the course of the backtest.
	 * @param {object} params
	 * @param {Map} params.dateMap Map with date strings as keys, empty so far
	 * @param {Map} params.timeline Map with the historic changes of the cash available in the portfolio.
	 * @returns {Map} Map with the cash history added
	 */
	addCashBalanceHistory({
		dateMap,
		timeline,
	}: {
		dateMap: Map<string, PortfolioBalance>
		timeline: Map<string, { cashAvailable?: number }>
	}) {
		timeline.forEach(({ cashAvailable }, key) => {
			if (cashAvailable) {
				dateMap.set(key, { ...dateMap.get(key), cashAvailable })
			}
		})

		// Generate the cashAvailable for each day:
		let cashAvailable = this.startCapital

		dateMap.forEach((value, key) => {
			if (value.cashAvailable) {
				cashAvailable = value.cashAvailable
			} else {
				value.cashAvailable = cashAvailable
			}
			let total = value.total || 0

			total += cashAvailable

			value.total = total
			dateMap.set(key, value)
		})

		return dateMap
	}

	/**
	 * Loop over the grouped trades and generate tasks (that are functions to be called in the queue)
	 * @param {Map<Trade>} groupedTrades Array of trades, grouped by stock ID
	 * @param {DataFetcher} client DataFetcher instance
	 * @returns {Array<Function>} Functions to be called in the queue to make sure not all runs at the same time.
	 */
	createTasks(groupedTrades: Map<number | string, Trade[]>, client: DataFetcher) {
		return [...groupedTrades.entries()].map(([id, tradesInStock]) => {
			return async () => {
				// Get the price data
				const { priceData } = await client.fetchStock({
					id,
					fieldString: 'priceData{ date, close }',
				})
				const output = {
					tradeGroup: tradesInStock.map((trade) => trade.getTradePerformance({ priceData })),
					id,
				}

				return output
			}
		})
	}

	/**
	 * Generates the portfolio history over time and keeping track of the performance, how many stocks were held on each day etc.
	 * @param {object} params
	 * @param {Array<Trade>} params.trades The historical trades from the backtest
	 * @param {Map} params.timeline the existing timeline for the portfolio. Just with cashAvailable set on input
	 * @param {Trade} params.firstTrade The first trade of the backtest. Used for getting the price data from the correct date.
	 * @param {Function} params.queue Helper function to queue work
	 * @param {DataFetcher} params.DataFetcher Class to fetch data
	 * @returns {Map} the portfolio history over time
	 */
	async generateTimeline({
		trades = this.historicalTrades as Trade[],
		timeline = this.timeline as Map<string, PortfolioBalance>,
		queue = this.#queue,
		client = this.#dataFetcher,
	} = {}) {
		const dateMap = await this.getDateMap()

		// Group the stocks by id to only have to fetch the data once more.
		const groupedTrades = this.groupTradesByStock(trades)
		const tasks = this.createTasks(groupedTrades, client)
		const finishedTasks = await queue(tasks, 10)

		finishedTasks.forEach((t) => {
			//! Note that this could be either a group of trades or error instance
			if (t instanceof Error) {
				console.error(t)
				return
			}

			t.tradeGroup.forEach((trade) => {
				trade.forEach(({ date, value }) => {
					const d = date instanceof Date ? date : new Date(date)
					this.checkAndAddValues(d, value, dateMap, t.id)
				})
			})
		})

		const sortedMap = this.sortByDate(dateMap)
		this.addCashBalanceHistory({ dateMap: sortedMap, timeline })

		this.timeline = sortedMap // TODO: Fix unnecessary with both return and assignment
		return sortedMap
	}

	sortByDate(dateMap: Map<string, any>) {
		const keys = [...dateMap.keys()].sort((a, b) => (new Date(a) > new Date(b) ? 1 : 0))
		const output = new Map()

		keys.forEach((key) => output.set(key, dateMap.get(key)))
		return output
	}

	/**
	 * Adds the data about the trade to the particular date.
	 * @param {Date} date the date to add the data to
	 * @param {number} value The position value on this particular date
	 * @param {Map} dateMap The map to add the data to
	 * @param {object|null} previousValue The previous value to use if none already exist
	 * @returns {object} The data added to this date to be carried into the next.
	 */
	checkAndAddValues(
		date: Date,
		value: number,
		dateMap: Map<string, PortfolioBalance>,
		id: number | string
	) {
		const tempData = dateMap.get(date.toISOString())
		const hasNoData =
			!tempData || (typeof tempData === 'object' && Object.keys(tempData).length < 1)

		const existingData = hasNoData
			? {
					total: 0,
					totalPositionValue: 0,
					numberOfPositionsOpen: 0,
					positions: [],
			  }
			: tempData

		existingData.positions.push({ id, value })
		existingData.totalPositionValue += value
		existingData.numberOfPositionsOpen += 1
		existingData.total += value

		// Write the new data back to the map
		dateMap.set(date.toISOString(), existingData)
		return existingData
	}

	/**
	 * Groups a bunch of trades based on the stocks's ID.
	 * This allows us to add all the data about the trades in that particular stock
	 * in one go and only need to hit the API one extra time for each stock.
	 *
	 * @param {Array<Trade>} trades The trades to group
	 * @returns {Map} The trades with the stock id as key
	 */
	groupTradesByStock(trades: Trade[]) {
		const stockMap = new Map()

		trades.forEach((trade) => {
			const existingTrades = stockMap.get(trade.stock.id)
			existingTrades
				? stockMap.set(trade.stock.id, [...existingTrades, trade])
				: stockMap.set(trade.stock.id, [trade])
		})

		return stockMap
	}

	/**
	 * Generates a map with all the dates since the first trade was taken.
	 * It has empty objects as values.
	 * @param {object} deps dependencies
	 */
	async getDateMap({ dataFetcher = this.#dataFetcher } = {}): Promise<
		Map<string, PortfolioBalance>
	> {
		const stock = await dataFetcher.fetchStock({
			id: 19002,
			fieldString: 'priceData{ date }',
		})

		if (!stock) {
			return null
		}

		const m = new Map<string, any>()

		stock.priceData.forEach(({ date }) => {
			const d = date instanceof Date ? date.toISOString() : date
			m.set(d, {})
		})

		return m
	}

	/**
	 * Helper function to map signals to their respective dates.
	 * This is currently making the Map 2x the size from the Trade array,
	 * this maybe should be changed to a reference later.
	 *
	 * @todo Refactor to use reference instead?
	 * @param {Array<Trade>} trades
	 * @param {Trade} Trade The trade class
	 * @returns {Map} The trades grouped by dates
	 */
	generateSignalMaps(trades: Trade[], Trade = this.#Trade) {
		const signalMap = new Map()

		/**
		 * Assigns the trade to the date in the Map.
		 * @param {Trade} trade Trade instance
		 * @param {string} type the signal type
		 * @param {Date} date Date of the signal
		 * @returns {void}
		 */
		const getAndPush = (trade: Trade, type: 'entry' | 'exit', date: Date) => {
			if (signalMap.has(date.toISOString())) {
				const signals = signalMap.get(date.toISOString())
				signals[type].push(trade)
				signalMap.set(date.toISOString(), signals)
			} else {
				const signals = {
					entry: [] as Trade[],
					exit: [] as Trade[], // TODO The exit may not be used so maybe remove it and only assign an empty object if type is exit?
				}

				signals[type].push(trade)
				signalMap.set(date.toISOString(), signals)
			}
		}

		trades.forEach((t) => {
			const trade = t instanceof Trade ? t : new Trade(t)
			// Add the trades to the Map
			getAndPush(trade, 'entry', trade.entryDate)
			getAndPush(trade, 'exit', trade.exitDate)
		})

		const sortedSignalArr = [...signalMap.entries()].sort(([first], [second]) =>
			new Date(first) < new Date(second) ? -1 : 1
		)

		return new Map(sortedSignalArr)
	}
}

export default Portfolio
