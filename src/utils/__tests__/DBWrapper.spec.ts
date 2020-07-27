import DBWrapper from '../DBWrapper'
jest.mock('@google-cloud/firestore')

describe('Database Wrapper', () => {
	let d: DBWrapper

	beforeEach(() => {
		d = new DBWrapper()
	})

	it('has a working constructor', () => {
		expect(d).toBeInstanceOf(DBWrapper)
	})

	describe('Write document', () => {
		let collection: any, doc: any, set: any, db: any

		beforeEach(() => {
			set = jest.fn().mockResolvedValue(true)
			doc = jest.fn().mockReturnValue({ set })
			collection = jest.fn().mockReturnValue({ doc })
			db = { collection }
		})

		it('Uses the collection provided', async () => {
			await d.writeDocument('custom', '123', {}, { db })

			expect(collection).toHaveBeenCalledWith('custom')
		})

		it('Uses the document id provided', async () => {
			await d.writeDocument('custom', '123', {}, { db })

			expect(doc).toHaveBeenCalledWith('123')
		})

		it.each([
			['collection', 'id', null],
			['collection', '', { data: 'my-data' }],
			['', 'id', { data: 'my-data' }],
			['', '', null],
			[null, null, null],
		])('throws if required field is missing', async (col: any, id: any, data: any) => {
			expect.hasAssertions()

			try {
				await d.writeDocument(col, id, data, { db })
			} catch (err) {
				expect(err.message).toBeTruthy()
			}
		})

		it.each([[42, 25], 42, 'data', null, undefined, [{ data: 'hello' }]])(
			'Throws if data is not an object',
			async (data) => {
				expect.hasAssertions()

				try {
					await d.writeDocument('collection', 'id', data, { db })
				} catch (err) {
					expect(err.message).toBeTruthy()
				}
			}
		)

		it('Converts id to string', async () => {
			await d.writeDocument('collection', 42, { data: 'hello' }, { db })

			expect(doc).toHaveBeenCalledWith('42')
		})

		it('Propagates db errors', async () => {
			expect.hasAssertions()

			set.mockRejectedValue(new Error('this went poopoo'))

			try {
				await d.writeDocument('collection', 42, { data: 'hello' }, { db })
			} catch (err) {
				expect(err.message).toBe('this went poopoo')
			}
		})
	})

	describe('Save Signals', () => {
		let writeDocument: any

		beforeEach(() => {
			writeDocument = jest.fn()

			d.writeDocument = writeDocument
		})

		it('Uses the provided collection', async () => {
			await d.saveSignals('123', [{ data: 'signal' }] as any, {
				signalCollection: 'custom-collection',
			})

			expect(writeDocument.mock.calls[0][0]).toBe('custom-collection')
		})

		it('Uses default collection if none provided', async () => {
			await d.saveSignals('123', [{ data: 'signal' }] as any)

			expect(writeDocument.mock.calls[0][0]).toBe('signals')
		})

		it('Does not try to call if array is empty', async () => {
			await d.saveSignals('123', [] as any)

			expect(writeDocument).not.toBeCalled()
		})

		it('Propagates errors', async () => {
			expect.hasAssertions()

			writeDocument.mockRejectedValue(new Error('this went poopoo'))

			try {
				await d.saveSignals('123', [{ data: 'signal' }] as any)
			} catch (err) {
				expect(err.message).toBe('this went poopoo')
			}
		})

		it('Calls to write to db', async () => {
			await d.saveSignals('123', [{ data: 'signal' }] as any)

			expect(writeDocument.mock.calls[0][1]).toBe('123')
			expect(writeDocument.mock.calls[0][2]).toEqual({ signals: [{ data: 'signal' }] })
		})
	})

	describe('Save Pending Signals', () => {
		let writeDocument: any

		beforeEach(() => {
			writeDocument = jest.fn()

			d.writeDocument = writeDocument
		})

		it('Uses the provided collection', async () => {
			await d.savePendingSignal('123', { data: 'signal' } as any, {
				pendingSignalCollection: 'custom-collection',
			})

			expect(writeDocument.mock.calls[0][0]).toBe('custom-collection')
		})

		it('Uses default collection if none provided', async () => {
			await d.savePendingSignal('123', { data: 'signal' } as any)

			expect(writeDocument.mock.calls[0][0]).toBe('pending-signals')
		})

		it('Does not try to call if signal is null', async () => {
			await d.savePendingSignal('123', null as any)

			expect(writeDocument).not.toHaveBeenCalled()
		})

		it('Propagates errors', async () => {
			expect.hasAssertions()

			writeDocument.mockRejectedValue(new Error('this went poopoo'))

			try {
				await d.savePendingSignal('123', { data: 'signal' } as any)
			} catch (err) {
				expect(err.message).toBe('this went poopoo')
			}
		})

		it('Calls to write to db', async () => {
			await d.savePendingSignal('123', { data: 'signal' } as any)

			expect(writeDocument.mock.calls[0][1]).toBe('123')
			expect(writeDocument.mock.calls[0][2]).toEqual({ data: 'signal' })
		})
	})

	describe('Save Context', () => {
		let writeDocument: any

		beforeEach(() => {
			writeDocument = jest.fn()

			d.writeDocument = writeDocument
		})

		it('Uses the provided collection', async () => {
			await d.saveContext('123', { data: 'context' } as any, {
				contextCollection: 'custom-collection',
			})

			expect(writeDocument.mock.calls[0][0]).toBe('custom-collection')
		})

		it('Uses default collection if none provided', async () => {
			await d.saveContext('123', { data: 'context' } as any)

			expect(writeDocument.mock.calls[0][0]).toBe('context')
		})

		it('Propagates errors', async () => {
			expect.hasAssertions()

			writeDocument.mockRejectedValue(new Error('this went poopoo'))

			try {
				await d.saveContext('123', { data: 'context' } as any)
			} catch (err) {
				expect(err.message).toBe('this went poopoo')
			}
		})

		it('Calls to write to db', async () => {
			await d.saveContext('123', { data: 'context' } as any)

			expect(writeDocument.mock.calls[0][1]).toBe('123')
			expect(writeDocument.mock.calls[0][2]).toEqual({ data: 'context' })
		})
	})
})
