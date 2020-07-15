import Stock from '../models/Stock'
import Signal from 'src/models/Signal'

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
	type: 'enter' | 'exit'
	/**
	 * Pending or already executed order?
	 */
	status: 'pending' | 'executed'
	/**
	 * The stock which the order belongs to
	 */
	stock: Stock
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
