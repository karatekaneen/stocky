import Flipper from './models/strategies/Flipper'
import DataFetcher from './utils/DataFetcher'
import { BacktestResult } from './types'
import DBWrapper from './utils/DBWrapper'
import { config } from 'dotenv'
import queue from './utils/queue'
import Signal from './models/Signal'
import Stock from './models/Stock'

config()

const run = async (): Promise<void> => {
	const flipper = new Flipper()
	const df = new DataFetcher()
	const db = new DBWrapper()

	const stocks = await df.fetchStocks({ fieldString: 'id, name, list' })

	const pendingSignals = await queue<Signal | null>(
		stocks.map((stock: Stock) => {
			return async () => {
				console.log('Testing: ', stock.name)
				const { context, pendingSignal, signals }: BacktestResult = await flipper.test({
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

	console.log(pendingSignals.filter(Boolean))
}

run()
