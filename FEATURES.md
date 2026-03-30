# Features of MIDI Sight Reader

The MIDI Sight Reader is built to help piano players improve their sight-reading through real-time feedback and dynamic music generation.

## Core Features

### 🎹 MIDI Connectivity
The application uses the **WebMIDI** library to detect any USB MIDI device connected to your computer.
- **Connection Indicator**: A green dot shows when a device is ready, turning red if no device is connected.
- **Real-time Input**: As you press keys on your MIDI keyboard, the notes are displayed on the screen.

### 🎼 Interactive Sight-Reading
Instead of just reading static music, the app tracks your progress in real-time.
- **Beat Highlighting**: A transparent light blue highlight shows you which beat you should be playing right now.
- **Exact Note Matching**: The highlight only moves to the next beat once you have played all the correct notes for the current beat.
- **Visual Feedback for Wrong Notes**: If you press an incorrect key, it is displayed as a semi-transparent "wrong note" on the staff, helping you see where your fingers are relative to the music.

### 🎲 Dynamic Music Generation
You'll never run out of practice material. Every time you finish a piece, a new one is automatically generated.
- **Random Note Selection**: Generates unique melodies and chords based on your selected range and scale.
- **Rhythmic Variety**: Mixes different note values (whole to 16th notes) to create interesting rhythmic patterns.
- **Key Signature Support**: Can generate music in any of the 15 major key signatures.
- **Chromatic Mode**: When enabled, the generator includes non-diatonic sharps and flats for extra challenge.

### 📏 High-Quality Musical Notation
Uses the professional-grade **VexFlow** library to render beautiful musical scores.
- **Grand Staff Support**: Displays music for both hands (treble and bass clef) with standard bracing and connectors.
- **Automatic Beaming**: Group 8th and 16th notes with beams for better readability.
- **Smart Accidental Handling**: Follows standard musical rules (measure duration, octave rule, and staff independence).
- **Measure Widening**: Automatically widens measures with many accidentals to prevent crowding, ensuring a clean and consistent layout across all lines.

---

[Home](./README.md) | [Settings](./SETTINGS.md)
