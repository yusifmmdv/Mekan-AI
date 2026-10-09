import { hydrateRoot } from "react-dom/client";
import { ReviewApp } from "./app";

hydrateRoot(document.getElementById("review-root")!, <ReviewApp />);
