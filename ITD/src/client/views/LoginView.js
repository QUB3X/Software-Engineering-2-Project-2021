import React, { useState } from "react"
import cookie from "react-cookies"
import { Redirect } from "react-router-dom"
import Button from "../components/Button"
import ErrorMsg from "../components/ErrorMsg"
import { PhoneField, TextField } from "../components/Field"
import { API_BASE_URL, MAX_CODE_LENGTH, MAX_PHONE_LENGTH } from "../defaults"
export default function LoginView() {
	// Declare state
	const [loginStep, setLoginStep] = useState(0)
	const [phoneNum, setPhoneNum] = useState(null)
	const [authCode, setAuthCode] = useState(null)
	const [errorMsg, setErrorMsg] = useState("")
	const _handleLoginBack = () => {
		if (loginStep > 0) setLoginStep(loginStep - 1)
	}

	const _handleLoginNext = async () => {
		try {
			if (loginStep === 0) {
				// Send phone number to API
				const res = await fetch(API_BASE_URL + "auth/login", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						phoneNumber: phoneNum,
					}),
				})
				if (res.status === 200) {
					// If sent with success, proceed to next step
					console.log(res.statusText)
					if (loginStep < 2) setLoginStep(loginStep + 1)
				} else {
					setErrorMsg(await res.text())
				}
			}
			if (loginStep === 1) {
				// Verify auth code with API
				const res = await fetch(API_BASE_URL + "auth/code", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						phoneNumber: phoneNum,
						SMSCode: authCode,
					}),
				})
				if (res.status === 200) {
					// If SMSCode is validated with success
					console.log(res.statusText)
					// Save authToken in cookies
					let json = await res.json()
					cookie.save("authToken", json.authToken, { path: "/" })
					// Proceed to next step
					if (loginStep < 2) setLoginStep(loginStep + 1)
				} else {
					setErrorMsg(await res.text())
				}
			}
		} catch (error) {
			console.error(error.message)
			setErrorMsg("Error: " + error.message)
		}
	}

	return (
		<div className="columns">
			<div className="column is-half is-offset-one-quarter">
				<div className="section">
					<h1 className="title">Login</h1>
					<ErrorMsg message={errorMsg} />
					<div>
						<PhoneField
							id="phone"
							label="Telephone number"
							maxLength={MAX_PHONE_LENGTH}
							disabled={loginStep > 0}
							onChange={(e) => setPhoneNum(e.target.value)}
						/>
						{/* Renders if we've sent phone number */}
						<TextField
							id="authCode"
							placeholder="12345"
							label="SMS Code"
							maxLength={MAX_CODE_LENGTH}
							disabled={loginStep > 1}
							hidden={loginStep === 0}
							onChange={(e) => setAuthCode(e.target.value)}
						/>
						<div className="field is-grouped">
							<div className="control">
								<Button
									title="Continue"
									className="is-primary"
									onClick={_handleLoginNext}
								/>
							</div>
							<div className="control">
								<Button
									title="Back"
									className="is-primary is-light"
									hidden={loginStep === 0}
									onClick={_handleLoginBack}
								/>
							</div>
						</div>
						{/* Renders if we've received or already have an authToken */}
						{loginStep === 2 || cookie.load("authToken") ? (
							<Redirect to="/stores" />
						) : null}
					</div>
				</div>
			</div>
		</div>
	)
}
