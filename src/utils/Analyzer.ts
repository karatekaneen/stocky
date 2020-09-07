import Trade from '../models/Trade'
import { PricePoint, VolumeComparison } from 'src/types'
import TechnicalAnalyst from './TechnicalAnalyst'
import DBWrapper from './DBWrapper'

export default class Analyzer {
	constructor() {}

	/**
	 * Creates a comparison between the $ traded over `lookback` days (from the entry)
	 * compared with the result.
	 * @param trades Trades ffrom a specific stock
	 * @param priceData Pricedata for that specific stock
	 * @param lookback The period to get the average from
	 * @param deps to be injected for testing
	 * @returns Array with the `result` and `volume`
	 */
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

	/**
	 * Saves the volume comparisons to the database.
	 * @param comparisons The data to save to the database
	 * @param Deps to be injected for testing
	 */
	static async mergeAndSaveVolumeComparisons(
		comparisons: VolumeComparison[][],
		{ db = new DBWrapper() } = {}
	): Promise<void> {
		const cleanData = comparisons
			.flat()
			.filter((c) => c.result && c.volume)
			.sort((a, b) => a.volume - b.volume)

		await db.saveStats(
			'volume-to-result',
			'result compared to volume traded',
			'The 200d average traded volume compared to the result of each trade',
			cleanData
		)
	}
}
