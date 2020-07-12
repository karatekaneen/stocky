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
