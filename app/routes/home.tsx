import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { SavedTracks } from "../components/SavedTracks";

export function meta() {
	return [
		{ title: "Spotify Favorites" },
		{ name: "description", content: "View your Spotify saved tracks" },
	];
}

export default function Home() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<Welcome />
			<SavedTracks />
		</div>
	);
}
