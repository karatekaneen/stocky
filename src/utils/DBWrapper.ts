import { Firestore, Timestamp } from '@google-cloud/firestore'
import Signal from '../models/Signal'
import { StrategyContext } from 'src/types'
export default class DBWrapper {
	public db: Firestore
	public Timestamp: typeof Timestamp
	public signalCollection: string
	public pendingSignalCollection: string
	public contextCollection: string
	public statsCollection: string

	constructor({
		db = Firestore,
		_Timestamp = Timestamp,
		signalCollection = 'signals',
		pendingSignalCollection = 'pending-signals',
		contextCollection = 'context',
		statsCollection = 'statistics',
	} = {}) {
		this.db = new db()
		this.Timestamp = _Timestamp
		this.signalCollection = signalCollection
		this.pendingSignalCollection = pendingSignalCollection
		this.contextCollection = contextCollection
		this.statsCollection = statsCollection
	}

	/**
	 * Util method for writing to database.
	 * @param collection Name of the collection to write to
	 * @param id Id of the document to write
	 * @param data The data to write to the document
	 * @param deps Deps to be injected for testing
	 */
	async writeDocument(
		collection: string,
		id: string | number,
		data: any,
		{ db = this.db } = {}
	): Promise<void> {
		if (!(collection && id && data && typeof data === 'object' && !Array.isArray(data))) {
			throw new Error('Missing data')
		}

		const docId = typeof id === 'string' ? id : id.toString()

		await db.collection(collection).doc(docId).set(data)
	}

	/**
	 * Save signals in to each stock's signals document
	 * @param id Id of the stock that the signals belong to
	 * @param signals The signals to write to the database
	 * @param settings General settings
	 */
	public async saveSignals(
		id: string | number,
		signals: Signal[],
		{ signalCollection = this.signalCollection } = {}
	): Promise<void> {
		if (!signals || signals.length === 0) {
			return
		}

		await this.writeDocument(signalCollection, id, {
			signals: signals.map((s) => JSON.parse(JSON.stringify(s))),
		})
	}

	/**
	 * Writes the pending signal to the collection with the stock's id as document id
	 * @param id Id of the stock that got a pending signal
	 * @param pendingSignal The signal that was triggered
	 * @param Settings General settings
	 */
	public async savePendingSignal(
		id: string | number,
		pendingSignal: Signal | null,
		{ pendingSignalCollection = this.pendingSignalCollection } = {}
	): Promise<void> {
		if (!pendingSignal) return

		await this.writeDocument(
			pendingSignalCollection,
			id,
			JSON.parse(JSON.stringify(pendingSignal))
		)
	}

	/**
	 * Writes statistics to the database. Uses the first parameter as document name.
	 * @param documentName Name of the document to use
	 * @param name Name of the statistic being written
	 * @param description Description of the stats
	 * @param data The actual statistics
	 * @param settings General Settings
	 */
	public async saveStats(
		documentName: string,
		name: string,
		description: string,
		data: unknown,
		{ statsCollection = this.statsCollection } = {}
	): Promise<void> {
		await this.writeDocument(statsCollection, documentName, {
			name,
			description,
			data,
		})
	}

	/**
	 * Removes all documents in the "Pending signal" collection to reset each day.
	 * @param deps To be injected for testing
	 */
	public async clearPendingSignals({
		db = this.db,
		pendingSignalCollection = this.pendingSignalCollection,
	} = {}): Promise<void> {
		const allDocs = await db.collection(pendingSignalCollection).listDocuments()

		await Promise.all(allDocs.map(async (doc) => doc.delete()))
	}

	/**
	 * Saves the context to each stocks context document in the database's context collection.
	 * @param id Id of the stock that the context belongs to
	 * @param context The actual data to write to the database
	 * @param settings General settings
	 */
	public async saveContext(
		id: string | number,
		context: StrategyContext,
		{ contextCollection = this.contextCollection } = {}
	): Promise<void> {
		await this.writeDocument(contextCollection, id, JSON.parse(JSON.stringify(context)))
	}
}
