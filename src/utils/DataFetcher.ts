import Stock, { StockParams } from '../models/Stock'
import { GoogleAuth, IdTokenClient } from 'google-auth-library'

class DataFetcher {
	private API_URL: string
	private API_ENDPOINT: string
	#Auth: typeof GoogleAuth

	constructor({
		API_URL = process.env.API_URL,
		API_ENDPOINT = process.env.API_ENDPOINT,
		Auth = GoogleAuth,
	} = {}) {
		this.API_URL = API_URL
		this.API_ENDPOINT = API_ENDPOINT
		this.#Auth = Auth
	}

	private async getClient({ GoogleAuth = this.#Auth, url = this.API_URL } = {}): Promise<
		IdTokenClient
	> {
		const auth = new GoogleAuth()
		const client = await auth.getIdTokenClient(url)
		return client
	}

	/**
	 * Fetches single stock and the data specified
	 * @param {object} params
	 * @param {string} params.id id of the stock to fetch
	 * @param {string} params.fieldString The graphQL query string
	 * @returns {Stock} The data as an instance of Stock
	 */
	async fetchStock({
		id,
		fieldString = 'id, name, list, priceData{open, high, low, close, date}',
	}: {
		id: string | number
		fieldString?: string
	}): Promise<Stock> {
		const query = `{stock( id: ${id}) {${fieldString}}}`
		const client = await this.getClient()

		const { data } = (await client.request({
			url: this.API_URL + this.API_ENDPOINT,
			method: 'POST',
			data: { query },
		})) as any

		const stock = new Stock(data.data.stock as StockParams)

		return stock
	}

	async fetchSummary({ fieldString = 'id, name, list' }) {
		const query = `
		{
			stocks{
				${fieldString}
			}
		}`

		const client = await this.getClient()

		const { data } = (await client.request({
			url: this.API_URL + this.API_ENDPOINT,
			method: 'POST',
			data: { query },
		})) as any

		return data.data.stocks // TODO: Add typing
	}

	async fetchStocks({
		fieldString = 'id, name, list, priceData{open, high, low, close, date}',
	} = {}): Promise<Stock[]> {
		const query = `
		{
			stocks(type: "stock"){
				${fieldString}
			}
		}`

		const client = await this.getClient()

		const { data } = (await client.request({
			url: this.API_URL + this.API_ENDPOINT,
			method: 'POST',
			data: { query },
		})) as any

		return data.data.stocks.map((stock: StockParams) => new Stock(stock))
	}
}

export default DataFetcher
