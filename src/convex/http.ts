import { httpRouter } from "convex/server";
import { auth } from "./auth";
import {
  generateDraft,
  generateDraftPreflight,
} from "./generateDraft";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/api/generate-draft",
  method: "OPTIONS",
  handler: generateDraftPreflight,
});

http.route({
  path: "/api/generate-draft",
  method: "POST",
  handler: generateDraft,
});

export default http;
