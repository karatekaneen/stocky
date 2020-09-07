import { BacktestResult, TestParameters, VolumeComparison } from '../types'
import DataFetcher from '../utils/DataFetcher'
import DBWrapper from '../utils/DBWrapper'
import queue from '../utils/queue'
import Signal from '../models/Signal'
import Stock from '../models/Stock'
import Analyzer from '../utils/Analyzer'

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
	} = {}): Promise<
		{
			pendingSignal: Signal
			volumeComparison: VolumeComparison[]
		}[]
	> {
		const stocks = await dataFetcher.fetchStocks({ fieldString: 'id, name, list' })
		await db.clearPendingSignals()

		const responses = await queue<{
			pendingSignal: Signal
			volumeComparison: VolumeComparison[]
		} | null>(
			stocks.map((stock: Stock) => {
				return async () => {
					console.log('Testing: ', stock.name)
					const {
						context,
						pendingSignal,
						signals,
						trades,
						priceData,
					}: BacktestResult = await strategy.test({
						stock,
					})
					const id = stock.id

					const volumeComparison = Analyzer.resultToVolume(trades, priceData)

					await Promise.all([
						db.saveSignals(id, signals),
						db.savePendingSignal(id, pendingSignal),
						db.saveContext(id, context),
					])

					return { pendingSignal, volumeComparison }
				}
			}),
			8
		)

		return responses.filter((r) => r instanceof Error === false) as {
			pendingSignal: Signal
			volumeComparison: VolumeComparison[]
		}[]
	}
}
