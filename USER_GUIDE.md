# MIDI Sight Reader - User Guide

Welcome to the MIDI Sight Reader! This guide will help you understand the features of the application and how to configure it for the best practice experience.

---

<a id="table-of-contents" name="table-of-contents"></a>
## 📋 Table of Contents
- [MIDI & Connectivity](#midi-connectivity)
- [Interactive Sight-Reading](#interactive-sight-reading)
- [Dynamic Music Generation](#dynamic-music-generation)
- [Stats & Progress Tracking](#stats-progress-tracking)
- [Adaptive Learning](#adaptive-learning)

---

<a id="midi-connectivity" name="midi-connectivity"></a>
## 🎸 MIDI & Connectivity

The application uses the **WebMIDI** API to detect any USB MIDI device connected to your computer.

- **Real-time Input**: As you press keys on your MIDI keyboard, the notes are displayed on the screen instantly.
- **Connection Indicator**: A green dot in the settings panel shows when a device is ready, turning red if no device is detected.

<div style="text-align: center;">
  <img width="350" alt="MIDI Status" src="https://github.com/user-attachments/assets/ff062096-bb71-4244-87b1-f78093f0a8c0" style="max-width: 100%; height: auto; box-shadow: 10px 10px 20px rgba(0,0,0,0.3);" />
</div>

### MIDI Settings
- **MIDI Status**: Shows the name of your connected device.
- **Show MIDI Notes**: Expand this to see a text display of the notes you are currently pressing.

[⬆️ Back to Top](#table-of-contents)

---

<a id="interactive-sight-reading" name="interactive-sight-reading"></a>
## 🎼 Interactive Sight-Reading

Instead of reading static sheet music, the app tracks your progress in real-time.

- **Beat Highlighting**: A transparent light blue highlight shows you exactly which beat you should be playing.
- **Exact Note Matching**: The highlight only advances once you have played all the correct notes for the current beat.
- **Visual Feedback**: If you hit a wrong key, it appears as a semi-transparent note on the staff, helping you see your error relative to the target note.

<div style="text-align: center;">
  <img width="700" alt="Interactive Staff" src="https://github.com/user-attachments/assets/28140776-879e-40b3-9e73-a05f583b412d" style="max-width: 100%; height: auto; box-shadow: 10px 10px 20px rgba(0,0,0,0.3);" />
</div>

### Layout Settings
- **Measures per Line**: Choose how many measures to display on a single line (1 to 8).
- **Lines**: Set the total number of lines to display at once (1 to 10).
- **Staff Type**: 
    - **Grand Staff**: Standard for piano (Treble and Bass).
    - **Treble Clef**: Single staff for right-hand practice.
    - **Bass Clef**: Single staff for left-hand practice.

[⬆️ Back to Top](#table-of-contents)

---

<a id="dynamic-music-generation" name="dynamic-music-generation"></a>
## 🎹 Dynamic Music Generation

You'll never run out of practice material. Every time you finish a piece, a new one is automatically generated.

- **Randomized Melodies & Chords**: Based on your selected range and scale.
- **Rhythmic Variety**: Mixes different note values (Whole to 16th notes).
- **Key Signature Support**: Practice in any of the 15 major key signatures.
- **Chromatic Mode**: Adds non-diatonic sharps and flats for extra challenge.

<div style="text-align: center;">
  <img width="750" alt="Music Generation" src="https://github.com/user-attachments/assets/1a35978b-8485-46d2-959e-227e998c36c5" style="max-width: 100%; height: auto; box-shadow: 10px 10px 20px rgba(0,0,0,0.3);" />
</div>

### Generation Controls
- **Notes per Beat**: Controls how many notes are stacked (1 = melody, 2+ = chords).
- **Min/Max Note**: Defines the pitch range. Options adjust dynamically based on your Staff Type.
- **Max Hand Reach**: Sets the maximum interval distance relative to an Octave (e.g., -1 for 11 half steps, +1 for 13 half steps) between the lowest and highest note in a chord or interval, ensuring the music is playable for your hand size. Options range from -7 (5 half steps) to +7 (19 half steps) around the Octave (12 half steps).
- **Note Values**: Check the durations you want to practice (Whole to 16th).
- **Key Signatures**: Select one or more major keys. The app will rotate through your selections.
- **Chromatic Mode**: Toggle this for music rich in accidentals and chromaticism.

[⬆️ Back to Top](#table-of-contents)

---

<a id="stats-progress-tracking" name="stats-progress-tracking"></a>
## 📊 Stats & Progress Tracking

Track your performance with the built-in stats accordion.

- **Real-time Accuracy**: See your total notes played, correct count, and percentage.
- **Streak Counter**: Keeps track of how many notes you've hit in a row, along with your all-time high score.
- **Unobtrusive Design**: The stats panel is greyed out and collapsible to keep your focus on the music.
- **Reset Stats**: Found in the Stats panel, this button clears all session data, including accuracy, streaks, and all Adaptive Learning weights.

<div style="text-align: center;">
  <img width="300" alt="Stats" src="https://github.com/user-attachments/assets/c18b5a0f-e69e-43dd-965c-0b84bb8dbdfd" style="max-width: 100%; height: auto; box-shadow: 10px 10px 20px rgba(0,0,0,0.3);" />
</div>

[⬆️ Back to Top](#table-of-contents)

---

<a id="adaptive-learning" name="adaptive-learning"></a>
## 🧠 Adaptive Learning

The "Adaptive Learning" system is an intelligent practice assistant that analyzes your performance to help you improve faster by identifying and focusing on your weak spots.

<div style="text-align: center;">
  <img width="800" alt="Adaptive Learning" src="https://github.com/user-attachments/assets/8e7eae6f-37bc-4ed5-b1c6-13cf57aec6df" style="max-width: 100%; height: auto; box-shadow: 10px 10px 20px rgba(0,0,0,0.3);" />
</div>

### How It Works
The system works by assigning "trouble weights" to every note, octave, and key signature.

1.  **Error Detection**: When you play a wrong note, the system increments the weight for that specific pitch, its octave, and the current key signature.
2.  **Weighted Randomization**: During music generation, these weights are used to influence the probability. A note with a high trouble weight is significantly more likely to appear than a "mastered" note.
3.  **The Decay Mechanism**: Every time you play a note **correctly**, its trouble weight is slightly reduced. This means that as you improve, the music naturally balances back out to a standard distribution.

### Configuration & Controls
- **Adaptive Learning Toggle**: Found in the Generation section of the settings, this enables or disables the intelligent error-correction system.
- **Resetting Stats**: You can clear all adaptive data by clicking **"Reset Stats"** in the Stats panel. This will reset all trouble weights and start the learning process over.

[⬆️ Back to Top](#table-of-contents)

---

[⬅️ Back to Home](./README.md)
