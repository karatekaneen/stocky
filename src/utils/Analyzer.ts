import Trade from '../models/Trade'
import { PricePoint, VolumeComparison } from 'src/types'
import TechnicalAnalyst from './TechnicalAnalyst'

export default class Analyzer {
	constructor() {}

	static resultToVolume(
		trades: Trade[],
		priceData: PricePoint[],
		period = [200, 20]
	): VolumeComparison[] {
		const withCashVolume = priceData.map((p) => {
			p.volume = ((p.open + p.close + p.high + p.low + p.close) / 5) * p.volume
			return p
		})

		const volume200 = new TechnicalAnalyst().movingAverage({
			data: withCashVolume,
			field: 'volume',
			lookback: 200,
			includeField: false,
			type: 'SMA',
		})

		return trades.map((t) => ({
			result: t.resultPercent,
			volume: volume200.get(t.entryDate.toISOString()).average,
		}))
	}

	static async mergeVolumeComparisons(comparisons: VolumeComparison[][]): Promise<void> {
		const all = comparisons.flat().filter((c) => c.result && c.volume)

		console.log(all)
	}
}
