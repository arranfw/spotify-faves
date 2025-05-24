import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { REDIRECT_URI, SPOTIFY_CLIENT_ID } from "~/components/SpotifyLogin";

interface TokenResponse {
	body: {
		access_token: string;
		refresh_token: string;
		expires_in: number;
	};
}

export default function Callback() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchToken = async () => {
			const code = searchParams.get("code");
			if (!code) {
				setError("No authorization code received");
				return;
			}
			const codeVerifier = localStorage.getItem("code_verifier");
			const url = "https://accounts.spotify.com/api/token";
			const payload = {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},

				body: new URLSearchParams({
					client_id: SPOTIFY_CLIENT_ID,
					grant_type: "authorization_code",
					code,
					redirect_uri: REDIRECT_URI,
					code_verifier: codeVerifier || "",
				}),
			};

			const body = await fetch(url, payload);
			const response = await body.json();

			if (response.access_token) {
				localStorage.setItem("access_token", response.access_token);
			}
			navigate("/");
		};
		fetchToken();
	}, [searchParams, navigate]);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen">
				<p className="text-red-500 text-lg">{error}</p>
				<button
					type="button"
					onClick={() => navigate("/")}
					className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Return to Home
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
		</div>
	);
}
