const StoreSearch = require("./components/StoreSearch")
const AccountManager = require("./components/AccountManager")
const QueueManager = require("./components/QueueManager")
const ReservationManager = require("./components/ReservationManager")
const TicketManager = require("./components/TicketManager")

const express = require("express")
const app = express()
const cors = require("cors")
const port = 3000

// Start the server
app.listen(port, () => {
	console.log(`CLup listening at http://localhost:${port}`)
})

// Middleware
app.use(express.json())
app.use(cors())

// Utility
/**
 * If the user is authenticated returns its userId, otherwise sends a
 * 401 error to the client and throws.
 *
 * @param {Request} req
 * @param {Response} res
 * @returns userId
 * @throws InvalidAuthTokenError if user is not authenticated
 */
const _validateToken = async (req, res) => {
	// Verify that user have valid token to authenticate
	let authToken = req.header("X-Auth-Token")
	try {
		return await AccountManager.validateToken(authToken)
	} catch (e) {
		res.status(401).send("Invalid auth token")
		throw new InvalidAuthTokenError()
	}
}

/* REST ENDPOINTS */
app.get("/", (req, res) => {
	res.status(200).send("CLup API")
})

app.post("/api/auth/login", async (req, res) => {
	let phoneNum = req.body.phoneNumber
	// console.log(phoneNum)
	try {
		console.log(`/api/auth/login <-- phoneNum=${phoneNum}`)
		await AccountManager.loginWithPhoneNumber(phoneNum)
		res.status(200).send("OK - phoneNumber received")
	} catch (err) {
		console.error(err)
		res.status(400).send("Format is invalid")
	}
})

app.post("/api/auth/code", async (req, res) => {
	let phoneNum = req.body.phoneNumber
	let SMSCode = req.body.SMSCode
	try {
		console.log(
			`/api/auth/code <-- phoneNum=${phoneNum}; SMSCode=${SMSCode}`
		)
		await AccountManager.verifyPhoneNumber(phoneNum, SMSCode)
		const authToken = await AccountManager.getAccountToken(phoneNum)
		res.status(200).send({
			authToken: authToken,
		})
	} catch (err) {
		console.error(err)
		res.status(400).send(err.message)
	}
})

app.get("/api/search/:coordinates", async (req, res) => {
	try {
		let x = await _validateToken(req, res)
	} catch (error) {
		return
	}

	let rawCoordinates = req.params.coordinates
	let [lat, long] = rawCoordinates.split("|")
	if (lat === undefined || long === undefined) {
		res.status(400).send("Bad request")
		return
	}
	lat = parseFloat(lat)
	long = parseFloat(long)

	try {
		let stores = await StoreSearch.getStores(lat, long)
		console.log("server --> client : sending stores list")
		console.log(stores)
		res.status(200).send(stores)
	} catch (err) {
		res.status(404).send("Store not found")
	}
})

app.get("/api/store/:storeId", async (req, res) => {
	let storeId = req.params.storeId

	try {
		await _validateToken(req, res)

		let storeData, queueData, reservationData

		try {
			storeData = await StoreSearch.getStore(storeId)
		} catch (err) {
			res.status(404).send("Store not found")
		}
		try {
			queueData = await QueueManager.getQueueData(storeId)
		} catch (err) {
			queueData = {}
		}
		try {
			reservationData = await ReservationManager.getReservationData(
				storeId
			)
		} catch (err) {
			reservationData = {}
		}
		console.log(storeData)
		console.log(queueData)
		console.log(reservationData)

		// return a merged json object
		res.status(200).json({
			...storeData,
			...queueData,
			...reservationData,
		})
	} catch (error) {
		return
	}
})

app.post("/api/store/:storeId/queue/join", async (req, res) => {
	let storeId = req.params.storeId

	try {
		let userId = await _validateToken(req, res)

		try {
			let receiptId = await QueueManager.joinQueue(storeId, userId)
			res.status(200).json({ receiptId: receiptId })
		} catch (err) {
			// TODO: Handle also the case where user is already in queue, and return status code 503
			res.status(404).send("Store not found")
			return
		}
	} catch (error) {
		return
	}
})

app.post("/api/store/:storeId/queue/leave", async (req, res) => {
	let storeId = req.params.storeId
	let ticketId = req.body.queueReceiptId

	try {
		let userId = await _validateToken(req, res)
		try {
			console.log(
				`Leaving queue: (S: ${storeId} U:${userId} T:${ticketId})`
			)
			await QueueManager.cancelQueueTicket(storeId, ticketId, userId)
			res.status(200).send("OK")
		} catch (err) {
			console.log(err)
			res.status(404).send("Receipt not found")
			return
		}
	} catch (error) {
		return
	}
})

app.get("/api/store/:storeId/reservation/timeslots", async (req, res) => {
	let storeId = req.params.storeId

	try {
		await _validateToken(req, res)

		try {
			const reservations = await ReservationManager.getReservationData(
				storeId
			)
			res.status(200).send(reservations)
		} catch (err) {
			res.status(404).send("Store not found")
		}
	} catch (e) {
		return
	}
})

app.post(
	"/api/store/:storeId/reservation/book/:timeslotId",
	async (req, res) => {
		let storeId = req.params.storeId
		let timeslotId = req.params.timeslotId

		try {
			let userId = await _validateToken(req, res)

			try {
				const receiptId = await ReservationManager.makeReservation(
					storeId,
					timeslotId,
					userId
				)
				res.status(200).send({ receiptId: receiptId })
			} catch (err) {
				console.log(err)
				res.status(404).send("Store not found")
			}
		} catch (e) {
			return
		}
	}
)

app.post("/api/store/:storeId/reservation/cancel", async (req, res) => {
	let storeId = req.params.storeId
	let ticketId = req.body.reservationReceiptId

	try {
		let userId = await _validateToken(req, res)

		try {
			console.log(
				`Canceling reservation: (S:${storeId} U:${userId} T:${ticketId})`
			)
			let receipt = await ReservationManager.cancelReservation(
				storeId,
				ticketId,
				userId
			)
			res.status(200).send(receipt)
		} catch (err) {
			res.status(404).send("Store/receipt not found")
			return
		}
	} catch (error) {
		return
	}
})

app.get("/api/user/ticket", async (req, res) => {
	try {
		let userId = await _validateToken(req, res)

		try {
			let ticket = await TicketManager.getTicket(userId)
			console.log(ticket)
			res.status(200).send(ticket)
		} catch (err) {
			res.status(404).send("No tickets found")
			return
		}
	} catch (error) {
		return
	}
})

app.post("/api/store/:storeId/ticket/verify", async (req, res) => {
	let storeId = req.params.storeId
	let ticketId = req.body.receiptId

	console.log(`Validating ticket: ${storeId} ${ticketId}`)

	try {
		const userId = await _validateToken(req, res)

		if (!(await AccountManager.isTotem(userId))) {
			res.status(401).send("Access forbidden")
			return
		}

		try {
			let isValid = false
			isValid = await TicketManager.checkTicket(storeId, ticketId)
			console.log(`${ticketId} is ${isValid ? "valid" : "not valid"}!`)
			res.status(200).send({
				isTicketValid: isValid,
			})
		} catch (err) {
			res.status(404).send("Store/receipt not found")
			return
		}
	} catch (error) {
		return
	}
})

app.post("/api/store/:storeId/checkout", async (req, res) => {
	let storeId = req.params.storeId

	try {
		await TicketManager.checkout(storeId)
		res.status(200).send("")
	} catch (err) {
		res.status(404).send("")
	}
})

// TESTING
// Export the server instance so that we can test it with Supertest and Jest
module.exports = app
