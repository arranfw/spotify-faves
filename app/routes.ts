import {
	type RouteConfig,
	index,
	prefix,
	route,
} from "@react-router/dev/routes";

export default [
	route("spotify-favs", "routes/home.tsx", [
		route("callback", "routes/callback.tsx"),
	]),
] satisfies RouteConfig;
