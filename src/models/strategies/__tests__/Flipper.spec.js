import Flipper from '../Flipper'
import Signal from '../../Signal'
import DataFetcher from '../../../backendModules/DataFetcher'
jest.mock('../../../backendModules/DataFetcher')
jest.mock('../../Signal')

describe('Flipper Strategy', () => {
	let f
	beforeEach(() => {
		Signal.mockClear()
		DataFetcher.mockClear()

		f = new Flipper()
	})
	it('Has a working constructor', () => {
		expect(f instanceof Flipper).toBe(true)
	})

	it('Uses default rules if none provided', () => {
		expect(f.rules.entryFactor).toBe(1.2)
		expect(f.rules.entryInBearishRegime).toBe(false)
	})

	it('Can override single rule in constructor', () => {
		const f = new Flipper({ rules: { entryFactor: 1 } })

		expect(f.rules.entryFactor).toBe(1)
		expect(f.rules.entryInBearishRegime).toBe(false)
	})

	it('Uses default context if none is provided', () => {
		expect(f.context.bias).toBe('neutral')
		expect(f.context.regime).toBe(null)
	})

	it('Can overwrite single context property in constructor', () => {
		const f = new Flipper({ initialContext: { bias: 'bull' } })

		expect(f.context.bias).toBe('bull')
		expect(f.context.regime).toBe(null)
	})

	it('Calls to create regimeFilter', async () => {
		DataFetcher.mockImplementationOnce(() => {
			return {
				fetchStock: jest.fn().mockResolvedValue({})
			}
		})

		f.createRegimeFilter = jest.fn()
		f.extractData = jest.fn().mockReturnValue({ startIndex: 2, endIndex: 4 })
		await f.test({
			stock: { priceData: [] },
			dataFetcher: { fetchStock: jest.fn().mockResolvedValue({ priceData: [] }) }
		})

		expect(f.createRegimeFilter).toHaveBeenCalledWith({
			id: f.rules.regimeSecurityID,
			lookback: f.rules.regimeLookback,
			operator: f.rules.regimeOperator,
			type: f.rules.regimeType
		})
	})

	describe('Process Bar', () => {
		it('Calls to update high & low prices', () => {
			f.setHighLowPrices = jest.fn().mockReturnValue({ highPrice: 200, lowPrice: 100 })
			f.updateRegime = jest.fn().mockReturnValue('bull')
			f.checkForTrigger = jest.fn().mockReturnValue({ signal: null, bias: 'bull' })

			const resp = f.processBar({
				signalBar: { a: 'this is my signal' },
				currentBar: { b: 'this is my current bar' },
				stock: { name: 'STONK' },
				context: { highPrice: 2, lowPrice: 1 }
			})

			expect(f.setHighLowPrices).toHaveBeenCalledWith({
				highPrice: 2,
				lowPrice: 1,
				signalBar: { a: 'this is my signal' }
			})
		})

		it('Calls to update regime', () => {
			f.setHighLowPrices = jest.fn().mockReturnValue({ highPrice: 200, lowPrice: 100 })
			f.updateRegime = jest.fn().mockReturnValue('bull')
			f.checkForTrigger = jest.fn().mockReturnValue({ signal: null, bias: 'bull' })

			const resp = f.processBar({
				signalBar: { a: 'this is my signal' },
				currentBar: { b: 'this is my current bar' },
				stock: { name: 'STONK' },
				context: { highPrice: 2, lowPrice: 1 }
			})

			expect(f.updateRegime).toHaveBeenCalled()
		})

		it('Checks if signal should be sent', () => {
			f.setHighLowPrices = jest.fn().mockReturnValue({ highPrice: 200, lowPrice: 100 })
			f.updateRegime = jest.fn().mockReturnValue('bull')
			f.checkForTrigger = jest.fn().mockReturnValue({ signal: null, bias: 'bull' })

			const resp = f.processBar({
				signalBar: { a: 'this is my signal' },
				currentBar: { b: 'this is my current bar' },
				stock: { name: 'STONK' },
				context: { highPrice: 2, lowPrice: 1, bias: 'bear' }
			})

			expect(f.checkForTrigger).toHaveBeenCalledWith({
				currentBar: { b: 'this is my current bar' },
				currentBias: 'bear',
				highPrice: 200,
				regime: 'bull',
				lastSignal: undefined,
				lowPrice: 100,
				signalBar: { a: 'this is my signal' },
				stock: { name: 'STONK' }
			})
		})

		it('Returns bias from checkForTrigger', () => {
			f.setHighLowPrices = jest.fn().mockReturnValue({ highPrice: 200, lowPrice: 100 })
			f.updateRegime = jest.fn().mockReturnValue('bull')
			f.checkForTrigger = jest.fn().mockReturnValue({ signal: null, context: { bias: 'bull' } })

			const resp = f.processBar({
				signalBar: { a: 'this is my signal' },
				currentBar: { b: 'this is my current bar' },
				stock: { name: 'STONK' },
				context: { highPrice: 2, lowPrice: 1, bias: 'bear' }
			})

			expect(resp.context.bias).toBe('bull')
		})

		it('Adds new triggerPrice to context', () => {
			f.setHighLowPrices = jest.fn().mockReturnValue({ highPrice: 200, lowPrice: 100 })
			f.updateRegime = jest.fn().mockReturnValue('bull')
			f.checkForTrigger = jest
				.fn()
				.mockReturnValue({ signal: null, context: { bias: 'bull', triggerPrice: 11000000 } })

			const resp = f.processBar({
				signalBar: { a: 'this is my signal' },
				currentBar: { b: 'this is my current bar' },
				stock: { name: 'STONK' },
				context: { highPrice: 2, lowPrice: 1, bias: 'bear', triggerPrice: 25 }
			})

			expect(resp.context.triggerPrice).toBe(11000000)
		})

		it('Returns updated context', () => {
			f.setHighLowPrices = jest.fn().mockReturnValue({ highPrice: 200, lowPrice: 100 })
			f.updateRegime = jest.fn().mockReturnValue('bull')
			f.checkForTrigger = jest.fn().mockReturnValue({ signal: null, context: { bias: 'bull' } })

			const resp = f.processBar({
				signalBar: { a: 'this is my signal' },
				currentBar: { b: 'this is my current bar' },
				stock: { name: 'STONK' },
				context: { highPrice: 2, lowPrice: 1, bias: 'bear' }
			})

			expect(resp.context).toEqual({
				bias: 'bull',
				highPrice: 200,
				lowPrice: 100,
				regime: 'bull'
			})
		})

		it('Returns signal as null if none is triggered', () => {
			f.setHighLowPrices = jest.fn().mockReturnValue({ highPrice: 200, lowPrice: 100 })
			f.updateRegime = jest.fn().mockReturnValue('bull')
			f.checkForTrigger = jest.fn().mockReturnValue({ signal: null, bias: 'bull' })

			const resp = f.processBar({
				signalBar: { a: 'this is my signal' },
				currentBar: { b: 'this is my current bar' },
				stock: { name: 'STONK' },
				context: { highPrice: 2, lowPrice: 1, bias: 'bear' }
			})

			expect(resp.signal).toBe(null)
		})

		it('Returns signal if it should', () => {
			f.setHighLowPrices = jest.fn().mockReturnValue({ highPrice: 200, lowPrice: 100 })
			f.updateRegime = jest.fn().mockReturnValue('bull')
			f.checkForTrigger = jest
				.fn()
				.mockReturnValue({ signal: { type: 'BUY EVERYTHING' }, bias: 'bull' })

			const resp = f.processBar({
				signalBar: { a: 'this is my signal' },
				currentBar: { b: 'this is my current bar' },
				stock: { name: 'STONK' },
				context: { highPrice: 2, lowPrice: 1, bias: 'bear' }
			})

			expect(resp.signal.type).toBe('BUY EVERYTHING')
		})

		it.todo(
			'Can create a "pending signal" on the last bar before the next one has opened. Useful for live trading.'
		)

		it.todo('can update high/low price based on the triggering')
	})

	describe('Set high / low prices', () => {
		it('Updates high if current close is higher than highPrice && not using high', () => {
			const signalBar = {
				open: 100,
				high: 200,
				low: 100,
				close: 110
			}
			const resp = f.setHighLowPrices({ highPrice: 100, lowPrice: 90, signalBar })

			expect(resp).toEqual({ highPrice: 110, lowPrice: 90 })
		})

		it('Does not update highPrice if current is lower', () => {
			const signalBar = {
				open: 100,
				high: 200,
				low: 100,
				close: 110
			}
			const resp = f.setHighLowPrices({ highPrice: 120, lowPrice: 90, signalBar })

			expect(resp).toEqual({ highPrice: 120, lowPrice: 90 })
		})

		it('Updates high if current high is higher than highPrice && using high', () => {
			const signalBar = {
				open: 100,
				high: 200,
				low: 100,
				close: 110
			}
			const resp = f.setHighLowPrices({
				highPrice: 100,
				lowPrice: 90,
				signalBar,
				useHighAndLow: true
			})

			expect(resp).toEqual({ highPrice: 200, lowPrice: 90 })
		})

		it('Sets the highPrice to current close if highPrice is null && not using high', () => {
			const signalBar = {
				open: 100,
				high: 200,
				low: 100,
				close: 123
			}
			const resp = f.setHighLowPrices({ highPrice: null, lowPrice: 90, signalBar })

			expect(resp).toEqual({ highPrice: 123, lowPrice: 90 })
		})

		it('Sets the highPrice to current close if highPrice is null && not using high', () => {
			const signalBar = {
				open: 100,
				high: 200,
				low: 100,
				close: 123
			}
			const resp = f.setHighLowPrices({
				highPrice: null,
				lowPrice: 90,
				signalBar,
				useHighAndLow: true
			})

			expect(resp).toEqual({ highPrice: 200, lowPrice: 90 })
		})

		// Low
		it('Updates low if current close is lower than lowPrice && not using low', () => {
			const signalBar = {
				open: 100,
				high: 100,
				low: 100,
				close: 80
			}
			const resp = f.setHighLowPrices({ highPrice: 100, lowPrice: 90, signalBar })

			expect(resp).toEqual({ highPrice: 100, lowPrice: 80 })
		})

		it('Does not update lowPrice if current is higher', () => {
			const signalBar = {
				open: 100,
				high: 100,
				low: 100,
				close: 100
			}
			const resp = f.setHighLowPrices({ highPrice: 100, lowPrice: 90, signalBar })

			expect(resp).toEqual({ highPrice: 100, lowPrice: 90 })
		})

		it('Updates low if current low is lower than lowPrice && using low', () => {
			const signalBar = {
				open: 100,
				high: 100,
				low: 70,
				close: 80
			}
			const resp = f.setHighLowPrices({
				highPrice: 100,
				lowPrice: 90,
				signalBar,
				useHighAndLow: true
			})

			expect(resp).toEqual({ highPrice: 100, lowPrice: 70 })
		})

		it('Sets the lowPrice to current close if lowPrice is null && not using low', () => {
			const signalBar = {
				open: 100,
				high: 100,
				low: 100,
				close: 90
			}
			const resp = f.setHighLowPrices({ highPrice: 100, lowPrice: null, signalBar })

			expect(resp).toEqual({ highPrice: 100, lowPrice: 90 })
		})

		it('Sets the lowPrice to current close if lowPrice is null && not using low', () => {
			const signalBar = {
				open: 100,
				high: 100,
				low: 70,
				close: 80
			}
			const resp = f.setHighLowPrices({
				highPrice: 100,
				lowPrice: null,
				signalBar,
				useHighAndLow: true
			})

			expect(resp).toEqual({ highPrice: 100, lowPrice: 70 })
		})
	})

	describe('check for trigger', () => {
		it.todo('Should be able to generate pending signals for live trading')
		it('Creates ranking factor and passes it in to Signal', () => {
			expect(1).toBe(2)
		})

		describe('Bear/Neutral initial bias', () => {
			it('Sets bias to bull if long entry triggered when bias is bearish', () => {
				const { context } = f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					signalBar: { close: 120 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.bias).toBe('bull')
			})

			it('Does not change bias from bear to bull without trigger', () => {
				const { context } = f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					signalBar: { close: 119.9999 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.bias).toBe('bear')
			})

			it('Sets bias to bull if long entry triggered when bias is neutral', () => {
				const { context } = f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					signalBar: { close: 120 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.bias).toBe('bull')
			})

			it('Resets high price when getting long entry trigger', () => {
				const { context } = f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					signalBar: { close: 120 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.highPrice).toBe(120)
			})

			it('Sets triggerPrice to stop-loss level when getting long entry trigger', () => {
				const { context } = f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					signalBar: { close: 120 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.triggerPrice).toBe(100)
			})

			it('Generates Signal instance if long entry trigger', () => {
				f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					regime: 'bull',
					signalBar: { close: 120 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(Signal).toHaveBeenCalledTimes(1)
			})

			it('Creates Signal instance with the data from the day after', () => {
				f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					regime: 'bull',
					signalBar: { close: 120, open: 100, date: new Date('2019-12-12') },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13'),
						close: 200
					}
				})

				const { date, price } = Signal.mock.calls[0][0]
				expect(date).toEqual(new Date('2019-12-13'))
				expect(price).toBe(125)
			})

			it('returns Signal instance if created', () => {
				const { signal } = f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					regime: 'bull',
					signalBar: { close: 120 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(signal instanceof Signal).toBe(true)
			})

			it('sets triggerPrice even if no long entry signal is triggered', () => {
				const { context } = f.checkForTrigger({
					highPrice: 200,
					lowPrice: 100,
					currentBias: 'bear',
					regime: 'bull',
					signalBar: { close: 108 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.triggerPrice).toBe(120)
			})

			it.todo('Should check regime before entering')
		})

		describe('Bull initial bias', () => {
			it('Sets bias to bear if long exit triggered when bias is bullish', () => {
				const { context } = f.checkForTrigger({
					highPrice: 100,
					lowPrice: 50,
					currentBias: 'bull',
					regime: 'bull',
					signalBar: { close: 80 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.bias).toBe('bear')
			})

			it('Does not change bias from bear to bull without trigger', () => {
				const { context } = f.checkForTrigger({
					highPrice: 120,
					lowPrice: 50,
					regime: 'bull',
					currentBias: 'bull',
					signalBar: { close: 100.1 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.bias).toBe('bull')
			})

			it('Resets low price when getting long exit trigger', () => {
				const { context } = f.checkForTrigger({
					highPrice: 120,
					lowPrice: 100,
					regime: 'bull',
					currentBias: 'bull',
					signalBar: { close: 99 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.lowPrice).toBe(99)
			})

			it('Sets triggerPrice to entry level when getting long exit trigger', () => {
				const { context } = f.checkForTrigger({
					highPrice: 120,
					lowPrice: 100,
					regime: 'bull',
					currentBias: 'bull',
					signalBar: { close: 99 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.triggerPrice).toBe(118.8)
			})

			it('Generates Signal instance if long exit trigger', () => {
				f.checkForTrigger({
					highPrice: 120,
					lowPrice: 99,
					currentBias: 'bull',
					signalBar: { close: 99 },
					triggerPrice: null,
					lastSignal: {
						type: 'enter'
					},
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(Signal).toHaveBeenCalledTimes(1)
			})

			it('Does not create signal if last signal wasnt an entry', () => {
				f.checkForTrigger({
					highPrice: 120,
					lowPrice: 99,
					currentBias: 'bull',
					signalBar: { close: 99 },
					triggerPrice: null,
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(Signal).toHaveBeenCalledTimes(0)
			})

			it('Creates Signal instance with the data from the day after', () => {
				f.checkForTrigger({
					highPrice: 120,
					lowPrice: 99,
					regime: 'bull',
					currentBias: 'bull',
					signalBar: { close: 99, open: 100, date: new Date('2019-12-12') },
					triggerPrice: null,
					lastSignal: {
						type: 'enter'
					},
					currentBar: {
						open: 101,
						date: new Date('2019-12-13'),
						close: 200
					}
				})

				const { date, price } = Signal.mock.calls[0][0]
				expect(date).toEqual(new Date('2019-12-13'))
				expect(price).toBe(101)
			})

			it('returns Signal instance if created', () => {
				const { signal } = f.checkForTrigger({
					highPrice: 120,
					lowPrice: 100,
					currentBias: 'bull',
					signalBar: { close: 99 },
					triggerPrice: null,
					lastSignal: {
						type: 'enter'
					},
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(signal instanceof Signal).toBe(true)
			})

			it('sets triggerPrice even if no long entry signal is triggered', () => {
				const { context } = f.checkForTrigger({
					highPrice: 120,
					lowPrice: 50,
					currentBias: 'bull',
					signalBar: { close: 108 },
					regime: 'bull',
					triggerPrice: null,
					lastSignal: {
						type: 'enter'
					},
					currentBar: {
						open: 125,
						date: new Date('2019-12-13')
					}
				})

				expect(context.triggerPrice).toBe(100)
			})

			it.todo('Should check regime before deciding what exitfactor to use')
		})
	})

	describe('Create Regime filter', () => {
		let f, fetchStock, mockFetcher, priceData, movingAverage
		const validRequest = { id: 12345, type: 'SMA', lookback: 200, operator: '>=' }

		beforeEach(() => {
			movingAverage = jest.fn().mockReturnValue(new Map())
			priceData = new Array(100).fill(0).map((_, i) => ({ close: i, date: new Date(i) }))
			fetchStock = jest.fn().mockResolvedValue({ id: 12345, priceData })

			mockFetcher = {
				fetchStock
			}
			f = new Flipper()
		})

		it('Fetches data for the id specified', async () => {
			await f.createRegimeFilter(validRequest, {
				dataFetcher: mockFetcher,
				technicalAnalyst: { movingAverage }
			})

			expect(fetchStock).toHaveBeenCalledWith({
				id: validRequest.id,
				fieldString: 'id, priceData{close, date}'
			})
		})

		it('Calls to create moving average with the data fetched and the lookback period', async () => {
			await f.createRegimeFilter(validRequest, {
				dataFetcher: mockFetcher,
				technicalAnalyst: { movingAverage }
			})

			expect(movingAverage).toHaveBeenCalledWith({
				field: 'close',
				lookback: 200,
				data: priceData,
				type: 'SMA',
				includeField: true
			})
		})

		it('Returns map with dates as keys', async () => {
			const mockReturn = new Map()
			for (let i = 1; i <= 10; i++) {
				mockReturn.set(new Date(i * 1000000000).toISOString(), { price: i * 2, average: i })
			}

			movingAverage.mockReturnValue(mockReturn)

			await f.createRegimeFilter(validRequest, {
				dataFetcher: mockFetcher,
				technicalAnalyst: { movingAverage }
			})

			expect([...f.regimeFilter.keys()]).toEqual([
				'1970-01-12T13:46:40.000Z',
				'1970-01-24T03:33:20.000Z',
				'1970-02-04T17:20:00.000Z',
				'1970-02-16T07:06:40.000Z',
				'1970-02-27T20:53:20.000Z',
				'1970-03-11T10:40:00.000Z',
				'1970-03-23T00:26:40.000Z',
				'1970-04-03T14:13:20.000Z',
				'1970-04-15T04:00:00.000Z',
				'1970-04-26T17:46:40.000Z'
			])
		})

		it('sets "bull" if price > ma and operator is ">="', async () => {
			const mockReturn = new Map()
			for (let i = 1; i <= 10; i++) {
				mockReturn.set(new Date(i * 1000000000).toISOString(), { price: i * 2, average: i })
			}

			movingAverage.mockReturnValue(mockReturn)

			await f.createRegimeFilter(validRequest, {
				dataFetcher: mockFetcher,
				technicalAnalyst: { movingAverage }
			})

			expect([...f.regimeFilter.values()].every(value => value === 'bull')).toBe(true)
		})

		it('sets "bear" if price < ma and operator is ">="', async () => {
			const mockReturn = new Map()
			for (let i = 1; i <= 10; i++) {
				mockReturn.set(new Date(i * 1000000000).toISOString(), { price: i, average: i * 2 })
			}

			movingAverage.mockReturnValue(mockReturn)

			await f.createRegimeFilter(validRequest, {
				dataFetcher: mockFetcher,
				technicalAnalyst: { movingAverage }
			})

			expect([...f.regimeFilter.values()].every(value => value === 'bear')).toBe(true)
		})

		it('sets "bull" if price < ma and operator is "<="', async () => {
			const mockReturn = new Map()
			for (let i = 1; i <= 10; i++) {
				mockReturn.set(new Date(i * 1000000000).toISOString(), { price: i, average: i * 2 })
			}

			movingAverage.mockReturnValue(mockReturn)

			await f.createRegimeFilter(
				{ ...validRequest, operator: '<=' },
				{
					dataFetcher: mockFetcher,
					technicalAnalyst: { movingAverage }
				}
			)

			expect([...f.regimeFilter.values()].every(value => value === 'bull')).toBe(true)
		})

		it('sets bear if price > ma and operator is "<="', async () => {
			const mockReturn = new Map()
			for (let i = 1; i <= 10; i++) {
				mockReturn.set(new Date(i * 1000000000).toISOString(), { price: i + 1, average: i })
			}

			movingAverage.mockReturnValue(mockReturn)

			await f.createRegimeFilter(
				{ ...validRequest, operator: '<=' },
				{
					dataFetcher: mockFetcher,
					technicalAnalyst: { movingAverage }
				}
			)

			expect([...f.regimeFilter.values()].every(value => value === 'bear')).toBe(true)
		})

		it('sets "bull" if price == ma and operator is "=="', async () => {
			const mockReturn = new Map()
			for (let i = 1; i <= 10; i++) {
				mockReturn.set(new Date(i * 1000000000).toISOString(), { price: i, average: i })
			}

			movingAverage.mockReturnValue(mockReturn)

			await f.createRegimeFilter(
				{ ...validRequest, operator: '==' },
				{
					dataFetcher: mockFetcher,
					technicalAnalyst: { movingAverage }
				}
			)

			expect([...f.regimeFilter.values()].every(value => value === 'bull')).toBe(true)
		})

		it('sets bear if price != ma and operator is "=="', async () => {
			const mockReturn = new Map()
			for (let i = 1; i <= 10; i++) {
				mockReturn.set(new Date(i * 1000000000).toISOString(), { price: i + 1, average: i })
			}

			movingAverage.mockReturnValue(mockReturn)

			await f.createRegimeFilter(
				{ ...validRequest, operator: '==' },
				{
					dataFetcher: mockFetcher,
					technicalAnalyst: { movingAverage }
				}
			)

			expect([...f.regimeFilter.values()].every(value => value === 'bear')).toBe(true)
		})

		it('sets null if there is no ma', async () => {
			const mockReturn = new Map()
			for (let i = 1; i <= 10; i++) {
				mockReturn.set(new Date(i * 1000000000).toISOString(), { price: i })
			}

			movingAverage.mockReturnValue(mockReturn)

			await f.createRegimeFilter(
				{ ...validRequest, operator: '==' },
				{
					dataFetcher: mockFetcher,
					technicalAnalyst: { movingAverage }
				}
			)

			expect([...f.regimeFilter.values()].every(value => value === null)).toBe(true)
		})
	})

	describe('Regime filtering', () => {
		it.todo('Can take a separate dataset as regime filter')
		it.todo('Moves exit signal to 1/12 if bearish regime')
		it.todo('Does not enter if bearish regime')
	})
})
