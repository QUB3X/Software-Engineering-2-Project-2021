const dotenv = require("dotenv")
dotenv.config()

const mysql = require("promise-mysql")
const uuid = require("uuid")

/**
 * Query Manageris a component that handles the interactions with the database,
 * acting as a mediator betweenthe business and data layer.  It sends to and
 * retrieves data from the database exposing a limited and higherlevel set of
 * functionalities compared to a database query language.
 *
 * @module QueryManager
 */

var mysqlConnection

/**
 * Call this method to obtain the only instance of QueryManager.
 * QueryManager handles the connection with the database.
 * @returns {object} containing the methods
 */
exports.getQueryInterface = async () => {
	if (mysqlConnection === undefined) {
		mysqlConnection = await mysql.createConnection({
			multipleStatements: true,
			host: process.env.DB_ADDRESS,
			user: process.env.DB_USERNAME,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_NAME,
		})
	}

	return {
		/**
		 * This method is intended to be used mostly for testing.
		 * It allows to perform a series of database operations,
		 * passed in the callback, and then rolls back any change.
		 *
		 * @param {Function} callback
		 */
		executeAndRollback: async (callback) => {
			await mysqlConnection.beginTransaction()
			try {
				await callback()
			} catch (err) {
				await mysqlConnection.rollback()
				throw err
			}
			await mysqlConnection.rollback()
		},

		/**
		 * This method takes as an input the phone numberof the user (phoneNum)
		 * and contacts the database to check if the phone number is already
		 * present in the system.
		 *
		 * @param {string} phoneNum
		 * @returns {boolean} whether the phoneNum is present
		 */
		checkIfPhoneNumberIsPresent: async (phoneNum) => {
			return (
				(
					await mysqlConnection.query(
						"select count(*) as count from user where id = ?",
						phoneNum
					)
				)[0].count === 1
			)
		},

		/**
		 * This method takes as an input the phone number (phoneNum) of the
		 * user to be created and adds it to the database.
		 *
		 * @param {string} phoneNum the user's phone number
		 * @param {string} name the user's name
		 * @param {string} surname the user's surname
		 * @returns the result of the query
		 */
		createUser: async (phoneNum, name, surname) => {
			return await mysqlConnection.query(
				"insert into user (id, name, surname) values (?,?,?)",
				[phoneNum, name, surname]
			)
		},

		/**
		 * This method takes as an input the phone number (phoneNum) of the
		 * user that is trying to login into the system and it generates the
		 * token associated with itssession. Saving those information in the
		 * database.
		 *
		 * @param {string} phoneNum
		 * @returns the authentication token
		 */
		createUserToken: async (phoneNum) => {
			await mysqlConnection.query(
				"delete from token where user_id = ?",
				phoneNum
			)

			const userToken = uuid.v4()

			await mysqlConnection.query(
				"insert into token (user_id, token, end_timestamp) values (?, ?, TIMESTAMP('2025-01-01'))",
				[phoneNum, userToken]
			)

			return userToken
		},

		/**
		 * This method takes as an input the token passed by the user in every
		 * request and checks if it is valid and corresponds to an active
		 * session, if it's successful, return the userId if found.
		 *
		 * @param {string} token the user's authentication token
		 * @returns the userId if found
		 */
		validateToken: async (token) => {
			const res = await mysqlConnection.query(
				"select id from token where token = ?",
				token
			)

			if (res.length === 0) {
				throw "Token not found"
			}

			return res[0].id
		},

		/**
		 * This method takes as input the store identification number.
		 * TheQueryManager will acquire from the database the informations
		 * regarding the queue overall status ofthe given storeID.
		 *
		 * @param {string} storeID the id of a store
		 * @returns the number of customers present in the queue
		 */
		getQueueData: async (storeID) => {
			return await mysqlConnection.query(
				"select count(*) as count from ticket where type = 'queue' and status = 'valid' and store_id = ?",
				storeID
			)[0].count
		},

		/**
		 * This method returns the maximum capacity of a store and the current
		 * number of people inside it.
		 *
		 * @param {string} storeID
		 * @returns max_capacity, curr_number
		 */
		getStoreFillLevel: async (storeID) => {
			return await mysqlConnection.query(
				"select max_capacity, curr_number from store where id = ?",
				storeID
			)[0]
		},

		/**
		 * Returns the number of possible reservation remaining in the next
		 * specified hours from the moment this method is called.
		 *
		 * For example, if you call this method with `hours = 2`, you'll get
		 * the number of reservations available in the next two hours.
		 *
		 * @param {string} storeID
		 * @param {number} hours the time span
		 * @returns the number of
		 */
		getStoreNextReservations: async (storeID) => {
			const currentDate = new Date()
			return await mysqlConnection.query(
				"select sum(max_people_allowed) as sum from reservation where store_id = ? and weekday = ? and start_time >= getdate() and start_time <= dateadd(HOUR, ?, getdate())",
				[storeID, currentDate.getDay(), hours]
			)[0].sum
		},

		/**
		 * This method takes as input the store id.
		 * The QueryManager will acquire from the database the informations
		 * regarding the reservation overall status of the given storeID.
		 *
		 * @param {string} storeID
		 * @returns
		 */
		getReservationData: async (storeID) => {
			return await mysqlConnection.query("")
		},

		/**
		 * This method takes as input the id of the user and
		 * the store. It adds those values to the dedicated
		 * table in the database. Returns the receiptId.
		 *
		 * @param {string} userID
		 * @param {*} storeID
		 * @returns the `receiptId` of this operation.
		 */
		addUserToQueue: async (userID, storeID) => {
			return (
				await mysqlConnection.query(
					"insert into ticket (type, status, creation_date, store_id, user_id) values ('queue', 'valid', CURDATE(), ?, ?); select last_insert_id() as id;",
					[storeID, userID]
				)
			)[1][0].id
		},

		/**
		 * This method creates a new store entry in the database
		 * and returns its id.
		 *
		 * @param {string} name
		 * @param {string} address
		 * @param {number} capacity the initial maximum capacity of the store
		 * @param {number} latitude
		 * @param {number} longitude
		 *
		 * @returns the id of the store
		 */
		createStore: async (name, address, capacity) => {
			return (
				await mysqlConnection.query(
					"insert into store (name, address, max_capacity, latitude, longitude) values (?, ?, ?, ?, ?); select last_insert_id() as id;",
					[name, address, capacity, latitude, longitude]
				)
			)[1][0].id
		},

		/**
		 * This method adds a verification code associated to a user to
		 * the database.
		 *
		 * @param {string} phoneNum
		 * @param {code} code
		 */
		addVerificationCode: async (phoneNum, code) => {
			await mysqlConnection.query(
				"insert into verification_code values (?, ?)",
				[phoneNum, code]
			)
		},

		/**
		 * Check whether a verification code is present for a user phone number
		 * in the database. If it's present, it removes such code from the
		 * database.
		 *
		 * @param {string} phoneNum
		 * @param {string} code
		 * @returns {boolean}
		 */
		checkVerificationCode: async (phoneNum, code) => {
			let res = await mysqlConnection.query(
				"select count(*) as count from verification_code where number = ? and code = ?",
				[phoneNum, code]
			)

			res = res[0].count > 0

			if (res) {
				await mysqlConnection.query(
					"delete from verification_code where number = ? and code = ?",
					[phoneNum, code]
				)
			}

			return res
		},

		/**
		 * Get stores inside a range from a certain location
		 * @param {number} lat
		 * @param {number} long
		 * @param {number} range
		 * @returns a list of stores
		 */
		getStoreIds: async (lat, long, range) => {
			return await mysqlConnection.query(
				"select * from store where latitude between ? and ? and longitude between ? and ?",
				[lat - range, lat + range, long - range, long + range]
			)
		},

		/**
		 * This method retrieves from the database the first queue ticket of a
		 * given store.
		 *
		 * @param {string} storeID
		 * @returns
		 */
		getFirstQueueTicket: async (storeID) => {
			return await mysqlConnection.query(
				"select count(*) as count from ticket as t where t.type = 'queue' and t.store_id = ? and t.status = 'valid' order by creation_date asc limit 1",
				[storeID]
			)
		},

		/**
		 * This method marks a ticket as cancelled.
		 *
		 * @param {string} storeID
		 * @param {string} ticketID
		 * @param {string} userID
		 * @returns
		 */
		cancelTicket: async (storeID, ticketID, userID) => {
			return await mysqlConnection.query(
				"alter table ticket set status = 'cancelled' where status = 'valid' and id = ? and store_id = ? and user_id = ?",
				[ticketID, storeID, userID]
			)
		},

		/**
		 * This method takes as input the identificaton number of the user,
		 * the store and the selected timeslotId.
		 * It adds those values to the dedicated table in the database.
		 *
		 * @param {string} storeId
		 * @param {string} reservationId
		 * @param {string} userId
		 * @returns the `receiptId`
		 */
		createUserReservation: async (storeId, reservationId, userId) => {
			return await mysqlConnection.query(
				"insert into ticket (type, status, creation_date, store_id, user_id, reservation_id) values (reservation, valid, CURDATE(), ?, ?, ?); select last_insert_id() as id;",
				[storeId, userId, reservationId]
			)[1][0].id
		},

		/**
		 * Destroy the instance of the MySQL connection in a safe way.
		 */
		globalEnd: async () => {
			const toEnd = mysqlConnection
			mysqlConnection = null
			await toEnd.end()
		},
	}
}
