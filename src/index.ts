import * as express from 'express'
import { Request, Response } from 'express'
import { config } from 'dotenv'
import * as bodyParser from 'body-parser'
import Backtester from './services/Backtester'
import Flipper from './models/strategies/Flipper'
import { writeFileSync } from 'fs'

config()
config({ path: './.env.local' })

const app = express()
app.use(bodyParser.json())

const PORT = process.env.PORT || 8080
;(async () => {
	const backtester = new Backtester(new Flipper())

	const responses = await backtester.run()
	writeFileSync('wtf', JSON.stringify(responses, null, 2))
})()

app.post('/', async (req: Request, res: Response) => {
	try {
		if (!req.body) {
			const msg = 'no Pub/Sub message received'
			console.error(`error: ${msg}`)
			res.status(400).send(`Bad Request: ${msg}`)
			return
		}

		const backtester = new Backtester(new Flipper())

		await backtester.run()

		res.status(204).send()
	} catch (err) {
		console.error(err)
		res.status(500).send()
	}
})

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
