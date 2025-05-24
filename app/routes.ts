import {
	type RouteConfig,
	index,
	prefix,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("callback", "routes/callback.tsx"),
	...prefix("spotify-faves", [
		index("routes/home.tsx"),
		route("callback", "routes/callback.tsx"),
	]),
] satisfies RouteConfig;
