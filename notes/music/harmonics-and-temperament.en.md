# Harmonics & temperament — intervals for physicists

> Why do C and G sound so good together? A note that recasts musical “consonance” in the language of frequencies and waves.
> (Try it with your ears in the **Sound lab** at the bottom of the page.)

## 1. Pitch = frequency

- Pitch is set by the **frequency** of the air's vibration. Reference: **A4 = 440 Hz**.
- **One octave up = twice the frequency.** We hear intervals as frequency *ratios*, not differences (logarithmically).
- The fine unit of interval is the **cent**: a semitone is 100 cents, an octave 1200. A ratio *r* spans `1200 × log₂ r` cents.

## 2. The harmonic series

A string fixed at both ends vibrates in standing waves with λₙ = 2L/n.
So one string sounds **f, 2f, 3f, 4f, 5f, …** all at once — the harmonic series.

| Harmonic | Frequency | Interval above the fundamental |
|---|---|---|
| 1 | f | fundamental (C) |
| 2 | 2f | octave |
| 3 | 3f | octave + perfect fifth (G) |
| 4 | 4f | two octaves |
| 5 | 5f | two octaves + major third (E) |
| 6 | 6f | two octaves + perfect fifth |

The major triad C–E–G *is* harmonics 4 : 5 : 6.

## 3. What consonance really is: beats

Two tones with slightly different frequencies produce **beats** — the loudness wobbles at |f₁ − f₂|
(sum-to-product: sin a + sin b = 2 sin((a+b)/2) cos((a−b)/2)).

When two notes are in a **simple integer ratio**, their harmonics line up and there are almost no beats → a clear, consonant sound.
Complicated ratios leave nearby-but-mismatched harmonics beating against each other → a rough sound.

## 4. Just intonation vs equal temperament

| Interval | Just ratio | Equal-tempered ratio | ET deviation |
|---|---|---|---|
| Octave | 2/1 | 2 | 0 cents |
| Perfect fifth | 3/2 = 1.5000 | 2^(7/12) ≈ 1.4983 | −2.0 cents |
| Perfect fourth | 4/3 ≈ 1.3333 | 2^(5/12) ≈ 1.3348 | +2.0 cents |
| Major third | 5/4 = 1.2500 | 2^(4/12) ≈ 1.2599 | **+13.7 cents** |
| Minor third | 6/5 = 1.2000 | 2^(3/12) ≈ 1.1892 | **−15.6 cents** |
| Major sixth | 5/3 ≈ 1.6667 | 2^(9/12) ≈ 1.6818 | **+15.6 cents** |

- **Just intonation** uses simple ratios: beautifully pure, but it falls apart when you change key.
- **Equal temperament** splits the octave into 12 equal semitones (2^(1/12) ≈ 1.0595): every key sounds the same, at the cost of slightly rough thirds and sixths.
- Stack 12 perfect fifths and you get (3/2)¹² ≈ 129.75 — not quite 7 octaves (2⁷ = 128). That ~23.5-cent gap is the **Pythagorean comma**; equal temperament spreads it evenly over the 12 fifths.

### Worked example

Play a C4 major triad (C4 = 261.63 Hz) in equal temperament: E4 = 329.63 Hz.
The 5th harmonic of C4 (1308.1 Hz) and the 4th harmonic of E4 (1318.5 Hz) miss each other, giving **about 10 beats per second**.
In just intonation E4 = 327.03 Hz and both harmonics sit exactly on 1308.1 Hz.

## 5. Links to physics

- **Timbre** = how strong each harmonic is (the spectrum). That's why an A on piano and on flute sound different — Fourier analysis in action.
- The **waveform analysis** I do on detector signals (FFT, filters, timing extraction) uses exactly the same tools. Your ear is a pretty good spectrum analyser.

## 6. To study next

- [ ] Diatonic chords and functional harmony (T / D / SD)
- [ ] Meantone and well temperaments
- [ ] How many cents is a karaoke “key change”? (±1 = one semitone = 100 cents)
