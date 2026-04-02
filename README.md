<div style="text-align: center;">
  <img width="1062" height="834" alt="image" src="https://github.com/user-attachments/assets/498a46d7-06d0-42dc-8c2f-45213c31c5f3" />
</div>

# MIDI Sight Reader

A dynamic, interactive music sight-reading application that helps you practice piano by connecting your MIDI keyboard.

## Features at a Glance

- **Interactive MIDI Feedback**: Real-time highlighting of the current beat and visual feedback for correct/incorrect notes.
- **Dynamic Music Generation**: Randomly generates music based on your selected settings (staff type, key, range, rhythm).
- **Customizable Layout**: Adjust measures per line and total lines to fit your screen.
- **Full Piano Range Support**: Configure note ranges from A0 to C8 (88 keys).
- **Key Signature & Chromatic Support**: Practice in any major key or with random chromaticism.

<BR></BR>

## Downloads: Desktop Apps (Electron):
- **Intel Mac**: [Download v1.0.0](https://github.com/gilfo1/sight-reader/releases/download/v1.0.0/Sight.Reader-1.0.0.dmg)
- **Apple Silicon (M1/M2/M3) Mac**: [Download v1.0.0](https://github.com/gilfo1/sight-reader/releases/download/mac-arm-v1.0.0/Sight.Reader-1.0.0-arm64.dmg)

For more information on how to use the application and its features, see the [User Guide](./USER_GUIDE.md).

---

<BR></BR>

## For Developers: Getting Started

### Credit Belongs to the vexflo library

https://github.com/0xfe/vexflow/wiki

- Vexflo is responsible for the music and staff rendering.
- It renders music to screen extremely well.
- All I did was add some logic and tests to exploit this library.
    - In a single afternoon!

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

### Desktop Application

The project can be run as a cross-platform desktop application using Electron.

- **Run in Desktop Mode**:
    ```bash
    npm run dev
    ```
    (This starts the Vite server and opens the Electron window automatically)

- **Build Desktop Executables**:
    ```bash
    npm run build
    ```
    The packaged application will be available in the `release/` directory for your current platform.

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

To understand how to configure the application and explore its full feature set, check out the [USER_GUIDE.md](./USER_GUIDE.md).

---

[Home](./README.md)
