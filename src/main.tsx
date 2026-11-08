import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { setupScrollbars } from "./lib/scrollbars"
import "./styles/index.css"

setupScrollbars()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
