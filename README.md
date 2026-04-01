<div style="text-align: center;">
  <img width="891" src="https://github.com/user-attachments/assets/0323eb7e-67cd-4e24-8a58-a9a316ac3483" alt="MIDI Sight Reader" style="max-width: 100%; height: auto; box-shadow: 10px 10px 20px rgba(0,0,0,0.3);" />
</div>

# MIDI Sight Reader

A dynamic, interactive music sight-reading application that helps you practice piano by connecting your MIDI keyboard.

## Credit Belongs to the vexflo library

https://github.com/0xfe/vexflow/wiki

- Vexflo is responsible for the music and staff rendering.
- It renders music to screen extremely well.
- All I did was add some logic and tests to exploit this library.
    - In a single afternoon!

## Features at a Glance

- **Interactive MIDI Feedback**: Real-time highlighting of the current beat and visual feedback for correct/incorrect notes.
- **Dynamic Music Generation**: Randomly generates music based on your selected settings (staff type, key, range, rhythm).
- **Customizable Layout**: Adjust measures per line and total lines to fit your screen.
- **Full Piano Range Support**: Configure note ranges from A0 to C8 (88 keys).
- **Key Signature & Chromatic Support**: Practice in any major key or with random chromaticism.

For more information on how to use the application and its features, see the [User Guide](./USER_GUIDE.md).

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

To understand how to configure the application and explore its full feature set, check out the [USER_GUIDE.md](./USER_GUIDE.md).

---

[Home](./README.md)
