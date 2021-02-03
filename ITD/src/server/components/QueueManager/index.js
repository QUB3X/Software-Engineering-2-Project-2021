const QueryManager = require("./../QueryManager/index")

/**
 * This method takes as input the identification number of the store.
 * The QueueManager will then contact the QueryManager to insert the user
 * into the correct queue.
 *
 * @param {string} storeId
 * @param {string} userId
 * @returns the ticketId to be sent to the user
 */
exports.joinQueue = async (storeId, userId) => {
	const queryInterface = await QueryManager.getQueryInterface()
	// "Q" added to distinguish between Queue tickets and Reservation tickets
	let code = "Q" + (await queryInterface.addUserToQueue(userId, storeId))
	// console.log("QueueManager: added " + code)

	return code
}

/**
 * This method takes as input the identification number of the ticket and
 * the store. It checks by contacting the QueryManager if the provided
 * ticket is currently valid for the selected store.
 * If the ticket is valid it is automatically used.
 *
 * @param {string} storeId
 * @param {string} ticketId
 * @returns whether the ticket is valid
 */
exports.isTicketValid = async (storeId, ticketId) => {
	const queryInterface = await QueryManager.getQueryInterface()

	const firstTicket = await queryInterface.getFirstQueueTicket(storeId)

	if (firstTicket.id == ticketId) {
		const storeData = await queryInterface.getStoreFillLevel(storeId)
		const reservations = await queryInterface.getStoreNextReservations(
			storeId,
			2
		)

		if (storeData.curr_number + reservations < storeData.max_capacity) {
			await queryInterface.useTicket(storeId, ticketId)

			// start to consider the next ticket
			try {
				const nextTicket = await queryInterface.getFirstQueueTicket(
					storeId
				)
			} catch (err) {
				// do nothing
			}

			return true
		}
	}

	return false
}

/**
 * This method takes as input the identification number of the ticket.
 * It removes the associated reservation.
 *
 * @param {string} storeId
 * @param {string} ticketId
 * @param {string} userId
 */
exports.cancelQueueTicket = async (storeId, ticketId, userId) => {
	const queryInterface = await QueryManager.getQueryInterface()

	queryInterface.cancelTicket(storeId, ticketId, userId)
}

/**
 * This method takes as an input the store identification number and contacts
 * the QueryManager to get the queue data on the specified store id.
 * @param {string} storeId
 * @returns queue data
 */
exports.getQueueData = async (storeId) => {
	const queryInterface = await QueryManager.getQueryInterface()

	return await queryInterface.getQueueData(storeId)
}
