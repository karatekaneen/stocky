import { Firestore, Timestamp } from '@google-cloud/firestore'
import Signal from '../models/Signal'
import { StrategyContext } from 'src/types'
export default class DBWrapper {
	public db: Firestore
	public Timestamp: typeof Timestamp
	public signalCollection: string
	public pendingSignalCollection: string
	public contextCollection: string

	constructor({
		db = Firestore,
		_Timestamp = Timestamp,
		signalCollection = 'signals',
		pendingSignalCollection = 'pending-signals',
		contextCollection = 'context',
	} = {}) {
		this.db = new db()
		this.Timestamp = _Timestamp
		this.signalCollection = signalCollection
		this.pendingSignalCollection = pendingSignalCollection
		this.contextCollection = contextCollection
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

	public async saveContext(
		id: string | number,
		context: StrategyContext,
		{ contextCollection = this.contextCollection } = {}
	): Promise<void> {
		await this.writeDocument(contextCollection, id, JSON.parse(JSON.stringify(context)))
	}
}
