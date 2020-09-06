import Trade from '../models/Trade'
import { PricePoint, VolumeComparison } from 'src/types'
import TechnicalAnalyst from './TechnicalAnalyst'

export default class Analyzer {
	constructor() {}

	static resultToVolume(
		trades: Trade[],
		priceData: PricePoint[],
		lookback = 200,
		{ technicalAnalyst = new TechnicalAnalyst() } = {}
	): VolumeComparison[] {
		const withCashVolume = priceData.map((p) => {
			p.volume = ((p.open + p.close + p.high + p.low + p.close) / 5) * p.volume
			return p
		})

		const volumeMap = technicalAnalyst.movingAverage({
			data: withCashVolume,
			field: 'volume',
			lookback,
			includeField: false,
			type: 'SMA',
		})

		// console.log(volumeMap)
		return trades.map((t) => ({
			result: t.resultPercent,
			volume: volumeMap.get(t.entryDate.toISOString())?.average,
		}))
	}

	static async mergeVolumeComparisons(comparisons: VolumeComparison[][]): Promise<void> {
		const all = comparisons.flat().filter((c) => c.result && c.volume)

		console.log(all)
	}
}
