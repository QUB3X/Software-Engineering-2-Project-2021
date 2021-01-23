import React, { useState } from "react"
import { Link, useParams } from "react-router-dom"

const FAKE_STORE = {
	id: "store-1",
	name: "Store 1",
	address: "Via Milano 16",
	open: true,
	distance: "0.6km",
	freeTimeslots: 12,
	queueLength: 15,
	queueWaitTime: "2008-09-22T14:01:54.9571247Z",
}

export default function StoreDetailView() {
	// storeId
	const storeId = useParams().id

	const [store, setStore] = useState(FAKE_STORE)

	const waitTime = new Date(store.queueWaitTime)
	const waitHours = waitTime.getHours()
	const waitMinutes = waitTime.getMinutes()

	// TODO: fetch data from server

	const _handleJoinQueue = () => {
		// TODO: send request to server
	}

	return (
		<div className="columns">
			<div className="column is-8 is-offset-2">
				<div className="section">
					<div className="level">
						<div className="level-left is-align-items-baseline">
							<p className="is-size-3 has-text-weight-bold mr-3">
								{store.name}
							</p>
							<p className="is-size-4 is-italic">
								<i>{store.address}</i>
							</p>
						</div>
						<div className="level-right">
							<Link
								to="/stores"
								className="button is-light is-primary"
							>
								Back to store map
							</Link>
						</div>
					</div>

					<div className="block box">
						<div className="columns is-mobile">
							<div className="column is-half has-text-centered">
								<b>Queue</b>
								<br />
								<b className="is-size-3">{store.queueLength}</b>
							</div>
							<div className="column is-half has-text-centered">
								<b>Enter in</b>
								<br />
								<b className="is-size-3">
									{waitHours}h {waitMinutes}m
								</b>
								<br />
							</div>
						</div>
					</div>

					<div className="block">
						<Link
							to={"/stores/" + storeId + "/timeslots"}
							className="button is-rounded is-primary is-outlined is-fullwidth has-text-weight-bold"
						>
							See available timeslots
						</Link>
						<p className="has-text-centered p-3">
							<b>OR</b>
						</p>
						<button
							className="button is-rounded is-primary is-fullwidth has-text-weight-bold"
							onClick={_handleJoinQueue}
						>
							Queue now
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
