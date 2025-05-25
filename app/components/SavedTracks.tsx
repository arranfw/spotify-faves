import { useEffect, useState } from "react";
import { Picker, type PickerStateData } from "~/utils/picker";

const TrackItem: React.FC<{ item: Track; selected?: boolean }> = ({
	item,
	selected,
}) => {
	return (
		<div
			className={`
        w-100 h-30
        flex items-center gap-4 p-4 bg-white dark:bg-gray-800
        rounded-lg shadow hover:shadow-md transition-shadow
        ${selected ? "outline" : ""}
      `}
		>
			{item.track.album.images[0] && (
				<img
					src={item.track.album.images[0].url}
					alt={`${item.track.name} album cover`}
					className="w-16 h-16 rounded"
				/>
			)}
			<div className="flex-1 truncate">
				<h2 className="text-lg font-semibold truncate">{item.track.name}</h2>
				<p className="text-gray-600 dark:text-gray-300 truncate">
					{item.track.artists.map((artist) => artist.name).join(", ")}
				</p>
				<p className="text-sm text-gray-500 dark:text-gray-400 truncate">
					{item.track.album.name}
				</p>
			</div>
			{/* <div className="text-sm text-gray-500 dark:text-gray-400">
				{new Date(item.added_at).toLocaleDateString()}
			</div> */}
		</div>
	);
};

interface Track {
	added_at: string;
	track: {
		id: string;
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

const SONG_COUNT = 50;

export function SavedTracks() {
	const [tracks, setTracks] = useState<Track[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [picker, setPicker] = useState<PickerStateData>();
	const [selected, setSelected] = useState<string[]>([]);

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
					`https://api.spotify.com/v1/me/tracks?limit=${SONG_COUNT}`,
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
				setPicker(
					new Picker({
						items: data.items.map((song) => ({
							id: song.track.id,
							name: song.track.name,
							image: song.track.album.images[0].url,
						})),
						localStorageKey: "spotify-faves-state",
					}),
				);
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

	const pick = () => {
		picker.pick(selected);
		setSelected([]);
	};
	const foundFavorites = picker?.state.arrays.favorites;
	const eliminated = picker?.state.arrays.eliminated;

	const remaining = Math.max(
		0,
		SONG_COUNT - foundFavorites.length - eliminated.length - 1,
	);

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold mb-6">Your Saved Tracks</h1>
			<div className="grid gap-4">
				Remaining: {remaining}
				{foundFavorites.length > 0 && <h2>Found favourites</h2>}
				{tracks
					.filter((item) => foundFavorites.includes(item.track.id))
					.map((item, index) => (
						<div
							key={`${item.track.name}-${index}`}
							className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
						>
							<TrackItem item={item} />
						</div>
					))}
				<div className="flex gap-2 items-center justify-center">
					<button
						className="text-xl py-4 px-10 border rounded disabled:bg-gray-600"
						onClick={pick}
					>
						Pick
					</button>
					{/* <button className="text-xl py-4 px-10 border rounded disabled:bg-gray-600">
						Pass
					</button>
					<button className="text-xl py-4 px-10 border rounded disabled:bg-gray-600">
						Undo
					</button>
					<button className="text-xl py-4 px-10 border rounded disabled:bg-gray-600">
						Redo
					</button> */}
				</div>
				<div className="flex flex-wrap gap-2">
					{tracks
						.filter((item) =>
							picker?.state.arrays.evaluating.includes(item.track.id),
						)
						.map((item, index) => (
							<label key={`${item.track.name}-${index}`}>
								<input
									className="sr-only"
									type="checkbox"
									name="track-id"
									value={item.track.id}
									checked={selected.includes(item.track.id)}
									onChange={(e) => {
										const selectedId = e.target.value;
										setSelected((prev) =>
											prev.includes(selectedId)
												? prev.filter((id) => id !== selectedId)
												: [...prev, selectedId],
										);
									}}
								/>
								<TrackItem
									item={item}
									selected={selected.includes(item.track.id)}
								/>
							</label>
						))}
				</div>
			</div>
		</div>
	);
}
