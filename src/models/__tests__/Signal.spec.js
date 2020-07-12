import Signal from '../Signal'

let validInput

let signal

beforeEach(() => {
	validInput = {
		stock: { name: 'HM B', id: '1235', list: 'Large Cap sthlm' },
		price: 99,
		date: new Date('2020-01-19T15:16:36.143Z'),
		action: 'buy',
		type: 'enter'
	}

	signal = new Signal(validInput)
})
describe('Signal', () => {
	it('has a working constructor', () => {
		expect(signal instanceof Signal).toBe(true)
		expect(signal).toEqual({
			action: 'buy',
			date: new Date('2020-01-19T15:16:36.143Z'),
			price: 99,
			status: 'executed',
			stock: { id: '1235', list: 'Large Cap sthlm', name: 'HM B' },
			type: 'enter'
		})
	})

	describe('Input validation', () => {
		it('Works with valid input', () => {
			expect(signal.validateInput(validInput)).toBe(true)
		})

		it.each([[null, undefined, false]])('When stock is %p it throws', input => {
			const clone = { ...validInput }
			clone.stock = input

			try {
				const s = new Signal(clone)
			} catch (err) {
				expect(err.message).toBe('Required field missing')
			}
		})

		it('Requires price to be a valid number', () => {
			const clone = { ...validInput }
			clone.price = null

			try {
				const s = new Signal(clone)
			} catch (err) {
				expect(err.message).toBe('Required field missing')
			}
		})

		it('Price and date CAN be null on the last bar to create a "pending" signal', () => {
			const bothNull = { ...validInput }
			bothNull.price = null
			bothNull.date = null

			const s = new Signal(bothNull)

			expect(s instanceof Signal).toBe(true)
			expect(s.status).toBe('pending')
		})

		it('Requires price to be positive number', () => {
			const clone = { ...validInput }
			clone.price = -2

			try {
				const s = new Signal(clone)
			} catch (err) {
				expect(err.message).toBe('Required field missing')
			}
		})

		it('requires date to be Date instance', () => {
			const clone = { ...validInput }
			clone.date = clone.date.toString()

			try {
				const s = new Signal(clone)
			} catch (err) {
				expect(err.message).toBe('Required field missing')
			}
		})

		it.each([[null, '', false, 'buy', 'sell'], [false, false, false, true, true]])(
			'requires action to be buy or sell',
			(input, valid) => {
				expect.assertions(1)
				const clone = { ...validInput }
				clone.action = input

				try {
					const s = new Signal(clone)
					if (valid) {
						expect(s instanceof Signal).toBe(true)
					}
				} catch (err) {
					expect(err.message).toBe('Required field missing')
				}
			}
		)

		it.each([['BUY', 'SeLl', 'BuY', 'buy', 'sell']])('action is case insensitive', input => {
			expect.assertions(1)
			const clone = { ...validInput }
			clone.action = input

			const s = new Signal(clone)
			expect(s instanceof Signal).toBe(true)
		})

		it.each([[null, 'buy', false, 'enter', 'exit'], [false, false, false, true, true]])(
			'requires type to be enter or exit',
			(input, valid) => {
				expect.assertions(1)
				const clone = { ...validInput }
				clone.type = input

				try {
					const s = new Signal(clone)
					if (valid) {
						expect(s instanceof Signal).toBe(true)
					}
				} catch (err) {
					expect(err.message).toBe('Required field missing')
				}
			}
		)

		it.each([['enTER', 'eXit', 'ENTER', 'exit', 'enter']])('type is case insensitive', input => {
			expect.assertions(1)
			const clone = { ...validInput }
			clone.type = input

			const s = new Signal(clone)
			expect(s instanceof Signal).toBe(true)
		})
	})
})
