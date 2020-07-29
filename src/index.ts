import * as express from 'express'
import { Request, Response } from 'express'
import { config } from 'dotenv'
import * as bodyParser from 'body-parser'
import Backtester from './services/Backtester'
import Flipper from './models/strategies/Flipper'

config()
config({ path: './.env.local' })

console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS)

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
	if (!req.body.message) {
		const msg = 'invalid Pub/Sub message format'
		console.error(`error: ${msg}`)
		res.status(400).send(`Bad Request: ${msg}`)
		return
	}

	const pubSubMessage = req.body.message
	// const name = Buffer.from(pubSubMessage.data, 'base64').toString().trim()
	console.log(pubSubMessage)

	const backtester = new Backtester(new Flipper())

	await backtester.run()

	res.status(204).send()
})

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`))
