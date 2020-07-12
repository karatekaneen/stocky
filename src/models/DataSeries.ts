type ChartType = 'line' | 'candlestick' | 'area'
type CandlestickDataPoint = {
	time: string | number
	open: number | null
	high: number | null
	low: number | null
	close: number | null
}

type LineChartDataPoint = {
	time: string | number
	value: number | null
}

export default class DataSeries {
	public name: string
	public type: ChartType
	public data: (CandlestickDataPoint | LineChartDataPoint)[]

	constructor({
		name,
		type,
		data,
	}: {
		id?: string
		name?: string
		type: ChartType
		data: (CandlestickDataPoint | LineChartDataPoint)[]
	}) {
		if (!name || !type || !data) throw new Error('Name, type and data is required')
		else {
			this.name = name // Name to display
			this.type = type // Line/chart/area etc
			this.data = this.validateData(data, type)
		}
	}

	validateData(data: (CandlestickDataPoint | LineChartDataPoint)[], type: ChartType) {
		if (data.length < 1 || !Array.isArray(data)) {
			throw new Error('At least 1 datapoint must be provided')
		}

		if (type === 'line') {
			if (this.validateLineChartData(data as LineChartDataPoint[])) {
				return data
			} else {
				throw new Error('Invalid data format for line chart')
			}
		} else if (type === 'candlestick') {
			if (this.validateCandleStickData(data as CandlestickDataPoint[])) {
				return data
			} else {
				throw new Error('Invalid data format for candlestick chart')
			}
		} else if (type === 'area') {
			if (this.validateLineChartData(data as LineChartDataPoint[])) {
				return data
			} else {
				throw new Error('Invalid data format for area chart')
			}
		} else {
			throw new Error('Unknown chart type')
		}
	}

	validateCandleStickData(data: CandlestickDataPoint[]): boolean {
		return data.every(({ time, open, high, low, close }) => {
			const allIsNull = [open, high, low, close].every((p) => p === null)
			const allIsNumbers = [open, high, low, close].every(
				(p) => typeof p === 'number' && !isNaN(p)
			)

			return time && (allIsNull || allIsNumbers)
		})
	}

	validateLineChartData(data: LineChartDataPoint[]): boolean {
		return data.every(
			({ time, value }) =>
				time && ((typeof value === 'number' && !isNaN(value)) || value === null)
		)
	}
}
