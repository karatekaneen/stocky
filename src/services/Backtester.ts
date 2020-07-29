import { BacktestResult, TestParameters } from '../types'
import DataFetcher from '../utils/DataFetcher'
import DBWrapper from '../utils/DBWrapper'
import queue from '../utils/queue'
import Signal from '../models/Signal'
import Stock from '../models/Stock'

interface IStrategy {
	test: (t: TestParameters) => Promise<BacktestResult>
}

export default class Backtester {
	public strategy: IStrategy
	public concurrentTests: number

	#dataFetcher: DataFetcher
	#db: DBWrapper
	#queue: typeof queue

	constructor(
		strategy: IStrategy,
		{
			_DataFetcher = DataFetcher,
			_DBWrapper = DBWrapper,
			_queue = queue,
			concurrentTests = 8,
		} = {}
	) {
		this.strategy = strategy
		this.concurrentTests = concurrentTests

		this.#queue = _queue

		this.#dataFetcher = new _DataFetcher()
		this.#db = new _DBWrapper()
	}

	public async run({
		dataFetcher = this.#dataFetcher,
		db = this.#db,
		queue = this.#queue,
		strategy = this.strategy,
	} = {}): Promise<void> {
		const stocks = await dataFetcher.fetchStocks({ fieldString: 'id, name, list' })

		await db.clearPendingSignals()

		await queue<Signal | null>(
			stocks.map((stock: Stock) => {
				return async () => {
					console.log('Testing: ', stock.name)
					const { context, pendingSignal, signals }: BacktestResult = await strategy.test({
						stock,
					})
					const id = stock.id

					await Promise.all([
						db.saveSignals(id, signals),
						db.savePendingSignal(id, pendingSignal),
						db.saveContext(id, context),
					])

					return pendingSignal
				}
			}),
			8
		)
	}
}
