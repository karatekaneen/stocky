import Trade from '../models/Trade'
import { PricePoint, ResultStatistic, VolumeComparison } from '../types'
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
	 * @returns Array with the `result` and `value`
	 */
	static resultToVolume(
		trades: Trade[],
		priceData: PricePoint[],
		lookback = 200,
		{ technicalAnalyst = new TechnicalAnalyst() } = {}
	): ResultStatistic[] {
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

		return trades.map((t) => ({
			result: t.resultPercent,
			value: volumeMap.get(t.entryDate.toISOString())?.average,
		}))
	}

	/**
	 * Creates a comparison between the $ traded over `firstLookback` days (from the entry)
	 * divided by the volume over the `shortLookback` days compared with the result.
	 * @param trades Trades ffrom a specific stock
	 * @param priceData Pricedata for that specific stock
	 * @param firstLookback the first lookback period length
	 * @param secondLookback The second lookback period length
	 * @param deps to be injected for testing
	 * @returns Array with the `result` and `value`
	 */
	static resultToVolumeRatio(
		trades: Trade[],
		priceData: PricePoint[],
		firstLookback = 50,
		secondLookback = 200,
		{ technicalAnalyst = new TechnicalAnalyst() } = {}
	): ResultStatistic[] {
		const withCashVolume = priceData.map((p) => {
			p.volume = ((p.open + p.close + p.high + p.low + p.close) / 5) * p.volume
			return p
		})

		const firstMap = technicalAnalyst.movingAverage({
			data: withCashVolume,
			field: 'volume',
			lookback: firstLookback,
			includeField: false,
			type: 'SMA',
		})

		const secondMap = technicalAnalyst.movingAverage({
			data: withCashVolume,
			field: 'volume',
			lookback: secondLookback,
			includeField: false,
			type: 'SMA',
		})

		return trades.map((t) => {
			const first = firstMap.get(t.entryDate.toISOString())?.average
			const second = secondMap.get(t.entryDate.toISOString())?.average

			const value = first && second ? first / second : null
			return {
				result: t.resultPercent,
				value,
			}
		})
	}

	/**
	 * Saves the volume comparisons to the database.
	 * @param comparisons The data to save to the database
	 * @param Deps to be injected for testing
	 */
	static async mergeAndSaveVolumeComparisons(
		comparisons: ResultStatistic[][],
		documentName: string,
		name: string,
		description: string,
		{ db = new DBWrapper() } = {}
	): Promise<void> {
		const cleanData = comparisons
			.flat()
			.filter((c) => c.result && c.value)
			.sort((a, b) => a.value - b.value)

		await db.saveStats(documentName, name, description, cleanData)
	}
}
