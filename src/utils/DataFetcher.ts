import axios from 'axios'
import Stock, { StockParams } from '../models/Stock'

class DataFetcher {
	private API_URL: string
	#axios: typeof axios

	constructor({
		_axios = axios,
		API_URL = 'http://localhost:4000/graphql?', // TODO Make API_URL an env-variable
	} = {}) {
		this.API_URL = API_URL
		this.#axios = _axios
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
		const { data } = await this.#axios.post(this.API_URL, { query })
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
		const { data } = await this.#axios.post(this.API_URL, { query })
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
		const { data } = await this.#axios.post(this.API_URL, { query })
		return data.data.stocks.map((stock: StockParams) => new Stock(stock))
	}
}

export default DataFetcher
