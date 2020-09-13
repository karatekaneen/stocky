import * as express from 'express'
import { Request, Response } from 'express'
import { config } from 'dotenv'
import * as bodyParser from 'body-parser'
import Backtester from './services/Backtester'
import Flipper from './models/strategies/Flipper'
import Analyzer from './utils/Analyzer'

config()
config({ path: './.env.local' })

const app = express()
app.use(bodyParser.json())

const PORT = process.env.PORT || 8080

app.post('/', async (req: Request, res: Response) => {
	console.log(req.body)
	if (!req.body) {
		const msg = 'no Pub/Sub message received'
		console.error(`error: ${msg}`)
		res.status(400).send(`Bad Request: ${msg}`)
		return
	}

	const backtester = new Backtester(new Flipper())

	const responses = await backtester.run()

	const { volumeRatios, volumeComparison } = responses.reduce(
		(acc, { volumeComparison, volumeRatios }) => {
			acc.volumeComparison.push(volumeComparison)
			acc.volumeRatios.push(volumeRatios)

			return acc
		},
		{ volumeComparison: [], volumeRatios: [] }
	)

	await Promise.all([
		Analyzer.mergeAndSaveVolumeComparisons(
			volumeComparison,
			'volume-to-result',
			'result compared to volume traded',
			'The 200d average traded volume compared to the result of each trade'
		),
		Analyzer.mergeAndSaveVolumeComparisons(
			volumeRatios,
			'volume-ratio-to-result',
			'result compared to volume ratio',
			'The 200d average traded volume compared to the 50d avg traded volume and the result of each trade'
		),
	])

	res.status(204).send()
})

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
