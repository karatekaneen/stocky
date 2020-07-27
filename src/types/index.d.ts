import Stock from '../models/Stock'
import Signal from '../models/Signal'
import Trade from '../models/Trade'

export type PricePointFields = 'open' | 'close' | 'high' | 'low' | 'volume' | 'owners'

export type PricePoint = {
	time?: string | number
	date?: Date | string
	open?: number
	high?: number
	low?: number
	close?: number
	volume?: number
	owners?: number
}

export type SignalType = 'enter' | 'exit'

export type SignalParams = {
	/**
	 * The price where the signal was executed
	 */
	price: number
	/**
	 * Date when the signal was executed
	 */
	date: Date | null | string
	/**
	 * If it is a buy or sell order
	 */
	action: 'buy' | 'sell'
	/**
	 * If it was entry or exit from the market
	 */
	type: SignalType
	/**
	 * Pending or already executed order?
	 */
	status: 'pending' | 'executed'
	/**
	 * The stock which the order belongs to
	 */
	stock: Stock
}

export type TradeDailyPerformance = {
	value: number
	date: Date | string
}

export type BacktestResult = {
	/**
	 * All the signals that the test generated
	 */
	signals: Signal[]
	/**
	 * The context as it was on the last bar // FIXME: Add context for the pending bar
	 */
	context: StrategyContext
	/**
	 * If a signal was created on the last day as the test ended it is marked as pending.
	 * Useful for live trading to know what to execute the day after.
	 */
	pendingSignal: null | Signal
	/**
	 * The trades that the test generated.
	 */
	trades: Trade[]
	/**
	 * If a position was open when the test ended, this sis the signal that was generated to close the open position.
	 * Useful to display open profit but mainly used to calculate the last trade.
	 */
	closeOpenPosition: Signal | null
	/**
	 * If there was an open position when the test ended, this summarizes the open profit etc. Depending on the openPositionPolicy in the Strategy it is either calculated on the last close or the "stop" price.
	 *  It is also included as the last item in the `trades` prop.
	 */
	openTrade: Trade | null
}

export type StrategyRules = {
	regimeSecurityID: string | number
	regimeType: string
	regimeLookback: number
	regimeOperator: Comparator
	entryFactor: number
	exitFactor: number
	bearishRegimeExitFactor: number
	entryInBearishRegime: boolean
}

export type Comparator = '==' | '<=' | '>='

export type StrategyContext = {
	triggerPrice?: number
	bias?: Bias
	highPrice: number
	lowPrice: number
	regime: Bias
	lastSignal?: Signal
}

export type Bias = 'bull' | 'bear' | 'neutral'
