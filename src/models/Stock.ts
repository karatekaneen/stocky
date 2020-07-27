import DataSeries from './DataSeries'
import { PricePointFields, PricePoint } from '../types'

export type StockParams = {
	id?: string | number | null
	name?: string | null
	list?: string | null
	linkName?: string | null
	lastPricePoint?: PricePoint
	priceData?: PricePoint[]
}

export default class Stock {
	#DataSeries: typeof DataSeries

	public id: string | number | null
	public name: string | null
	public list: string | null
	public linkName: string | null
	public priceData: PricePoint[] | null
	public lastPricePoint: PricePoint | null
	public dataSeries: DataSeries[]

	constructor(data: StockParams, { _DataSeries = DataSeries } = {}) {
		this.#DataSeries = _DataSeries

		// Assign data:
		const { id, name, list, priceData, lastPricePoint, linkName } = data
		this.id = id || null
		this.name = name || null
		this.list = list || null
		this.lastPricePoint = lastPricePoint || null
		this.linkName = linkName || null

		if (priceData) {
			if (priceData[0].hasOwnProperty('time') && priceData[0].date instanceof Date) {
				this.priceData = priceData
			} else {
				this.priceData = this.dateToTime(priceData)
			}
		} else {
			this.priceData = null
		}

		this.dataSeries = []
	}

	createCandlestickSeries(): DataSeries {
		const data = this.priceData.map((p) => ({
			time: p.time,
			open: p.open,
			high: p.high,
			low: p.low,
			close: p.close,
		}))

		const d = new this.#DataSeries({ name: `${this.name} Price`, type: 'candlestick', data })
		this.dataSeries.push(d)
		return d
	}

	createLineSeries(field: PricePointFields = 'close'): DataSeries {
		if (!this.priceData) {
			console.warn('Creating line series requires priceData')
			return null
		}

		const okFields = ['open', 'close', 'high', 'low', 'volume', 'owners']
		if (!okFields.includes(field)) {
			throw new Error('field has to be "open", "close", "high", "low", "volume" or "owners"')
		}

		const data = this.priceData.map((p) => ({
			time: p.time,
			value: p[field],
		}))

		const d = new this.#DataSeries({
			name: `${this.name} ${field}`,
			type: 'line',
			data,
		})

		this.dataSeries.push(d)
		return d
	}

	/**
	 *  Save the date under the prop `time` with the format yyyy-mm-dd to be able to pass it directly to chart
	 * @param {Array<Object>} priceData The OHLCV+ date data from the API
	 * @returns {Array<Object>} the original array with the `time` property added with date in `YYYY-MM-DD`
	 */
	dateToTime(priceData: PricePoint[]) {
		return priceData.map((pricePoint) => {
			if (!pricePoint.date) {
				throw new Error('Date is required')
			}

			const d = new Date(pricePoint.date)

			// Helper function to always get two-digit month and days, i.e. 01 instead of 1 for january.
			const pad = (num: number) => (num < 10 ? num.toString().padStart(2, '0') : num.toString())

			const month = pad(d.getMonth() + 1)
			const date = pad(d.getDate())
			pricePoint.time = `${d.getFullYear()}-${month}-${date}`
			pricePoint.date = d

			return pricePoint
		})
	}

	public toJSON() {
		return { ...this }
	}
}
