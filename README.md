# Qubit Lab — BB84 Simulator

A standalone, browser-based teaching project for the BB84 quantum key distribution protocol. It runs locally without a backend, framework, package install, or external API.

## Run locally

Open `index.html` in a modern browser, or serve the folder over HTTP:

```bash
cd outputs/bb84-simulation
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## What it demonstrates

- Random preparation in the Z (rectilinear) and X (diagonal) bases.
- Independent random measurements by Bob and basis sifting.
- An optional intercept-resend eavesdropper with adjustable attack probability.
- A bit-flip channel, random sample disclosure, and estimated QBER.
- An 11% abort threshold and an illustrative final-key estimate using Toeplitz hashing over GF(2).
- A visual sifted-key plot, protocol flow, state guide, and theory notes.

The simulator uses the browser's Web Crypto random number generator. No data is sent to a server.

## Model limits

This is an educational model, not a production QKD implementation. It treats the channel as independent bit flips and models Eve only with intercept-resend. Error correction is assumed after a passing QBER check. The key-length calculation is a simplified asymptotic estimate with a small fixed margin; it is not a composable finite-key security proof. Real deployments also require authenticated classical communication, carefully characterized hardware, finite-size bounds, and a complete error-correction and privacy-amplification security analysis.

## Project files

- `index.html` — page structure and theory content
- `styles.css` — responsive visual design
- `app.js` — simulation and interface behavior

