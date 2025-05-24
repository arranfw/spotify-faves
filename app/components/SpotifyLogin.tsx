import { useEffect, useState } from "react";

const generateRandomString = (length: number) => {
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const values = crypto.getRandomValues(new Uint8Array(length));
	return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};
const sha256 = async (plain: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest("SHA-256", data);
};

const base64encode = (input: ArrayBuffer) => {
	return btoa(String.fromCharCode(...new Uint8Array(input)))
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
};

const codeVerifier = generateRandomString(64);
const getCodeChallenge = async () => base64encode(await sha256(codeVerifier));

export const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
export const REDIRECT_URI =
	import.meta.env.VITE_REDIRECT_URI || "http://127.0.0.1:5173/callback";
export const SCOPES = [
	"user-read-private",
	"user-read-email",
	"user-library-read",
	"user-top-read",
	"playlist-read-private",
	"playlist-read-collaborative",
	"user-library-read",
];

export function SpotifyLogin() {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleLogin = async () => {
		console.log(import.meta.env);

		if (!SPOTIFY_CLIENT_ID) {
			setError("Spotify Client ID is not configured");
			return;
		}

		const authUrl = new URL("https://accounts.spotify.com/authorize");

		window.localStorage.setItem("code_verifier", codeVerifier);

		const params = {
			response_type: "code",
			client_id: SPOTIFY_CLIENT_ID,
			scope: SCOPES.join(" "),
			code_challenge_method: "S256",
			code_challenge: await getCodeChallenge(),
			redirect_uri: REDIRECT_URI,
		};

		authUrl.search = new URLSearchParams(params).toString();
		window.location.href = authUrl.toString();
	};

	return (
		<div className="flex flex-col items-center gap-2">
			<button
				type="button"
				onClick={handleLogin}
				disabled={isLoading}
				className="flex items-center gap-2 bg-[#1DB954] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#1ed760] transition-colors disabled:opacity-50"
			>
				{isLoading ? (
					<span>Loading...</span>
				) : (
					<>
						<svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
							<title>Spotify</title>
							<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
						</svg>
						<span>Log in with Spotify</span>
					</>
				)}
			</button>
			{error && <p className="text-red-500 text-sm">{error}</p>}
		</div>
	);
}
