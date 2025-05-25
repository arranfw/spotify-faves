import {
	type RouteConfig,
	index,
	prefix,
	route,
} from "@react-router/dev/routes";

export default [
	...prefix("spotify-faves", [
		index("routes/home.tsx"),
		route("callback", "routes/callback.tsx"),
		route("pretend", "routes/pretend.tsx"),
	]),
] satisfies RouteConfig;
