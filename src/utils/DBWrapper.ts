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

	public async saveStats(
		documentName: string,
		name: string,
		description: string,
		data: unknown,
		{ db = this.db, statsCollection = this.statsCollection } = {}
	): Promise<void> {
		await db.collection(statsCollection).doc(documentName).set({ name, description, data })
	}

	public async clearPendingSignals({
		db = this.db,
		pendingSignalCollection = this.pendingSignalCollection,
	} = {}): Promise<void> {
		const allDocs = await db.collection(pendingSignalCollection).listDocuments()

		await Promise.all(allDocs.map(async (doc) => doc.delete()))
	}

	public async saveContext(
		id: string | number,
		context: StrategyContext,
		{ contextCollection = this.contextCollection } = {}
	): Promise<void> {
		await this.writeDocument(contextCollection, id, JSON.parse(JSON.stringify(context)))
	}
}
