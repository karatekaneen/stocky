import Portfolio from '../Portfolio'
import Trade from '../Trade'
import Fee from '../Fee'
import Stock from '../Stock'
import mockStock from './__mocks__/mockstock.json'
import DataFetcher from '../../backendModules/DataFetcher'
jest.mock('../../backendModules/DataFetcher')

const mockTrades = [
	{
		entry: {
			stock: {
				id: 5277,
				name: 'Bure Equity',
				list: 'Mid Cap Stockholm',
				lastPricePoint: null,
				linkName: null,
				dataSeries: []
			},
			price: 101.9,
			date: new Date('2019-01-20T15:16:36.143Z'),
			action: 'buy',
			type: 'enter',
			status: 'executed'
		},
		exit: {
			stock: {
				id: 5277,
				name: 'Bure Equity',
				list: 'Mid Cap Stockholm',
				lastPricePoint: null,
				linkName: null,
				dataSeries: []
			},
			price: 117.24,
			date: new Date('2020-01-19T15:16:36.143Z'),
			action: 'sell',
			type: 'exit',
			status: 'executed'
		},
		stock: {
			id: 5277,
			name: 'Bure Equity',
			list: 'Mid Cap Stockholm',
			lastPricePoint: null,
			linkName: null,
			dataSeries: []
		},
		quantity: 1,
		resultPerStock: 15.34,
		resultPercent: 0.15053974484789
	},
	{
		entry: {
			stock: {
				id: 5277,
				name: 'Bure Equity',
				list: 'Mid Cap Stockholm',
				lastPricePoint: null,
				linkName: null,
				dataSeries: []
			},
			price: 110.47,
			date: new Date('2020-01-19T15:16:36.143Z'),
			action: 'buy',
			type: 'enter',
			status: 'executed'
		},
		exit: {
			stock: {
				id: 5277,
				name: 'Bure Equity',
				list: 'Mid Cap Stockholm',
				lastPricePoint: null,
				linkName: null,
				dataSeries: []
			},
			price: 85.67,
			date: new Date('2021-02-19T15:16:36.143Z'),
			action: 'sell',
			type: 'exit',
			status: 'executed'
		},
		stock: {
			id: 6423,
			name: 'Bure Equity',
			list: 'Mid Cap Stockholm',
			lastPricePoint: null,
			linkName: null,
			dataSeries: []
		},
		quantity: 1,
		resultPerStock: -24.8,
		resultPercent: -0.22449533810084188
	},
	{
		entry: {
			stock: {
				id: 5277,
				name: 'Bure Equity',
				list: 'Mid Cap Stockholm',
				lastPricePoint: null,
				linkName: null,
				dataSeries: []
			},
			price: 66.73,
			date: new Date('2020-01-19T15:16:36.143Z'),
			action: 'buy',
			type: 'enter',
			status: 'executed'
		},
		exit: {
			stock: {
				id: 5277,
				name: 'Bure Equity',
				list: 'Mid Cap Stockholm',
				lastPricePoint: null,
				linkName: null,
				dataSeries: []
			},
			price: 50.05,
			date: new Date('2020-02-19T15:16:36.143Z'),
			action: 'sell',
			type: 'exit',
			status: 'executed'
		},
		stock: {
			id: 5277,
			name: 'Bure Equity',
			list: 'Mid Cap Stockholm',
			lastPricePoint: null,
			linkName: null,
			dataSeries: []
		},
		quantity: 1,
		resultPerStock: -16.68,
		resultPercent: -0.24996253559118842
	}
]

