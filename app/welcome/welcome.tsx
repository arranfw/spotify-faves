import { SpotifyLogin } from "~/components/SpotifyLogin";

export function Welcome() {
	return (
		<main className="flex items-center justify-center pt-16 pb-4">
			<div className="flex-1 flex flex-col items-center gap-16 min-h-0">
				<header className="flex flex-col items-center gap-9">
					<div className="w-[500px] max-w-[100vw] p-4" />
				</header>
				<div className="max-w-[300px] w-full space-y-6 px-4">
					<SpotifyLogin />
				</div>
			</div>
		</main>
	);
}
