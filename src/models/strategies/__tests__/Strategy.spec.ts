import Strategy from '../Strategy'
import Signal from '../../Signal'
import Trade from '../../Trade'
jest.mock('../../Signal')
jest.mock('../../Trade')

describe('Strategy class', () => {
	let s: Strategy

	beforeEach(() => {
		jest.clearAllMocks()

		s = new Strategy({ initialContext: null })
	})

	it('Has a working constructor', () => {
		expect(s instanceof Strategy).toBe(true)
	})

	it('Sets initial context', () => {
		s = new Strategy({ initialContext: { bias: 'bull' } } as any)

		expect(s.context).toEqual({ bias: 'bull' })
	})

	it('Can take a signal function', () => {
		s = new Strategy({ signalFunction: jest.fn(() => 'woop') as any })

		expect(s.processBar()).toBe('woop')
	})

	describe('Test', () => {
		beforeEach(() => {
			s = new Strategy({ initialContext: null } as any)

			s.createRegimeFilter = jest.fn()
		})

		it('Calls to extract the data to be tested', async () => {
			s.extractData = jest.fn().mockReturnValue({ startIndex: 0, endIndex: 6 })

			const mockStock = { priceData: ['Array of price data'] }
			const endDate = new Date('1995-12-17T03:24:00').toISOString()

			await s.test({
				stock: mockStock,
				endDate,
				dataFetcher: { fetchStock: jest.fn().mockResolvedValue(mockStock) },
			} as any)

			expect(s.extractData).toHaveBeenCalledWith({
				priceData: ['Array of price data'],
				startDate: null,
				endDate,
			})
		})

		it('Checks for signal every bar', async () => {
			s.processBar = jest.fn().mockReturnValue({ signal: null, context: null })

			s.extractData = jest.fn().mockReturnValue({ startIndex: 0, endIndex: 2 })

			const mockStock = {
				priceData: [{ bar: 'first' }, { bar: 'second' }, { bar: 'third' }, { bar: 'fourth' }],
			}
			const endDate = new Date('1995-12-17T03:24:00').toISOString()

			await s.test({
				stock: mockStock,
				endDate,
				dataFetcher: { fetchStock: jest.fn().mockResolvedValue(mockStock) },
			} as any)

			expect(s.processBar).toHaveBeenCalledTimes(3) // Not calling for the first bar due to lookback but twice on the last to look for pending bars
		})

		it('Updates context every bar', async () => {
			s.handleOpenPositions = jest.fn().mockReturnValue(null)

			const processBar = jest
				.fn()
				.mockReturnValueOnce({ signal: null, context: { call: 'first' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'second' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'third' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'fourth' } })

			s.processBar = processBar
			s.extractData = jest.fn().mockReturnValue({ startIndex: 0, endIndex: 3 })

			const mockStock = {
				priceData: [{ bar: 'first' }, { bar: 'second' }, { bar: 'third' }, { bar: 'fourth' }],
			}
			const endDate = new Date('1995-12-17T03:24:00').toISOString()

			await s.test({
				stock: mockStock,
				endDate,
				dataFetcher: { fetchStock: jest.fn().mockResolvedValue(mockStock) },
			} as any)

			expect(processBar.mock.calls[0][0].context).toBe(null)
			expect(processBar.mock.calls[1][0].context).toEqual({ call: 'first' })
			expect(processBar.mock.calls[2][0].context).toEqual({ call: 'second' })
			expect(processBar.mock.calls[3][0].context).toEqual({ call: 'third' })
		})

		it('Checks for pending signals on last bar', async () => {
			s.handleOpenPositions = jest.fn().mockReturnValue(null)

			const processBar = jest
				.fn()
				.mockReturnValueOnce({ signal: null, context: { call: 'first' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'second' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'third' } })
				.mockReturnValueOnce({
					signal: { name: 'buy everything' },
					context: { call: 'fourth' },
				})

			s.processBar = processBar

			const mockStock = {
				priceData: [
					{ open: 25, high: 32, low: 29, close: 15 },
					{ open: 32, high: 534, low: 64, close: 4 },
					{ open: 53, high: 53, low: 54, close: 2 },
					{ open: 43, high: 65, low: 76, close: 34 },
				],
			}
			s.extractData = jest.fn(({ priceData }) => ({
				startIndex: 0,
				endIndex: mockStock.priceData.length,
			}))

			const { pendingSignal } = await s.test({
				stock: mockStock,
				dataFetcher: { fetchStock: jest.fn().mockResolvedValue(mockStock) },
			} as any)

			expect(processBar).toHaveBeenCalledTimes(mockStock.priceData.length) // Skips the first bar but two times on the last
			expect(processBar.mock.calls[3][0].currentBar).toEqual({
				close: null,
				date: null,
				high: null,
				low: null,
				open: null,
			})

			expect(pendingSignal).toEqual({ name: 'buy everything', status: 'pending' })
		})

		it('Does not add null signals', async () => {
			s.handleOpenPositions = jest.fn().mockReturnValue(null)

			s.processBar = jest
				.fn()
				.mockReturnValueOnce({ signal: null, context: { call: 'first' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'second' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'third' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'fourth' } })

			s.extractData = jest
				.fn()
				.mockReturnValue([
					{ bar: 'first' },
					{ bar: 'second' },
					{ bar: 'third' },
					{ bar: 'fourth' },
				])

			const mockStock = { priceData: ['Array of price data'] }
			const endDate = new Date('1995-12-17T03:24:00').toISOString()

			const { signals } = await s.test({
				stock: mockStock,
				endDate,
				dataFetcher: { fetchStock: jest.fn().mockResolvedValue(mockStock) },
			} as any)
			expect(signals).toEqual([])
		})

		it('Adds signals to array', async () => {
			s.groupSignals = jest.fn().mockReturnValue([])

			s.processBar = jest
				.fn()
				.mockReturnValueOnce({ signal: null, context: { call: 'first' } })
				.mockReturnValueOnce({ signal: { type: 'Enter' }, context: { call: 'second' } })
				.mockReturnValueOnce({ signal: { type: 'Exit' }, context: { call: 'third' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'fourth' } })

			s.extractData = jest.fn().mockReturnValue({ startIndex: 0, endIndex: 3 })

			const mockStock = {
				priceData: [{ bar: 'first' }, { bar: 'second' }, { bar: 'third' }, { bar: 'fourth' }],
			}
			const endDate = new Date('1995-12-17T03:24:00').toISOString()

			const { signals } = await s.test({
				stock: mockStock,
				endDate,
				dataFetcher: { fetchStock: jest.fn().mockResolvedValue(mockStock) },
			} as any)
			expect(signals).toEqual([{ type: 'Enter' }, { type: 'Exit' }])
		})

		it('calls to handle open positions', async () => {
			const handleOpenPositions = jest.fn().mockReturnValue(null)
			s.handleOpenPositions = handleOpenPositions
			s.groupSignals = jest.fn().mockReturnValue([])

			s.processBar = jest
				.fn()
				.mockReturnValueOnce({ signal: null, context: { call: 'first' } })
				.mockReturnValueOnce({ signal: { type: 'Enter' }, context: { call: 'second' } })
				.mockReturnValueOnce({ signal: { type: 'Exit' }, context: { call: 'third' } })
				.mockReturnValueOnce({ signal: null, context: { call: 'fourth' } })

			s.extractData = jest.fn().mockReturnValue({
				startIndex: 0,
				endIndex: 3,
			})

			const mockStock = {
				name: 'HM B',
			}

			const mockPriceData = {
				priceData: [{ bar: 'first' }, { bar: 'second' }, { bar: 'third' }, { bar: 'fourth' }],
			}
			const endDate = new Date('1995-12-17T03:24:00').toISOString()

			await s.test({
				stock: mockStock,
				endDate,
				dataFetcher: { fetchStock: jest.fn().mockResolvedValue(mockPriceData) },
			} as any)

			expect(handleOpenPositions).toHaveBeenCalledTimes(1)
			expect(handleOpenPositions.mock.calls[0][0]).toEqual({
				context: { call: 'third' },
				currentBar: { bar: 'fourth' },
				signals: [{ type: 'Enter' }, { type: 'Exit' }],
				stock: { name: 'HM B' },
			})
		})

		it.todo('Adds information about open trade')
	})

	describe('Handle open positions', () => {
		it('Generates exit signal for open position if signal array length is odd and last signal is to enter', () => {
			const openPositionPolicy = 'conservative'
			const signals = [{ type: 'enter' }]
			const stock = { name: 'SKF AB' }
			const currentBar = {
				date: new Date('2019-12-13'),
				open: 25,
				high: 29,
				low: 21,
				close: 25,
			}
			const context = { triggerPrice: 20 }

			const resp = s.handleOpenPositions({
				signals,
				context,
				currentBar,
				stock,
				openPositionPolicy,
			} as any)

			expect(resp instanceof Signal).toBe(true)
		})

		it('Throws if signals length is odd and last signal is to exit', () => {
			expect.assertions(1)

			const openPositionPolicy = 'conservative'
			const signals = [{ type: 'exit' }]
			const stock = { name: 'SKF AB' }
			const currentBar = {
				date: new Date('2019-12-13'),
				open: 25,
				high: 29,
				low: 21,
				close: 25,
			}
			const context = { triggerPrice: 20 }

			try {
				const resp = s.handleOpenPositions({
					signals,
					context,
					currentBar,
					stock,
					openPositionPolicy,
				} as any)
			} catch (err) {
				expect(err.message).toBe(
					'Logic error found. Uneven length on signal array and last signal was to exit'
				)
			}
		})

		it('Returns null if no open position detected', () => {
			const openPositionPolicy = 'conservative'
			const signals = [{ type: 'enter' }, { type: 'exit' }]
			const stock = { name: 'SKF AB' }
			const currentBar = {
				date: new Date('2019-12-13'),
				open: 25,
				high: 29,
				low: 21,
				close: 25,
			}
			const context = { triggerPrice: 20 }

			const resp = s.handleOpenPositions({
				signals,
				context,
				currentBar,
				stock,
				openPositionPolicy,
			} as any)

			expect(resp).toBe(null)
		})

		it('Generates signal based on trigger price if openPositionPolicy is "conservative"', () => {
			const openPositionPolicy = 'conservative'
			const signals = [{ type: 'enter' }]
			const stock = { name: 'SKF AB' }
			const currentBar = {
				date: new Date('2019-12-13'),
				open: 25,
				high: 29,
				low: 21,
				close: 25,
			}
			const context = { triggerPrice: 20 }

			const resp = s.handleOpenPositions({
				signals,
				context,
				currentBar,
				stock,
				openPositionPolicy,
			} as any)

			expect(resp instanceof Signal).toBe(true)
			expect(Signal).toHaveBeenCalledWith({
				action: 'sell',
				date: new Date('2019-12-13T00:00:00.000Z'),
				price: 20,
				stock,
				status: 'pending',
				type: 'exit',
			})
		})

		it('Generates signal based on trigger price if openPositionPolicy is "exclude"', () => {
			const openPositionPolicy = 'exclude'
			const signals = [{ type: 'enter' }]
			const stock = { name: 'SKF AB' }
			const currentBar = {
				date: new Date('2019-12-13'),
				open: 25,
				high: 29,
				low: 21,
				close: 25,
			}
			const context = { triggerPrice: 20 }

			const resp = s.handleOpenPositions({
				signals,
				context,
				currentBar,
				stock,
				openPositionPolicy,
			} as any)

			expect(resp instanceof Signal).toBe(true)
			expect(Signal).toHaveBeenCalledWith({
				action: 'sell',
				date: new Date('2019-12-13T00:00:00.000Z'),
				price: 20,
				stock,
				status: 'pending',
				type: 'exit',
			})
		})

		it('Generates signal based on current price if openPositionPolicy is "optimistic"', () => {
			const openPositionPolicy = 'optimistic'
			const signals = [{ type: 'enter' }]
			const stock = { name: 'SKF AB' }
			const currentBar = {
				date: new Date('2019-12-13'),
				open: 25,
				high: 29,
				low: 21,
				close: 25,
			}
			const context = { triggerPrice: 20 }

			const resp = s.handleOpenPositions({
				signals,
				context,
				currentBar,
				stock,
				openPositionPolicy,
			} as any)

			expect(resp instanceof Signal).toBe(true)
			expect(Signal).toHaveBeenCalledWith({
				action: 'sell',
				date: new Date('2019-12-13T00:00:00.000Z'),
				price: 25,
				stock,
				status: 'pending',
				type: 'exit',
			})
		})
	})

	describe('Summarize Signals', () => {
		it('Throws if array length is uneven and there is no signal for open positions', () => {
			expect.assertions(1)

			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }]

			try {
				s.summarizeSignals({ signals, priceData: [], closeOpenPosition: null } as any)
			} catch (err) {
				expect(err.message).toBe('No exit signal for open position provided')
			}
		})

		it('Throws if the last signal is to enter', () => {
			expect.assertions(1)

			const signals = [{ type: 'enter' }, { type: 'enter' }]

			try {
				s.summarizeSignals({ signals, priceData: [], closeOpenPosition: null } as any)
			} catch (err) {
				expect(err.message).toBe('No exit signal for open position provided')
			}
		})

		it('Groups entry & exit signals', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }, { type: 'exit' }]

			s.groupSignals = jest.fn().mockReturnValue([
				[{ type: 'enter' }, { type: 'exit' }],
				[{ type: 'enter' }, { type: 'exit' }],
			])

			s.summarizeSignals({ signals, priceData: [], closeOpenPosition: null } as any)
			expect(s.groupSignals).toHaveBeenCalledWith({ signals, closeOpenPosition: null })
		})

		it('Calls to extract the price data between entry and exit', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }, { type: 'exit' }]

			s.groupSignals = jest.fn().mockReturnValue([
				[{ type: 'enter' }, { type: 'exit' }],
				[{ type: 'enter' }, { type: 'exit' }],
			])

			s.summarizeSignals({ signals, priceData: [], closeOpenPosition: null } as any)
		})

		it('Creates Trade instance with entry, exit, the stock and pricedata', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }, { type: 'exit' }]

			const mockResponse = [
				[{ type: 'entry signal' }, { type: 'exit signal' }],
				[{ type: 'another entry signal' }, { type: 'another exit signal' }],
			]

			s.groupSignals = jest.fn().mockReturnValue(mockResponse)

			s.summarizeSignals({
				signals,
				priceData: [],
				closeOpenPosition: null,
				stock: { name: 'HM AB' },
			} as any)
			expect(Trade).toHaveBeenCalledTimes(2)

			expect(Trade).toHaveBeenCalledWith({
				entry: { type: 'entry signal' },
				exit: { type: 'exit signal' },
				stock: { name: 'HM AB' },
			})
			expect(Trade).toHaveBeenCalledWith({
				entry: { type: 'another entry signal' },
				exit: { type: 'another exit signal' },
				stock: { name: 'HM AB' },
			})
		})

		it('Return array of Trades', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }, { type: 'exit' }]

			const mockResponse = [
				[{ type: 'entry signal' }, { type: 'exit signal' }],
				[{ type: 'another entry signal' }, { type: 'another exit signal' }],
			]

			s.groupSignals = jest.fn().mockReturnValue(mockResponse)

			const resp = s.summarizeSignals({ signals, priceData: [], closeOpenPosition: null } as any)

			const isAllTradeInstances = resp.every((trade) => trade instanceof Trade)

			expect(isAllTradeInstances).toBe(true)
			expect(resp.length).toBe(2)
		})

		it('Excludes last trade if openPostionPolicy is "exclude" and there was open position', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }, { type: 'exit' }]

			const mockResponse = [
				[{ type: 'entry signal' }, { type: 'exit signal' }],
				[{ type: 'another entry signal' }, { type: 'another exit signal' }],
			]

			s.groupSignals = jest.fn().mockReturnValue(mockResponse)

			const resp = s.summarizeSignals({
				signals,
				priceData: [],
				closeOpenPosition: { name: 'this is a mock signal' },
				openPositionPolicy: 'exclude',
			} as any)

			const isAllTradeInstances = resp.every((trade) => trade instanceof Trade)

			expect(isAllTradeInstances).toBe(true)
			expect(resp.length).toBe(1)
		})
	})

	describe('Group signals', () => {
		it('Groups signals in arrays of 2', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }, { type: 'exit' }]

			expect(s.groupSignals({ signals } as any)).toEqual([
				[{ type: 'enter' }, { type: 'exit' }],
				[{ type: 'enter' }, { type: 'exit' }],
			])
		})

		it('Adds the signal to close open positions', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }]
			const closeOpenPosition = { type: 'exit' }

			expect(s.groupSignals({ signals, closeOpenPosition } as any)).toEqual([
				[{ type: 'enter' }, { type: 'exit' }],
				[{ type: 'enter' }, { type: 'exit' }],
			])
		})

		it('Validates that each signal group has both entry and exit', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }, { type: 'enter' }]

			try {
				expect(s.groupSignals({ signals } as any))
			} catch (err) {
				expect(err.message).toBe('Invalid sequence or number of signals')
			}
		})

		it('Validates that each signal group is actually a group', () => {
			const signals = [{ type: 'enter' }, { type: 'exit' }, { type: 'enter' }]

			try {
				expect(s.groupSignals({ signals } as any))
			} catch (err) {
				expect(err.message).toBe('Invalid sequence or number of signals')
			}
		})
	})

	describe('extractData', () => {
		it('Should return start + end index', () => {
			const searchForDate = jest.fn().mockReturnValueOnce(1).mockReturnValueOnce(99)
			const s = new Strategy({ initialContext: null, _DateSearcher: searchForDate })

			const priceData = new Array(100).fill({
				date: 'this is a date',
				open: 1,
				high: 2,
				low: 0.1,
				close: 1,
			})

			const startDate = new Date('2019-12-14')
			const endDate = new Date('2019-12-24')

			expect(
				s.extractData({
					priceData,
					startDate,
					endDate,
				})
			).toEqual({ startIndex: 1, endIndex: 99 })

			expect(searchForDate).toHaveBeenCalledTimes(2)
			expect(searchForDate.mock.calls[0][0].priceData).toEqual(priceData)
			expect(searchForDate.mock.calls[0][0].date).toEqual(startDate)

			expect(searchForDate.mock.calls[1][0].priceData).toEqual(priceData)
			expect(searchForDate.mock.calls[1][0].date).toEqual(endDate)
		})

		it('Sets startIndex to 0 if no start provided', () => {
			const searchForDate = jest.fn().mockReturnValueOnce(99)
			const s = new Strategy({ initialContext: null, _DateSearcher: searchForDate })

			const priceData = new Array(100).fill({
				date: 'this is a date',
				open: 1,
				high: 2,
				low: 0.1,
				close: 1,
			})

			const startDate: any = null
			const endDate = new Date('2019-12-24')

			expect(
				s.extractData({
					priceData,
					startDate,
					endDate,
				})
			).toEqual({ startIndex: 0, endIndex: 99 })
		})

		it('Sets endIndex to array length - 1 if no end provided', () => {
			const searchForDate = jest.fn().mockReturnValueOnce(1)
			const s = new Strategy({ initialContext: null, _DateSearcher: searchForDate })

			const priceData = new Array(100).fill({
				date: 'this is a date',
				open: 1,
				high: 2,
				low: 0.1,
				close: 1,
			})

			const startDate = new Date('2019-12-24')
			const endDate: any = null

			expect(
				s.extractData({
					priceData,
					startDate,
					endDate,
				})
			).toEqual({ startIndex: 1, endIndex: 99 })
		})
	})
})
