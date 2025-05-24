import { useEffect, useState } from "react";

interface Track {
	added_at: string;
	track: {
		name: string;
		artists: Array<{
			name: string;
		}>;
		album: {
			name: string;
			images: Array<{
				url: string;
			}>;
		};
	};
}

export function SavedTracks() {
	const [tracks, setTracks] = useState<Track[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchTracks = async () => {
			const accessToken = localStorage.getItem("access_token");
			if (!accessToken) {
				setError("No access token found. Please log in first.");
				setLoading(false);
				return;
			}

			try {
				const response = await fetch(
					"https://api.spotify.com/v1/me/tracks?limit=25",
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
						},
					},
				);

				if (!response.ok) {
					throw new Error("Failed to fetch tracks");
				}

				const data = await response.json();
				setTracks(data.items);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to fetch tracks");
			} finally {
				setLoading(false);
			}
		};

		fetchTracks();
	}, []);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen">
				<p className="text-red-500 text-lg">{error}</p>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold mb-6">Your Saved Tracks</h1>
			<div className="grid gap-4">
				{tracks.map((item, index) => (
					<div
						key={`${item.track.name}-${index}`}
						className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
					>
						{item.track.album.images[0] && (
							<img
								src={item.track.album.images[0].url}
								alt={`${item.track.name} album cover`}
								className="w-16 h-16 rounded"
							/>
						)}
						<div className="flex-1">
							<h2 className="text-lg font-semibold">{item.track.name}</h2>
							<p className="text-gray-600 dark:text-gray-300">
								{item.track.artists.map((artist) => artist.name).join(", ")}
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{item.track.album.name}
							</p>
						</div>
						<div className="text-sm text-gray-500 dark:text-gray-400">
							{new Date(item.added_at).toLocaleDateString()}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