describe('Portfolio', () => {
	let p

	beforeEach(() => {
		// Clear all instances and calls to constructor and all methods:
		p = new Portfolio()
		jest.clearAllMocks()
	})

	describe('Backtest', () => {
		it('Calls to generate signal map', async () => {
			p.generateSignalMaps = jest.fn().mockReturnValue(new Map())

			await p.backtest({ trades: mockTrades })

			expect(p.generateSignalMaps).toHaveBeenCalledWith(mockTrades)
		})

		it('Calls to rank signals for each day', async () => {
			p.generateTimeline = jest.fn()

			p.rankSignals = jest.fn().mockReturnValue([])

			await p.backtest({ trades: mockTrades })

			expect(p.rankSignals).toHaveBeenCalledTimes(2) // One for each unique date with at least 1 entry signal
		})

		it('Calculates max position value', async () => {
			p.generateTimeline = jest.fn()

			p.calculateMaxPositionValue = jest.fn(p.calculateMaxPositionValue)

			await p.backtest({ trades: [mockTrades[0]] })

			expect(p.calculateMaxPositionValue).toHaveBeenCalledTimes(1)

			expect(p.calculateMaxPositionValue.mock.calls[0][0]).toEqual(100000)
		})

		it('Can buy cheaper stock if there isnt room for more expensive', async () => {
			const diversePricedStocks = [
				{
					entry: {
						stock: {
							id: 5277,
							name: 'expensive stock',
							list: 'Mid Cap Stockholm',
							lastPricePoint: null,
							linkName: null,
							dataSeries: []
						},
						price: 100000.9,
						date: new Date('2019-01-20T15:16:36.143Z'),
						action: 'buy',
						type: 'enter',
						status: 'executed'
					},
					exit: {
						stock: {
							id: 5277,
							name: 'expensive stock',
							list: 'Mid Cap Stockholm',
							lastPricePoint: null,
							linkName: null,
							dataSeries: []
						},
						price: 100000.24,
						date: new Date('2020-01-19T15:16:36.143Z'),
						action: 'sell',
						type: 'exit',
						status: 'executed'
					},
					stock: {
						id: 5277,
						name: 'expensive stock',
						list: 'Mid Cap Stockholm',
						lastPricePoint: null,
						linkName: null,
						dataSeries: []
					},
					quantity: 1,
					resultPerStock: 15.34,
					resultPercent: 0.15053974484789
				},
				{
					entry: {
						stock: {
							id: 5277,
							name: 'Bure Equity',
							list: 'Mid Cap Stockholm',
							lastPricePoint: null,
							linkName: null,
							dataSeries: []
						},
						price: 110.47,
						date: new Date('2020-01-19T15:16:36.143Z'),
						action: 'buy',
						type: 'enter',
						status: 'executed'
					},
					exit: {
						stock: {
							id: 5277,
							name: 'Bure Equity',
							list: 'Mid Cap Stockholm',
							lastPricePoint: null,
							linkName: null,
							dataSeries: []
						},
						price: 85.67,
						date: new Date('2021-02-19T15:16:36.143Z'),
						action: 'sell',
						type: 'exit',
						status: 'executed'
					},
					stock: {
						id: 5277,
						name: 'Bure Equity',
						list: 'Mid Cap Stockholm',
						lastPricePoint: null,
						linkName: null,
						dataSeries: []
					},
					quantity: 1,
					resultPerStock: -24.8,
					resultPercent: -0.22449533810084188
				}
			]

			p.generateTimeline = jest.fn()

			p.calculateMaxPositionValue = jest.fn(p.calculateMaxPositionValue)

			const resp = await p.backtest({ trades: diversePricedStocks })
			expect(p.historicalTrades.length).toEqual(1)
			expect(p.historicalTrades[0].entryPrice).toBe(110.47) // only bought the cheap stock
		})

		it('Withdraws cash on entry', async () => {
			const tradeWithoutExit = new Trade({
				entry: {
					stock: {
						id: 5277,
						name: 'expensive stock',
						list: 'Mid Cap Stockholm',
						lastPricePoint: null,
						linkName: null,
						dataSeries: []
					},
					price: 101.9,
					date: new Date('2019-01-20T15:16:36.143Z'),
					action: 'buy',
					type: 'enter',
					status: 'executed'
				},
				exit: {
					stock: {
						id: 5277,
						name: 'expensive stock',
						list: 'Mid Cap Stockholm',
						lastPricePoint: null,
						linkName: null,
						dataSeries: []
					},
					price: 117.24,
					date: new Date('2020-01-19T15:16:36.143Z'),
					action: 'sell',
					type: 'exit',
					status: 'executed'
				},
				stock: {
					id: 5277,
					name: 'expensive stock',
					list: 'Mid Cap Stockholm',
					lastPricePoint: null,
					linkName: null,
					dataSeries: []
				},
				quantity: 1,
				resultPerStock: 15.34,
				resultPercent: 0.15053974484789
			})

			const p = new Portfolio({ startCapital: 100000 })
			p.generateTimeline = jest.fn()

			p.generateSignalMaps = jest
				.fn()
				.mockReturnValue(
					new Map().set('2019-01-20T15:16:36.143Z', { entry: [tradeWithoutExit], exit: [] })
				)

			await p.backtest({ trades: [tradeWithoutExit] })
			expect(p.cashAvailable).toEqual(95108.8)
		})

		it('Removes slot from availability on entry', async () => {
			const tradeWithoutExit = new Trade({
				entry: {
					stock: {
						id: 5277,
						name: 'expensive stock',
						list: 'Mid Cap Stockholm',
						lastPricePoint: null,
						linkName: null,
						dataSeries: []
					},
					price: 101.9,
					date: new Date('2019-01-20T15:16:36.143Z'),
					action: 'buy',
					type: 'enter',
					status: 'executed'
				},
				exit: {
					stock: {
						id: 5277,
						name: 'expensive stock',
						list: 'Mid Cap Stockholm',
						lastPricePoint: null,
						linkName: null,
						dataSeries: []
					},
					price: 117.24,
					date: new Date('2020-01-19T15:16:36.143Z'),
					action: 'sell',
					type: 'exit',
					status: 'executed'
				},
				stock: {
					id: 5277,
					name: 'expensive stock',
					list: 'Mid Cap Stockholm',
					lastPricePoint: null,
					linkName: null,
					dataSeries: []
				},
				quantity: 1,
				resultPerStock: 15.34,
				resultPercent: 0.15053974484789
			})

			const p = new Portfolio({ startCapital: 100000 })
			p.generateTimeline = jest.fn()

			p.generateSignalMaps = jest
				.fn()
				.mockReturnValue(
					new Map().set('2019-01-20T15:16:36.143Z', { entry: [tradeWithoutExit], exit: [] })
				)

			expect(p.openPositions).toEqual(0)
			await p.backtest({ trades: [tradeWithoutExit] })
			expect(p.openPositions).toEqual(1)
		})

		it('Calls to calculate quantity with max position value', async () => {
			const trade = new Trade(mockTrades[0])
			trade.calculateQuantity = jest.fn(trade.calculateQuantity)

			const p = new Portfolio({ feeMinimum: 0, feePercentage: 0, maxNumberOfStocks: 20 })
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: [trade] })

			expect(trade.calculateQuantity).toHaveBeenCalledWith(5000)
			expect(trade.calculateQuantity).toHaveBeenCalledTimes(1)
			expect(trade.quantity).toBe(49)
		})

		it('Does not add any trades if there isnt any slots open', async () => {
			const trade = new Trade(mockTrades[0])
			trade.calculateQuantity = jest.fn(trade.calculateQuantity)

			const p = new Portfolio({ feeMinimum: 0, feePercentage: 0, maxNumberOfStocks: 0 })
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: [trade] })

			expect(trade.calculateQuantity).not.toHaveBeenCalled()
			expect(trade.quantity).toBe(1) // Default quantity
		})

		it('Removes trade from currently holding upon exit', async () => {
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: mockTrades })
			expect(p.openTrades.size).toBe(0)
		})

		it('Adds closed trades to historicalTrades', async () => {
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: mockTrades })
			expect(p.historicalTrades.length).toBe(mockTrades.length)
		})

		it('Adds availability on exit', async () => {
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: mockTrades })
			expect(p.openPositions).toBe(0)
		})

		it('Deposits cash on exit', async () => {
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: [mockTrades[0]] })
			expect(p.cashAvailable).toBe(100736.32)

			await p.backtest({ trades: mockTrades })
			expect(p.cashAvailable).toBe(98369.32)
		})

		it('Keeps track of number of signals sorted out', async () => {
			const p = new Portfolio({ maxNumberOfStocks: 1 })
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: mockTrades })
			expect(p.signalsNotTaken).toBe(1)
		})

		it('Calls to generate timeline if there are any trades', async () => {
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: mockTrades })

			expect(p.generateTimeline).toHaveBeenCalledTimes(1)
			expect(p.generateTimeline.mock.calls[0][0].firstTrade.entry.price).toBe(
				mockTrades[0].entry.price
			)
		})

		it('Does not call to generate timeline if there isnt any trades', async () => {
			p.generateTimeline = jest.fn()
			p.generateSignalMaps = jest.fn().mockReturnValue(new Map())

			await p.backtest({ trades: mockTrades })

			expect(p.generateTimeline).toHaveBeenCalledTimes(0)
		})

		it('Records each change of cashAvailable', async () => {
			p.generateTimeline = jest.fn()

			await p.backtest({ trades: mockTrades })
			expect([...p.timeline.entries()]).toEqual([
				['2019-01-20T15:16:36.143Z', { cashAvailable: 95108.8 }],
				['2020-01-19T15:16:36.143Z', { cashAvailable: 90760.42000000001 }],
				['2020-02-19T15:16:36.143Z', { cashAvailable: 94514.17000000001 }],
				['2021-02-19T15:16:36.143Z', { cashAvailable: 98369.32 }]
			])
		})

		it.todo('Can handle trades that are still open at end of test')
		it.todo('Can handle pending signals')
	})

	describe('Generate Timeline', () => {
		it('Calls to group trades by stock ID', async () => {
			p.getDateMap = jest.fn().mockReturnValue(new Map())
			p.groupTradesByStock = jest.fn().mockReturnValue(new Map())
			const firstTrade = new Trade(mockTrades[0])

			await p.generateTimeline({ trades: mockTrades, timeline: new Map(), firstTrade })

			expect(p.groupTradesByStock).toHaveBeenCalledWith(mockTrades)
		})

		it('Creates a DataFetcher', async () => {
			p.getDateMap = jest.fn().mockReturnValue(new Map())

			const resp = await p.generateTimeline({
				trades: mockTrades.map(t => new Trade(t)),
				timeline: new Map([
					['2000-05-23T22:00:00.000Z', { cashAvailable: 95108.8 }],
					['2000-05-30T22:00:00.000Z', { cashAvailable: 90760.42000000001 }],
					['2000-06-15T22:00:00.000Z', { cashAvailable: 94514.17000000001 }],
					['2000-06-30T22:00:00.000Z', { cashAvailable: 98369.32 }]
				]),
				queue: jest.fn().mockResolvedValue([])
			})
			expect(DataFetcher).toHaveBeenCalledTimes(1)
		})

		it('Passes the data from fetchstock in to each trade instance', async () => {
			p.getDateMap = jest.fn().mockReturnValue(new Map())

			DataFetcher.mockImplementationOnce(() => ({ fetchStock: x => ({ priceData: [x.id] }) }))

			const trades = mockTrades.map(t => {
				const trade = new Trade(t)
				trade.getTradePerformance = jest.fn().mockReturnValue([])
				return trade
			})

			const resp = await p.generateTimeline({
				trades,
				timeline: new Map([
					['2000-05-23T22:00:00.000Z', { cashAvailable: 95108.8 }],
					['2000-05-30T22:00:00.000Z', { cashAvailable: 90760.42000000001 }],
					['2000-06-15T22:00:00.000Z', { cashAvailable: 94514.17000000001 }],
					['2000-06-30T22:00:00.000Z', { cashAvailable: 98369.32 }]
				]),
				DataFetcher
				// queue: jest.fn().mockResolvedValue([])
			})

			expect(trades[0].getTradePerformance).toHaveBeenCalledWith({ priceData: [5277] })
			expect(trades[1].getTradePerformance).toHaveBeenCalledWith({ priceData: [6423] })
			expect(trades[2].getTradePerformance).toHaveBeenCalledWith({ priceData: [5277] })
		})

		it('creates a queue to be executed', async () => {
			p.getDateMap = jest.fn().mockReturnValue(new Map())

			const queue = jest.fn().mockResolvedValue([])
			const resp = await p.generateTimeline({
				trades: mockTrades.map(t => new Trade(t)),
				timeline: new Map([
					['2000-05-23T22:00:00.000Z', { cashAvailable: 95108.8 }],
					['2000-05-30T22:00:00.000Z', { cashAvailable: 90760.42000000001 }],
					['2000-06-15T22:00:00.000Z', { cashAvailable: 94514.17000000001 }],
					['2000-06-30T22:00:00.000Z', { cashAvailable: 98369.32 }]
				]),
				DataFetcher,
				queue
			})

			expect(queue).toHaveBeenCalledTimes(1)

			const call = queue.mock.calls[0]
			expect(call[0].length).toBe(2) // Once for each stock traded, not for each trade
			expect(call[1]).toBe(10)
		})

		it('Loops over each trade and adding its value and p/l for each date', async () => {
			p.getDateMap = jest
				.fn()
				.mockReturnValue(
					new Map([
						['2000-05-23T22:00:00.000Z', {}],
						['2000-05-30T22:00:00.000Z', {}],
						['2000-06-15T22:00:00.000Z', {}],
						['2000-06-30T22:00:00.000Z', {}]
					])
				)

			DataFetcher.mockImplementationOnce(() => ({ fetchStock: x => [x.id] }))

			const trades = mockTrades.map(t => {
				const trade = new Trade(t)
				trade.getTradePerformance = jest
					.fn()
					.mockReturnValue([
						{ date: new Date('2000-05-23T22:00:00.000Z'), value: 100 },
						{ date: new Date('2000-05-30T22:00:00.000Z'), value: 10 },
						{ date: new Date('2000-06-15T22:00:00.000Z'), value: 1000 },
						{ date: new Date('2000-06-30T22:00:00.000Z'), value: 1 }
					])
				return trade
			})

			const resp = await p.generateTimeline({
				trades,
				timeline: new Map([
					['2000-05-23T22:00:00.000Z', { cashAvailable: 95108.8 }],
					['2000-05-30T22:00:00.000Z', { cashAvailable: 90760 }],
					['2000-06-15T22:00:00.000Z', { cashAvailable: 94514 }],
					['2000-06-30T22:00:00.000Z', { cashAvailable: 98369.32 }]
				]),
				DataFetcher
			})

			expect(resp.get('2000-05-23T22:00:00.000Z').cashAvailable).toBe(95108.8)
			expect(resp.get('2000-05-23T22:00:00.000Z').total).toBe(95408.8)
			expect(resp.get('2000-05-23T22:00:00.000Z').totalPositionValue).toBe(300)

			expect(resp.get('2000-06-15T22:00:00.000Z').cashAvailable).toBe(94514)
			expect(resp.get('2000-06-15T22:00:00.000Z').total).toBe(97514)
			expect(resp.get('2000-06-15T22:00:00.000Z').totalPositionValue).toBe(3000)
		})

		it('Keeps track of how many positions open for each day', async () => {
			p.getDateMap = jest
				.fn()
				.mockReturnValue(
					new Map([
						['2000-05-23T22:00:00.000Z', {}],
						['2000-05-30T22:00:00.000Z', {}],
						['2000-06-15T22:00:00.000Z', {}],
						['2000-06-30T22:00:00.000Z', {}]
					])
				)

			DataFetcher.mockImplementationOnce(() => ({ fetchStock: x => [x.id] }))

			const trades = mockTrades.map(t => {
				const trade = new Trade(t)
				trade.getTradePerformance = jest
					.fn()
					.mockReturnValue([
						{ date: new Date('2000-05-23T22:00:00.000Z'), value: 100 },
						{ date: new Date('2000-05-30T22:00:00.000Z'), value: 10 },
						{ date: new Date('2000-06-15T22:00:00.000Z'), value: 1000 },
						{ date: new Date('2000-06-30T22:00:00.000Z'), value: 1 }
					])
				return trade
			})

			const resp = await p.generateTimeline({
				trades,
				timeline: new Map([
					['2000-05-23T22:00:00.000Z', { cashAvailable: 95108.8 }],
					['2000-05-30T22:00:00.000Z', { cashAvailable: 90760 }],
					['2000-06-15T22:00:00.000Z', { cashAvailable: 94514 }],
					['2000-06-30T22:00:00.000Z', { cashAvailable: 98369.32 }]
				]),
				DataFetcher
			})

			expect(resp.get('2000-05-23T22:00:00.000Z').numberOfPositionsOpen).toBe(3)
		})

		// ? This might be unnecessary...?
		it.todo(
			'Keeps track of percentage invested = positionValues/(position values + cashAvailable)'
		)
	})

	describe('Group trades by stock', () => {
		it('Groups trades by their IDs', () => {
			const resp = p.groupTradesByStock(mockTrades.map(t => new Trade(t)))
			expect(resp.get(5277).length).toBe(2)
			expect([...resp.keys()]).toEqual([5277, 6423])
		})

		it('Can handle an empty array', () => {
			const resp = p.groupTradesByStock([])
			expect([...resp.keys()]).toEqual([])
		})
	})

	describe('Get Date Map', () => {
		it('Creates a DataFetcher', async () => {
			await p.getDateMap({ stock: { id: 123 } }, DataFetcher)
			expect(DataFetcher).toHaveBeenCalledTimes(1)
		})

		it('Fetches the data from the stock that was the first trade', async () => {
			await p.getDateMap({ stock: { id: 123 } }, DataFetcher)
			expect(DataFetcher.mock.instances[0].fetchStock).toHaveBeenCalledWith({
				fieldString: 'priceData{ date }',
				id: 19002
			})
		})

		it('Converts the priceData array to a map of dates', async () => {
			const fetchStock = jest.fn().mockResolvedValue(new Stock({ data: mockStock }))
			DataFetcher.mockImplementationOnce(() => ({ fetchStock }))
			const resp = await p.getDateMap({ stock: { id: 123 } }, DataFetcher)

			expect(resp.size).toBe(5027)
		})
	})

	describe('generateSignalMaps', () => {
		it('Groups the trades by entry & exit date', () => {
			const resp = p.generateSignalMaps(mockTrades)
			expect(resp instanceof Map).toBe(true)
			expect(resp.size).toBe(4) // Number of unique dates in mockTrades
		})

		it('Sorts the keys chronologically', () => {
			const resp = [...p.generateSignalMaps(mockTrades).keys()]
			expect(resp).toEqual([
				'2019-01-20T15:16:36.143Z',
				'2020-01-19T15:16:36.143Z',
				'2020-02-19T15:16:36.143Z',
				'2021-02-19T15:16:36.143Z'
			])
		})

		it('Allows multiple entries on same date', () => {
			const resp = p.generateSignalMaps(mockTrades).get('2020-01-19T15:16:36.143Z')
			expect(resp.entry.length).toBe(2)
			expect(resp.exit.length).toBe(1)
		})
	})

	describe('calculateMaxPositionValue', () => {
		it('returns max amount to buy for', () => {
			const f = new Fee({ percentage: 0, minimum: 1 })

			const resp = p.calculateMaxPositionValue(100000, f, 10)
			expect(resp).toBe(9999.9)

			const resp2 = p.calculateMaxPositionValue(100000, f, 20)
			expect(resp2).toBe(4999.95)
		})

		it('defaults to #availableSlots', () => {
			const p = new Portfolio({ maxNumberOfStocks: 10 })
			const f = new Fee({ percentage: 0, minimum: 1 })

			const resp = p.calculateMaxPositionValue(100000, f)
			expect(resp).toBe(9999.9)

			const resp2 = p.calculateMaxPositionValue(100000, f)
			expect(resp2).toBe(9999.9)
		})
	})

	describe('Rank Signals', () => {
		it('Shuffles order if selectionMethod is random', () => {
			const array = new Array(100).fill(0).map((_, i) => i)

			const resp = p.rankSignals(array, 'random', 50)
			expect(resp).not.toEqual(array.slice(0, 50))
		})

		it('Returns the best trades when selectionmethod is "best"', () => {
			const array = new Array(100)
				.fill(0)
				.map((_, i) => ({ resultPercent: i }))
				.sort((a, b) => 0.5 - Math.random())

			const resp = p.rankSignals(array, 'best', 5)
			expect(resp).toEqual([
				{ resultPercent: 99 },
				{ resultPercent: 98 },
				{ resultPercent: 97 },
				{ resultPercent: 96 },
				{ resultPercent: 95 }
			])
		})

		it('Returns the worst trades when selectionmethod is "worst"', () => {
			const array = new Array(100)
				.fill(0)
				.map((_, i) => ({ resultPercent: i }))
				.sort((a, b) => 0.5 - Math.random())

			const resp = p.rankSignals(array, 'worst', 5)
			expect(resp).toEqual([
				{ resultPercent: 0 },
				{ resultPercent: 1 },
				{ resultPercent: 2 },
				{ resultPercent: 3 },
				{ resultPercent: 4 }
			])
		})

		it('returns original array if length is <= availableSlots', () => {
			const array = new Array(100)
				.fill(0)
				.map((_, i) => i)
				.sort((a, b) => 0.5 - Math.random())

			expect(p.rankSignals(array, 'random', 99)).not.toEqual(array)
			expect(p.rankSignals(array, 'random', 100)).toEqual(array)
		})
	})
})
