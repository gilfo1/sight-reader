# MIDI Sight Reader

A dynamic, interactive music sight-reading application that helps you practice piano by connecting your MIDI keyboard.

## Features at a Glance

- **Interactive MIDI Feedback**: Real-time highlighting of the current beat and visual feedback for correct/incorrect notes.
- **Dynamic Music Generation**: Randomly generates music based on your selected settings (staff type, key, range, rhythm).
- **Customizable Layout**: Adjust measures per line and total lines to fit your screen.
- **Full Piano Range Support**: Configure note ranges from A0 to C8 (88 keys).
- **Key Signature & Chromatic Support**: Practice in any major key or with random chromaticism.

For a detailed list of features, see [FEATURES.md](./FEATURES.md).

## Getting Started

### Local Development

To run the project locally on your machine, ensure you have [Node.js](https://nodejs.org/) installed.

1.  **Clone the repository** (if you haven't already).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development server**:
    ```bash
    ./run.sh
    ```
    *Or use the npm script:*
    ```bash
    npm run dev
    ```
4.  **Open your browser** at the address provided by Vite (usually `http://localhost:5173`).

### Running on a Server (Production)

To deploy the application to a server, you need to build the optimized assets first.

1.  **Build the project**:
    ```bash
    ./build_prod.sh
    ```
    *Or use the npm script:*
    ```bash
    npm run build
    ```
2.  **Deploy**: The optimized files will be in the `dist/` directory. You can serve this directory using any static web server (e.g., Nginx, Apache, or a service like Vercel/Netlify).

3.  **Preview locally**: To test the production build locally:
    ```bash
    npm run preview
    ```

## Testing

The project includes a comprehensive test suite.

- **Run all tests with informative output**:
    ```bash
    ./test_all.sh
    ```
- **Run tests using Vitest**:
    ```bash
    npm run test
    ```

## User Guide

To understand how to configure the application, check out the [SETTINGS.md](./SETTINGS.md) guide.

---

[Home](./README.md)
